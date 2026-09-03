import { useSyncExternalStore } from 'react'
import { velogClient, type VelogClient, type VelogState } from '../velog'

export interface UseVelog extends VelogState {
  client: VelogClient
}

/**
 * The single React boundary over the velog data layer.
 *
 * Everything below this file is framework-free: `VelogClient` holds the feed,
 * the series index and every loaded series, and this hook only subscribes to
 * it. `useSyncExternalStore` keeps the two consistent without an effect.
 */
export function useVelog(): UseVelog {
  const state = useSyncExternalStore(
    velogClient.subscribe,
    velogClient.getState,
    velogClient.getState
  )
  return { ...state, client: velogClient }
}
