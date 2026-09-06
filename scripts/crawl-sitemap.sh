#!/usr/bin/env bash
# scripts/crawl-sitemap.sh — crawl every <loc> in the live sitemap, re-hit the
# non-200s once with a cache-busting query, print a summary.
#
# Why (issue #126, A1): an ISR entry that went stale is only re-rendered when
# somebody requests it, and the requester still gets the stale body. Long-tail
# pages have no visitors, so a Notion blip that was cached as a 404 sat there
# until this exact crawl hit it (48 of 53 poisoned URLs healed that way on
# 2026-09-05). Used by:
#   .github/workflows/deploy.yml          — warm the cache after every deploy
#   .github/workflows/sitemap-health.yml  — weekly check, opens an issue
#
# Usage:
#   scripts/crawl-sitemap.sh [--base https://techempower.org] [--sleep 0.3]
#                            [--bust TOKEN] [--out FAILURES_FILE] [--strict]
#                            [--settle SECONDS] [--timeout SECONDS]
#
#   --base     site root (default https://techempower.org)
#   --sleep    pause between requests, seconds (default 0.3 — no 429 storm)
#   --bust     token for the retry's ?warm=<token> query (default: epoch)
#   --out      write "CODE URL" lines for every URL still non-200 after retry
#   --settle   seconds to wait before the retry pass so background
#              revalidations triggered by pass 1 can finish (default 5)
#   --timeout  per-request curl --max-time (default 45)
#   --strict   exit 1 when any URL is still non-200 (default: always exit 0)
#
# Plain bash + curl, no other dependencies.
set -uo pipefail

BASE="https://techempower.org"
SLEEP="0.3"
BUST="$(date +%s)"
OUT=""
SETTLE=5
TIMEOUT=45
STRICT=0

while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --sleep) SLEEP="$2"; shift 2 ;;
    --bust) BUST="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --settle) SETTLE="$2"; shift 2 ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --strict) STRICT=1; shift ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

BASE="${BASE%/}"
UA="techempower-sitemap-crawl/1.0 (+https://techempower.org)"

fetch_code() {
  # Prints the HTTP status, or 000 when curl itself failed (timeout, DNS…).
  local url="$1" code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" \
    -A "$UA" -H 'Accept: text/html' "$url" 2>/dev/null) || code="000"
  [ -n "$code" ] || code="000"
  echo "$code"
}

[ -n "$OUT" ] && : > "$OUT"

sitemap_url="$BASE/sitemap.xml"
sitemap=$(curl -sS --max-time "$TIMEOUT" -A "$UA" "$sitemap_url" 2>/dev/null) || sitemap=""
mapfile -t urls < <(printf '%s\n' "$sitemap" | grep -oE '<loc>[^<]+</loc>' | sed -E 's#</?loc>##g')

if [ "${#urls[@]}" -eq 0 ]; then
  echo "crawl: could not read any <loc> from $sitemap_url" >&2
  [ -n "$OUT" ] && echo "000 $sitemap_url" >> "$OUT"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    echo "### Sitemap crawl — FAILED to read $sitemap_url" >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 1
fi

total="${#urls[@]}"
echo "crawl: $total URLs from $sitemap_url (sleep ${SLEEP}s, timeout ${TIMEOUT}s)"

declare -a bad_urls=()
declare -a bad_codes=()
ok=0
for url in "${urls[@]}"; do
  code=$(fetch_code "$url")
  if [ "$code" = "200" ]; then
    ok=$((ok + 1))
  else
    echo "  pass1 $code $url"
    bad_urls+=("$url")
    bad_codes+=("$code")
  fi
  sleep "$SLEEP"
done
echo "crawl: pass 1 — $ok/$total OK, ${#bad_urls[@]} non-200"

healed=0
declare -a still_urls=()
declare -a still_codes=()
if [ "${#bad_urls[@]}" -gt 0 ]; then
  # Pass 1 already kicked off a background revalidation for every stale
  # entry it touched; give those a moment before we look again.
  sleep "$SETTLE"
  for i in "${!bad_urls[@]}"; do
    url="${bad_urls[$i]}"
    case "$url" in
      *\?*) retry_url="$url&warm=$BUST" ;;
      *) retry_url="$url?warm=$BUST" ;;
    esac
    code=$(fetch_code "$retry_url")
    if [ "$code" = "200" ]; then
      healed=$((healed + 1))
      echo "  retry 200 $url (was ${bad_codes[$i]}) — healed"
    else
      echo "  retry $code $url (was ${bad_codes[$i]}) — STILL FAILING"
      still_urls+=("$url")
      still_codes+=("$code")
      [ -n "$OUT" ] && echo "$code $url" >> "$OUT"
    fi
    sleep "$SLEEP"
  done
fi

still="${#still_urls[@]}"
echo "crawl: summary — total=$total ok_first_pass=$ok non200_first_pass=${#bad_urls[@]} healed_on_retry=$healed still_failing=$still"
for i in "${!still_urls[@]}"; do
  echo "  ${still_codes[$i]} ${still_urls[$i]}"
done

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Sitemap crawl — $BASE"
    echo
    echo "| total | ok (pass 1) | non-200 (pass 1) | healed on retry | still failing |"
    echo "| --- | --- | --- | --- | --- |"
    echo "| $total | $ok | ${#bad_urls[@]} | $healed | $still |"
    if [ "$still" -gt 0 ]; then
      echo
      echo "Still failing after a cache-busted retry:"
      echo
      for i in "${!still_urls[@]}"; do
        echo "- \`${still_codes[$i]}\` ${still_urls[$i]}"
      done
    fi
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [ "$STRICT" -eq 1 ] && [ "$still" -gt 0 ]; then
  exit 1
fi
exit 0
