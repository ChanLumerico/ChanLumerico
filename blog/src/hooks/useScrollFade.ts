import { useCallback, useEffect, useRef } from 'react'

/**
 * Soft edge fade on a scrollable sub-panel: the mask follows scroll position,
 * so the top edge only softens once there is content above it.
 */
export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  const sync = useCallback(() => {
    const el = ref.current
    if (!el) return
    const top = el.scrollTop > 2 ? 22 : 0
    const room = el.scrollHeight - el.clientHeight - el.scrollTop
    const bottom = room > 2 ? 26 : 0
    const mask = `linear-gradient(180deg, transparent 0, #000 ${top}px, #000 calc(100% - ${bottom}px), transparent 100%)`
    el.style.webkitMaskImage = mask
    el.style.maskImage = mask
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    const frame = requestAnimationFrame(sync)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [sync])

  return ref
}
