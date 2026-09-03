import { useEffect } from 'react'
import { ACCENTS, type AccentKey } from '../config/types'

/** Writes the chosen accent pair onto `--ac` / `--ac2` at the document root. */
export function useAccent(accent: AccentKey): void {
  useEffect(() => {
    const [filled, deep] = ACCENTS[accent] ?? ACCENTS.blue
    const root = document.documentElement
    root.style.setProperty('--ac', filled)
    root.style.setProperty('--ac2', deep)
  }, [accent])
}
