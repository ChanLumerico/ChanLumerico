import { useCallback, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import type { PageKey } from '../../config/types'
import { GearMark } from '../icons'
import { AdminPanel } from './AdminPanel'
import { PhotoCropModal } from './PhotoCropModal'
import { SourceModal } from './SourceModal'
import { draftStore } from './draftStore'
import { adminEnabled } from './gate'
import s from './admin.module.css'

/** Which page's source the current route edits. */
const pageForPath = (pathname: string): PageKey => {
  const path = pathname.replace(/^\//, '')
  if (path === 'research') return 'research'
  if (path === 'writing' || path.startsWith('series/') || path.startsWith('post/')) {
    return 'writing'
  }
  return 'main'
}

export default function AdminLayer() {
  const state = useSyncExternalStore(
    draftStore.subscribe,
    draftStore.getState,
    draftStore.getState
  )
  const { pathname } = useLocation()
  const [panelOpen, setPanelOpen] = useState(false)
  const [sourcePage, setSourcePage] = useState<PageKey | null>(null)
  const [photoOpen, setPhotoOpen] = useState(false)

  const closeSource = useCallback(() => setSourcePage(null), [])
  const closePhoto = useCallback(() => setPhotoOpen(false), [])

  if (!adminEnabled()) return null

  return (
    <>
      <button
        type="button"
        className={[s.fab, 'adminui', state.dirty ? s.fabDirty : ''].filter(Boolean).join(' ')}
        title="Page settings"
        aria-label="Page settings"
        aria-expanded={panelOpen}
        onClick={() => setPanelOpen(o => !o)}
      >
        <GearMark />
      </button>

      {panelOpen ? (
        <AdminPanel
          draft={state.draft}
          dirty={state.dirty}
          quotaWarning={state.quotaWarning}
          currentPage={pageForPath(pathname)}
          onClose={() => setPanelOpen(false)}
          onUpdate={draftStore.updateConfig}
          onOpenSource={page => {
            setSourcePage(page)
            setPanelOpen(false)
          }}
          onOpenPhoto={() => {
            setPhotoOpen(true)
            setPanelOpen(false)
          }}
          onDiscard={draftStore.discard}
        />
      ) : null}

      <SourceModal
        open={sourcePage !== null}
        initialPage={sourcePage ?? 'main'}
        pages={state.draft.pages}
        onClose={closeSource}
        onApply={drafts => {
          for (const [key, text] of Object.entries(drafts)) {
            if (text) draftStore.setPage(key as PageKey, text)
          }
        }}
        onRevert={draftStore.revertPage}
      />

      <PhotoCropModal
        open={photoOpen}
        onClose={closePhoto}
        onApply={dataUrl =>
          draftStore.updateConfig(c => {
            c.profile = { ...c.profile, photo: dataUrl }
          })
        }
      />
    </>
  )
}
