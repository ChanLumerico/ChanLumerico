import { useEffect, useRef } from 'react'

const REVEALED = 'data-revealed'

/**
 * The prototype's fade-in, ported.
 *
 * An IntersectionObserver at threshold 0.08 with a -6% bottom margin, plus a
 * sweep that shows anything already above 94% of the viewport — the sweep is
 * what makes a route change reveal the new page's above-the-fold blocks
 * immediately instead of waiting for a scroll.
 *
 * Under `prefers-reduced-motion: reduce`, or with no IntersectionObserver,
 * everything is shown at once and the CSS drops the transition.
 */
export function useReveal(deps: readonly unknown[] = []): void {
  const observer = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const show = (n: HTMLElement) => {
      if (n.getAttribute(REVEALED)) return
      n.setAttribute(REVEALED, '1')
      observer.current?.unobserve(n)
    }

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (reduced || !('IntersectionObserver' in window)) {
      for (const n of nodes) show(n)
      return
    }

    const sweep = () => {
      for (const n of nodes) {
        if (n.getBoundingClientRect().top < window.innerHeight * 0.94) show(n)
      }
    }

    observer.current = new IntersectionObserver(
      entries => {
        for (const e of entries) if (e.isIntersecting) show(e.target as HTMLElement)
        sweep()
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    )
    for (const n of nodes) observer.current.observe(n)

    window.addEventListener('scroll', sweep, { passive: true })
    const frame = requestAnimationFrame(sweep)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', sweep)
      observer.current?.disconnect()
      observer.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
