import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Modal keyboard contract: focus moves in on open, Tab cycles inside, Escape
 * closes, and focus returns to whatever opened it.
 *
 * `fallback` catches the case where the opener is gone by the time the modal
 * closes — the admin panel closes as it hands off to a modal, taking its own
 * buttons with it, and without a fallback the keyboard would be left on
 * `<body>` with nowhere to tab from.
 */
export function useFocusTrap<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
  fallback?: () => HTMLElement | null
) {
  const ref = useRef<T | null>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreTo.current = document.activeElement as HTMLElement | null

    const node = ref.current
    // Deliberately not a layout check: `offsetParent` / `getClientRects` are
    // meaningless in a test renderer, and these modals never hold a
    // laid-out-but-invisible control. `hidden` and `aria-hidden` are enough.
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        el => !el.hasAttribute('hidden') && el.closest('[hidden],[aria-hidden="true"]') === null
      )

    const first = focusables()[0]
    ;(first ?? node)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstItem = items[0] as HTMLElement
      const lastItem = items[items.length - 1] as HTMLElement
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      // `<body>` is not an opener: the panel that launched this modal often
      // unmounts in the same commit, so `document.activeElement` had already
      // fallen back to the body by the time it was captured.
      const opener = restoreTo.current
      if (opener && opener !== document.body && document.contains(opener)) opener.focus()
      else fallback?.()?.focus()
    }
  }, [open, onClose, fallback])

  return ref
}
