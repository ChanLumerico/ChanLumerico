import { useEffect } from 'react'

/** `Chan Lee` on Home, `Chan Lee · <label>` everywhere else. */
export function useDocumentTitle(label: string | null): void {
  useEffect(() => {
    document.title = label ? `Chan Lee · ${label}` : 'Chan Lee'
  }, [label])
}
