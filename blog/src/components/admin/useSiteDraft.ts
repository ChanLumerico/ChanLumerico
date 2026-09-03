import { useSyncExternalStore } from 'react'
import { BUILTIN_DRAFT } from '../../config/normalise'
import type { SiteDraft } from '../../config/types'
import { adminEnabled } from './gate'
import { draftStore } from './draftStore'

/**
 * What the site renders.
 *
 * Visitors always get the committed content. Only with the admin layer
 * enabled does the unsaved-draft buffer take over, so a stale draft in one
 * browser can never become what the site looks like.
 */
export function useSiteDraft(): SiteDraft {
  const state = useSyncExternalStore(
    draftStore.subscribe,
    draftStore.getState,
    draftStore.getState
  )
  return adminEnabled() ? state.draft : BUILTIN_DRAFT
}
