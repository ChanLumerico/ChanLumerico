import { useEffect, useRef, useState } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { BUILTIN_DRAFT } from '../../config/normalise'
import { PAGE_KEYS, PAGE_LABELS, type PageKey } from '../../config/types'
import { Legend } from './Legend'
import { copyText, downloadText } from './save'
import { BLOCK_MENU, insertSnippet } from './snippets'
import s from './admin.module.css'

/**
 * The per-page RST source editor.
 *
 * Buffers live in a local draft map; nothing reaches the shared draft store
 * until Apply, so browsing tabs cannot overwrite a page. Apply writes to the
 * unsaved-draft buffer — the file itself is produced by Copy or Download and
 * committed by hand.
 */
export function SourceModal({
  open,
  onClose,
  initialPage,
  pages,
  onApply,
  onRevert,
}: {
  open: boolean
  onClose: () => void
  initialPage: PageKey
  pages: Readonly<Record<PageKey, string>>
  onApply: (drafts: Partial<Record<PageKey, string>>) => void
  onRevert: (page: PageKey) => void
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(open, onClose)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const [active, setActive] = useState<PageKey>(initialPage)
  const [buffers, setBuffers] = useState<Record<PageKey, string>>(() => ({ ...pages }))
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setActive(initialPage)
    setBuffers({ ...pages })
    setCopied(false)
    // Buffers are seeded from what is currently in the draft store, once per
    // open — re-seeding on every keystroke would fight the textarea.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPage])

  const value = buffers[active]
  const dirty = (key: PageKey) => buffers[key] !== pages[key]
  const changed = PAGE_KEYS.filter(dirty)

  const addBlock = (code: string) => {
    const ta = taRef.current
    const caret = ta?.selectionStart ?? value.length
    const next = insertSnippet(value, caret, code)
    setBuffers(b => ({ ...b, [active]: next.text }))
    requestAnimationFrame(() => {
      ta?.focus()
      ta?.setSelectionRange(next.caret, next.caret)
    })
  }

  const apply = () => {
    const out: Partial<Record<PageKey, string>> = {}
    for (const key of changed) out[key] = buffers[key]
    onApply(out)
    onClose()
  }

  const revert = () => {
    setBuffers(b => ({ ...b, [active]: BUILTIN_DRAFT.pages[active] }))
    onRevert(active)
  }

  const filename = `${active}.rst`

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className={`${s.scrim} adminui`}
        aria-label="Close page source editor"
        onClick={onClose}
      />
      <div
        ref={trapRef}
        className={`${s.modal} adminui`}
        role="dialog"
        aria-modal="true"
        aria-label="Page source"
        tabIndex={-1}
      >
        <div className={s.modalHead}>
          <span className={s.modalTitle}>Page source</span>
          {PAGE_KEYS.map(key => (
            <button
              key={key}
              type="button"
              className={[s.tab, key === active ? s.tabOn : '', dirty(key) ? s.tabDirty : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setActive(key)}
              aria-pressed={key === active}
            >
              {PAGE_LABELS[key]}
            </button>
          ))}
          <span className={s.spacer} />
          <button type="button" className={`${s.modalBtn} ${s.modalBtnQuiet}`} onClick={revert}>
            Revert to committed
          </button>
          <button type="button" className={s.modalBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={s.modalBtnPrimary} onClick={apply}>
            Apply
          </button>
        </div>

        <textarea
          ref={taRef}
          className={s.editor}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-label={`${PAGE_LABELS[active]} page source`}
          placeholder={'Section title\n=============\n\nWrite the page here.'}
          value={value}
          onChange={e => setBuffers(b => ({ ...b, [active]: e.target.value }))}
        />

        <div className={s.modalFoot}>
          <span className={s.adderRow}>
            <span>+ Add</span>
            {BLOCK_MENU.map(m => (
              <button
                key={m.type}
                type="button"
                className={s.adderBtn}
                onClick={() => addBlock(m.code)}
              >
                {m.label}
              </button>
            ))}
          </span>
          <span className={s.spacer} />
          <button
            type="button"
            className={s.modalBtn}
            onClick={() => {
              void copyText(value).then(ok => setCopied(ok))
            }}
          >
            {copied ? 'Copied' : `Copy ${filename}`}
          </button>
          <button
            type="button"
            className={s.modalBtn}
            onClick={() => downloadText(filename, value)}
          >
            Download
          </button>
        </div>
        <div className={s.modalFoot}>
          Apply keeps this in the unsaved draft. Commit it by saving{' '}
          <code>src/content/{filename}</code>.
        </div>
      </div>
      <Legend />
    </>
  )
}
