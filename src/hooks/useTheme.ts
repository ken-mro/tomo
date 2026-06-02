import { useCallback, useEffect, useState } from 'react'
import { loadTheme, saveTheme, type ThemeChoice } from '../lib/storage'

function initialTheme(): ThemeChoice {
  const stored = loadTheme()
  if (stored) return stored
  // Default to the OS preference on first load.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(initialTheme)

  // Reflect the choice on <html> so CSS custom properties switch everywhere.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#2E2A39' : '#F0564B')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: ThemeChoice = t === 'dark' ? 'light' : 'dark'
      saveTheme(next)
      return next
    })
  }, [])

  const set = useCallback((next: ThemeChoice) => {
    saveTheme(next)
    setTheme(next)
  }, [])

  return { theme, toggle, set }
}
