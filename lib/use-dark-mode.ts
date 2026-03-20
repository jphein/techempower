import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'darkMode'
const CLASS_DARK = 'dark-mode'
const CLASS_LIGHT = 'light-mode'

function getIsDark(): boolean {
  if (typeof document === 'undefined') return false
  return document.body.classList.contains(CLASS_DARK)
}

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Sync state with body class on mount (set by noflash script)
  useEffect(() => {
    setIsDarkMode(getIsDark())
  }, [])

  // Listen for system preference changes when no manual override
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY) !== null) return
      } catch {}
      applyDarkMode(e.matches)
      setIsDarkMode(e.matches)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const toggleDarkMode = useCallback(() => {
    const next = !getIsDark()
    applyDarkMode(next)
    setIsDarkMode(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }, [])

  return { isDarkMode, toggleDarkMode }
}

function applyDarkMode(dark: boolean) {
  document.body.classList.add(dark ? CLASS_DARK : CLASS_LIGHT)
  document.body.classList.remove(dark ? CLASS_LIGHT : CLASS_DARK)
}
