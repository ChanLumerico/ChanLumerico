import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { observeReveal } from '../hooks/reveal'

/**
 * A block that fades in when it comes into view. The transition, its easing
 * and the stagger delays all live in `global.css` / `tokens.css`.
 */
export function Reveal({
  children,
  delay,
  className,
}: {
  children: ReactNode
  /** Stagger, e.g. `140ms`. */
  delay?: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    return node ? observeReveal(node) : undefined
  }, [])

  return (
    <div
      ref={ref}
      className={className ? `reveal ${className}` : 'reveal'}
      style={delay ? ({ '--reveal-delay': delay } as CSSProperties) : undefined}
    >
      {children}
    </div>
  )
}
