import * as React from 'react'

import styles from './SpanishToggle.module.css'

const STORAGE_KEY = 'techempower-show-spanish'

/**
 * Language toggle that shows/hides a Spanish translation callout on guide pages.
 *
 * Persists the user's preference in localStorage. Renders a purple-background
 * callout with a Mexico flag emoji when expanded.
 */
export function SpanishToggle() {
  const [showSpanish, setShowSpanish] = React.useState(false)
  const [hasMounted, setHasMounted] = React.useState(false)

  // Read saved preference from localStorage after mount
  React.useEffect(() => {
    setHasMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') {
        setShowSpanish(true)
      }
    } catch {
      // localStorage may be unavailable; ignore
    }
  }, [])

  const handleToggle = React.useCallback(() => {
    setShowSpanish((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // localStorage may be unavailable; ignore
      }
      return next
    })
  }, [])

  // Avoid hydration mismatch — render nothing on the server
  if (!hasMounted) {
    return null
  }

  return (
    <div className={styles.wrapper}>
      <button
        type='button'
        className={styles.toggle}
        onClick={handleToggle}
        aria-expanded={showSpanish}
        aria-controls='spanish-callout'
      >
        <span className={styles.toggleIcon} aria-hidden='true'>
          {showSpanish ? '\u25BC' : '\u25B6'}
        </span>
        <span className={styles.toggleLabel}>
          {showSpanish ? 'Ocultar espa\u00F1ol' : 'Ver en espa\u00F1ol'}
        </span>
      </button>

      {showSpanish && (
        <aside
          id='spanish-callout'
          className={styles.callout}
          role='region'
          aria-label='Traducci\u00F3n al espa\u00F1ol'
          lang='es'
        >
          <span className={styles.calloutIcon} aria-hidden='true'>
            {'\uD83C\uDDF2\uD83C\uDDFD'}
          </span>
          <div className={styles.calloutBody}>
            <p className={styles.calloutText}>
              Esta gu\u00EDa est\u00E1 disponible en espa\u00F1ol. La
              traducci\u00F3n aparecer\u00E1 junto al contenido en
              ingl\u00E9s.
            </p>
          </div>
        </aside>
      )}
    </div>
  )
}
