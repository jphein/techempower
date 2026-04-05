import type { NextApiRequest, NextApiResponse } from 'next';
import { execFileSync } from 'child_process';
import os from 'os';

const startTime = Date.now();
const startISO = new Date().toISOString();

// Realm-sigil word lists (forge realm)
const adjectives = [
  "Annealed", "Bolted", "Carbonized", "Dense", "Electric",
  "Flux", "Galvanized", "Hardened", "Ignited", "Joined",
  "Keen", "Laminated", "Molten", "Nitrided", "Oxidized",
  "Pressed", "Quenched", "Riveted", "Sintered", "Tempered"
];
const nouns = [
  "Anvil", "Bellows", "Crucible", "Die", "Engine",
  "Furnace", "Gear", "Hammer", "Ingot", "Jig",
  "Kiln", "Lathe", "Mandrel", "Nozzle", "Oven",
  "Piston", "Quench", "Rivet", "Spark", "Tongs"
];

function generateName(hash: string): string {
  const seed = parseInt(hash, 16) || 0;
  const adj = adjectives[seed % adjectives.length];
  const noun = nouns[(seed >> 8) % nouns.length];
  return `${adj} ${noun} · ${hash}`;
}

function gitInfo() {
  const info = { hash: 'dev', branch: 'unknown', dirty: false };
  try {
    info.hash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() || 'dev';
    info.branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim() || 'unknown';
    try { execFileSync('git', ['diff', '--quiet']); } catch { info.dirty = true; }
  } catch {}
  return info;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const git = gitInfo();
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    name: 'techempower',
    description: 'Tech empower platform',
    version: generateName(git.hash),
    hash: git.hash,
    branch: git.branch,
    dirty: git.dirty,
    built: startISO,
    started: startISO,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    realm: 'forge',
    runtime: `node${process.version}`,
    os: `${process.platform}/${process.arch}`,
    host: os.hostname(),
    pid: process.pid,
    repo: 'https://github.com/jphein/techempower',
    commit_url: git.hash !== 'dev' ? `https://github.com/jphein/techempower/commit/${git.hash}` : '',
  });
}
