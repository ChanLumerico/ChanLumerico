/**
 * The prototype's fade-in, ported.
 *
 * One shared IntersectionObserver at threshold 0.08 with a -6% bottom margin,
 * plus a sweep that shows anything already above 94% of the viewport. The
 * sweep is what makes a route change reveal the new page's above-the-fold
 * blocks immediately instead of waiting for a scroll.
 *
 * Each element registers itself as it mounts, rather than the page being
 * queried once — the routes are lazily loaded, so a single query at mount
 * time would miss every section that arrives after Suspense resolves.
 *
 * Under `prefers-reduced-motion: reduce`, or with no IntersectionObserver,
 * an element is shown the moment it registers and the CSS drops the
 * transition.
 */

const REVEALED = 'data-revealed'

const pending = new Set<HTMLElement>()
let observer: IntersectionObserver | null = null
let listening = false

const show = (node: HTMLElement): void => {
  if (node.getAttribute(REVEALED)) return
  node.setAttribute(REVEALED, '1')
  pending.delete(node)
  observer?.unobserve(node)
}

const sweep = (): void => {
  const limit = window.innerHeight * 0.94
  for (const node of Array.from(pending)) {
    if (node.getBoundingClientRect().top < limit) show(node)
  }
}

const reducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Register one element. Returns its unsubscribe. */
export const observeReveal = (node: HTMLElement): (() => void) => {
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    node.setAttribute(REVEALED, '1')
    return () => {}
  }

  observer ??= new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) show(entry.target as HTMLElement)
      }
      sweep()
    },
    { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
  )

  if (!listening) {
    listening = true
    window.addEventListener('scroll', sweep, { passive: true })
    window.addEventListener('resize', sweep)
  }

  pending.add(node)
  observer.observe(node)
  requestAnimationFrame(sweep)

  return () => {
    pending.delete(node)
    observer?.unobserve(node)
  }
}
