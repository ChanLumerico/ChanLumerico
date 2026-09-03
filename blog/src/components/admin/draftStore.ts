import { BUILTIN_DRAFT, normaliseConfig, normalisePages } from '../../config/normalise'
import { readJson, removeKey, writeJson } from '../../velog/store'
import type { PageKey, SiteConfig, SiteDraft } from '../../config/types'

/**
 * The unsaved-draft buffer.
 *
 * The prototype persisted everything to `localStorage['chanlee-cv-config-v6']`
 * and treated that as the site's content — which means edits live in one
 * browser and never reach a visitor. Here the content of record is
 * `src/content/*.rst` and `src/content/config.json`; this key only holds work
 * in progress, and the UI says so.
 */
export const DRAFT_KEY = 'chanlee-cv-draft-v1'
const DRAFT_FORMAT = 1

interface Stored {
  v: number
  config: unknown
  pages: unknown
}

export interface DraftState {
  draft: SiteDraft
  /** True when the buffer differs from what is committed in the repo. */
  dirty: boolean
  /** Set when a write was refused — a data-URL photo can exceed the quota. */
  quotaWarning: boolean
}

const samePages = (a: Record<PageKey, string>, b: Record<PageKey, string>): boolean =>
  (Object.keys(a) as PageKey[]).every(k => a[k] === b[k])

const sameConfig = (a: SiteConfig, b: SiteConfig): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

const isDirty = (draft: SiteDraft): boolean =>
  !sameConfig(draft.config, BUILTIN_DRAFT.config) ||
  !samePages(draft.pages, BUILTIN_DRAFT.pages)

const load = (): SiteDraft => {
  const stored = readJson<Stored>(DRAFT_KEY)
  if (!stored || stored.v !== DRAFT_FORMAT) {
    // A buffer written by an older format is discarded, not migrated: it
    // describes content the repo has since moved past.
    if (stored) removeKey(DRAFT_KEY)
    return BUILTIN_DRAFT
  }
  return {
    config: normaliseConfig(stored.config),
    pages: normalisePages(stored.pages),
  }
}

class DraftStore {
  private state: DraftState

  private readonly listeners = new Set<() => void>()

  constructor() {
    const draft = load()
    this.state = { draft, dirty: isDirty(draft), quotaWarning: false }
  }

  getState = (): DraftState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private commit(draft: SiteDraft, quotaWarning = this.state.quotaWarning): void {
    const dirty = isDirty(draft)
    let warned = quotaWarning
    if (dirty) {
      const ok = writeJson(DRAFT_KEY, {
        v: DRAFT_FORMAT,
        config: draft.config,
        pages: draft.pages,
      } satisfies Stored)
      if (!ok) warned = true
    } else {
      removeKey(DRAFT_KEY)
      warned = false
    }
    this.state = { draft, dirty, quotaWarning: warned }
    for (const l of this.listeners) l()
  }

  /** Mutate the config through a copy, so nothing is aliased into state. */
  updateConfig = (fn: (config: SiteConfig) => void): void => {
    const config = structuredClone(this.state.draft.config)
    fn(config)
    this.commit({ ...this.state.draft, config: normaliseConfig(config) })
  }

  setPage = (key: PageKey, source: string): void => {
    // An empty buffer is never a real edit — it would blank the page.
    if (!source.trim()) return
    this.commit({
      ...this.state.draft,
      pages: { ...this.state.draft.pages, [key]: source },
    })
  }

  revertPage = (key: PageKey): void => {
    this.commit({
      ...this.state.draft,
      pages: { ...this.state.draft.pages, [key]: BUILTIN_DRAFT.pages[key] },
    })
  }

  /** Throw the whole buffer away and go back to what the repo holds. */
  discard = (): void => {
    removeKey(DRAFT_KEY)
    this.state = { draft: BUILTIN_DRAFT, dirty: false, quotaWarning: false }
    for (const l of this.listeners) l()
  }
}

export const draftStore = new DraftStore()
