import '@testing-library/react'

// This jsdom build does not expose Web Storage. The app guards every
// localStorage touch (a private window throws on access), so a missing one
// would not break it — but the tests need somewhere to seed a cache.
if (typeof globalThis.localStorage === 'undefined') {
  const makeStorage = (): Storage => {
    const map = new Map<string, string>()
    return {
      get length() {
        return map.size
      },
      clear: () => map.clear(),
      getItem: (k: string) => map.get(k) ?? null,
      key: (i: number) => Array.from(map.keys())[i] ?? null,
      removeItem: (k: string) => void map.delete(k),
      setItem: (k: string, v: string) => void map.set(k, String(v)),
    } as Storage
  }
  Object.defineProperty(globalThis, 'localStorage', { value: makeStorage(), writable: true })
  Object.defineProperty(globalThis, 'sessionStorage', { value: makeStorage(), writable: true })
}

// jsdom has no matchMedia; the reveal hook and the KaTeX loader both read it.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

if (typeof window.IntersectionObserver === 'undefined') {
  class NoopObserver implements IntersectionObserver {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds: readonly number[] = []
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
  ;(window as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
    NoopObserver as unknown as typeof IntersectionObserver
}
