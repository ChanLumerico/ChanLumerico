import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { parseRst } from '../../rst/parse'
import {
  ACCENTS,
  ACCENT_KEYS,
  RAIL_LABELS,
  type PageKey,
  type RailBlockKey,
  type SiteConfig,
  type SiteDraft,
} from '../../config/types'
import { CodeMark, PencilMark } from '../icons'
import { copyText, downloadText, filesFor } from './save'
import s from './admin.module.css'

interface Row {
  key: string
  label: string
  hiddenKey: string
}

/** Move `i` by `d` inside `list`, in place. */
const swap = <T,>(list: T[], i: number, d: number): void => {
  const j = i + d
  if (j < 0 || j >= list.length) return
  const a = list[i] as T
  list[i] = list[j] as T
  list[j] = a
}

function OrderRows({
  rows,
  hidden,
  onMove,
  onToggle,
}: {
  rows: readonly Row[]
  hidden: Record<string, boolean>
  onMove: (i: number, d: number) => void
  onToggle: (hiddenKey: string) => void
}) {
  return (
    <>
      {rows.map((row, i) => {
        const off = hidden[row.hiddenKey] === true
        return (
          <div key={row.key} className={s.row}>
            <span className={off ? `${s.rowLabel} ${s.rowLabelOff}` : s.rowLabel}>
              {row.label}
            </span>
            <button
              type="button"
              className={s.miniBtn}
              aria-label={`Move ${row.label} up`}
              disabled={i === 0}
              onClick={() => onMove(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={s.miniBtn}
              aria-label={`Move ${row.label} down`}
              disabled={i === rows.length - 1}
              onClick={() => onMove(i, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className={s.eyeBtn}
              aria-pressed={off}
              onClick={() => onToggle(row.hiddenKey)}
            >
              {off ? 'Show' : 'Hide'}
            </button>
          </div>
        )
      })}
    </>
  )
}

export function AdminPanel({
  draft,
  dirty,
  quotaWarning,
  onClose,
  onUpdate,
  onOpenSource,
  onOpenPhoto,
  onDiscard,
  currentPage,
}: {
  draft: SiteDraft
  dirty: boolean
  quotaWarning: boolean
  onClose: () => void
  onUpdate: (fn: (config: SiteConfig) => void) => void
  onOpenSource: (page: PageKey) => void
  onOpenPhoto: () => void
  onDiscard: () => void
  currentPage: PageKey
}) {
  const { pathname } = useLocation()
  const config = draft.config
  const [copied, setCopied] = useState('')

  // Home is the only reorderable page, and its sections come from main.rst —
  // so the rows are read from the source, not from a hard-coded list.
  const sectionRows = useMemo<Row[]>(() => {
    const sections = parseRst(draft.pages.main)
    const byId = new Map(sections.map(sec => [sec.id, sec.title || sec.id]))
    const ordered = config.sectionOrder.filter(id => byId.has(id))
    for (const sec of sections) if (!ordered.includes(sec.id)) ordered.push(sec.id)
    return ordered.map(id => ({ key: id, label: byId.get(id) ?? id, hiddenKey: id }))
  }, [draft.pages.main, config.sectionOrder])

  const railRows = useMemo<Row[]>(
    () =>
      config.blockOrder.map(key => ({
        key,
        label: RAIL_LABELS[key],
        hiddenKey: `blk-${key}`,
      })),
    [config.blockOrder]
  )

  const files = filesFor(draft)
  const changedFiles = files.filter(f => f.changed)

  const setProfile = (patch: Partial<SiteConfig['profile']>) =>
    onUpdate(c => {
      c.profile = { ...c.profile, ...patch }
    })

  return (
    <div
      className={`${s.panel} adminui`}
      role="dialog"
      aria-label="Page settings"
      aria-modal="false"
    >
      <div className={s.panelHead}>
        <div>
          <div className={s.panelTitle}>Page settings</div>
          <div className={s.panelSub}>
            {dirty ? 'Unsaved draft in this browser' : 'Matching the committed files'}
          </div>
        </div>
        <button type="button" className={s.closeBtn} aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className={dirty ? `${s.draftBanner} ${s.draftBannerWarn}` : s.draftBanner}>
        {dirty
          ? 'These edits live only in this browser. Nothing a visitor sees changes until you commit the files below.'
          : 'Edits here are a draft buffer. The site itself is served from src/content/ in the repo.'}
        {quotaWarning
          ? ' — the draft could not be saved locally (out of storage), so keep this tab open until you have downloaded the files.'
          : ''}
      </div>

      <div className={s.group}>
        <div className="eyebrow">Sections — reorder and hide</div>
        <OrderRows
          rows={sectionRows}
          hidden={config.hidden}
          onMove={(i, d) =>
            onUpdate(c => {
              const order = sectionRows.map(r => r.key)
              swap(order, i, d)
              c.sectionOrder = order
            })
          }
          onToggle={key =>
            onUpdate(c => {
              if (c.hidden[key]) delete c.hidden[key]
              else c.hidden[key] = true
            })
          }
        />
      </div>

      <div className={s.group}>
        <div className="eyebrow">Sidebar</div>
        <div className={s.segmented}>
          {(['left', 'right'] as const).map(side => (
            <button
              key={side}
              type="button"
              className={config.side === side ? `${s.segment} ${s.segmentOn}` : s.segment}
              aria-pressed={config.side === side}
              onClick={() =>
                onUpdate(c => {
                  c.side = side
                })
              }
            >
              {side === 'left' ? 'Left' : 'Right'}
            </button>
          ))}
        </div>
        <OrderRows
          rows={railRows}
          hidden={config.hidden}
          onMove={(i, d) =>
            onUpdate(c => {
              const order = [...c.blockOrder]
              swap(order, i, d)
              c.blockOrder = order as RailBlockKey[]
            })
          }
          onToggle={key =>
            onUpdate(c => {
              if (c.hidden[key]) delete c.hidden[key]
              else c.hidden[key] = true
            })
          }
        />
      </div>

      <div className={s.group}>
        <div className="eyebrow">Profile</div>
        <label className={s.field}>
          <span className={s.fieldLabel}>Name</span>
          <input
            className={s.input}
            value={config.profile.name}
            onChange={e => setProfile({ name: e.target.value })}
          />
        </label>
        <label className={s.field}>
          <span className={s.fieldLabel}>Affiliation — one line each</span>
          <textarea
            className={s.textarea}
            rows={2}
            value={config.profile.affiliation.join('\n')}
            onChange={e => setProfile({ affiliation: e.target.value.split('\n') })}
          />
        </label>
        <label className={s.field}>
          <span className={s.fieldLabel}>Sub-line</span>
          <input
            className={s.input}
            value={config.profile.meta}
            onChange={e => setProfile({ meta: e.target.value })}
          />
        </label>
        <label className={s.field}>
          <span className={s.fieldLabel}>Email</span>
          <input
            className={s.input}
            type="email"
            value={config.profile.email}
            onChange={e => setProfile({ email: e.target.value })}
          />
        </label>
        <label className={s.field}>
          <span className={s.fieldLabel}>GitHub</span>
          <input
            className={s.input}
            type="url"
            value={config.profile.github}
            onChange={e => setProfile({ github: e.target.value })}
          />
        </label>
        <label className={s.field}>
          <span className={s.fieldLabel}>Instagram</span>
          <input
            className={s.input}
            type="url"
            value={config.profile.instagram}
            onChange={e => setProfile({ instagram: e.target.value })}
          />
        </label>
        <button type="button" className="btnQuiet" onClick={onOpenPhoto}>
          <PencilMark />
          Crop profile photo
        </button>
      </div>

      <div className={s.group}>
        <div className="eyebrow">Content</div>
        <button type="button" className="btnQuiet" onClick={() => onOpenSource(currentPage)}>
          <CodeMark />
          Edit this page’s source (RST)
        </button>
        <div className={s.hint}>
          Every page is generated from its RST source, so its copy — and any new block — is
          edited there. You are on <strong>{currentPage}</strong>
          {pathname.startsWith('/series/') || pathname.startsWith('/post/')
            ? ' (a velog view: its content comes from velog, not from a source file)'
            : ''}
          .
        </div>
      </div>

      <div className={s.group}>
        <div className="eyebrow">Accent</div>
        <div className={s.swatches}>
          {ACCENT_KEYS.map(name => {
            const [filled] = ACCENTS[name]
            const on = config.accent === name
            return (
              <button
                key={name}
                type="button"
                className={on ? `${s.swatch} ${s.swatchOn}` : s.swatch}
                style={{ background: filled, color: filled }}
                aria-label={name}
                aria-pressed={on}
                title={name}
                onClick={() =>
                  onUpdate(c => {
                    c.accent = name
                  })
                }
              />
            )
          })}
        </div>
      </div>

      <div className={s.group}>
        <div className="eyebrow">
          Save —{' '}
          {changedFiles.length === 0 ? 'nothing changed' : `${changedFiles.length} file(s)`}
        </div>
        {files.map(file => (
          <div key={file.path} className={s.row}>
            <span className={file.changed ? s.rowLabel : `${s.rowLabel} ${s.rowLabelOff}`}>
              {file.path.replace('src/content/', '')}
              {file.changed ? ' •' : ''}
            </span>
            <button
              type="button"
              className={s.eyeBtn}
              onClick={() => {
                void copyText(file.contents).then(ok => setCopied(ok ? file.path : ''))
              }}
            >
              {copied === file.path ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              className={s.eyeBtn}
              onClick={() =>
                downloadText(
                  file.path.split('/').pop() ?? 'file.txt',
                  file.contents,
                  file.path.endsWith('.json') ? 'application/json' : 'text/plain'
                )
              }
            >
              Save
            </button>
          </div>
        ))}
        <div className={s.hint}>
          Write each file back to its path in the repo and commit. That is what a visitor sees.
        </div>
      </div>

      <div className={s.footRow}>
        <button
          type="button"
          className={s.smallOutline}
          onClick={() => {
            for (const file of changedFiles) {
              downloadText(
                file.path.split('/').pop() ?? 'file.txt',
                file.contents,
                file.path.endsWith('.json') ? 'application/json' : 'text/plain'
              )
            }
          }}
          disabled={changedFiles.length === 0}
        >
          Download changed files
        </button>
        <button type="button" className={s.smallQuiet} onClick={onDiscard} disabled={!dirty}>
          Discard draft
        </button>
      </div>
    </div>
  )
}
