import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { downloadBlob } from './save'
import s from './admin.module.css'

/** The crop is square, so one side is all the output needs. */
const OUTPUT_PX = 512

interface View {
  scale: number
  x: number
  y: number
}

const START: View = { scale: 1, x: 0, y: 0 }

/**
 * Pick a photo, pan and zoom it under a 1:1 circular guide, and get the
 * cropped square back.
 *
 * The prototype's `<image-slot>` wrote the crop into a sidecar JSON file next
 * to the HTML. There is no such runtime here and the repo is the content of
 * record, so committing the result means writing a file: "Use it" previews
 * the crop in the rail (held in the draft buffer) and "Download portrait.jpg"
 * gives you the file to drop into `public/`.
 */
export function PhotoCropModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean
  onClose: () => void
  onApply: (dataUrl: string) => void
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(open, onClose)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const dragFrom = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [view, setView] = useState<View>(START)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) {
      setSrc(null)
      setView(START)
    }
  }, [open])

  const pick = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setSrc(String(reader.result))
      setView(START)
    }
    reader.readAsDataURL(file)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!src) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    dragFrom.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const from = dragFrom.current
    if (!from) return
    setView(v => ({
      ...v,
      x: from.x + (e.clientX - from.px),
      y: from.y + (e.clientY - from.py),
    }))
  }

  const onPointerUp = () => {
    dragFrom.current = null
  }

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    setView(v => ({ ...v, scale: Math.min(6, Math.max(0.2, v.scale * (1 - e.deltaY / 500))) }))
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !open) return
    // A passive listener cannot preventDefault, and the page would scroll.
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [open, onWheel, src])

  /** Redraw the visible crop into a square canvas at the guide's scale. */
  const renderCrop = (): Promise<Blob | null> => {
    const img = imgRef.current
    const stage = stageRef.current
    const guide = stage?.querySelector<HTMLElement>(`.${s.cropGuide}`)
    if (!img || !stage || !guide) return Promise.resolve(null)

    const guideBox = guide.getBoundingClientRect()
    const imgBox = img.getBoundingClientRect()
    // Source pixels per rendered pixel.
    const ratio = img.naturalWidth / imgBox.width
    const sx = (guideBox.left - imgBox.left) * ratio
    const sy = (guideBox.top - imgBox.top) * ratio
    const size = guideBox.width * ratio

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_PX
    canvas.height = OUTPUT_PX
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.resolve(null)
    ctx.fillStyle = '#f5f5f7'
    ctx.fillRect(0, 0, OUTPUT_PX, OUTPUT_PX)
    ctx.drawImage(img, sx, sy, size, size, 0, 0, OUTPUT_PX, OUTPUT_PX)
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  }

  const use = async () => {
    setBusy(true)
    const blob = await renderCrop()
    setBusy(false)
    if (!blob) return
    const reader = new FileReader()
    reader.onload = () => {
      onApply(String(reader.result))
      onClose()
    }
    reader.readAsDataURL(blob)
  }

  const download = async () => {
    setBusy(true)
    const blob = await renderCrop()
    setBusy(false)
    if (blob) downloadBlob('portrait.jpg', blob)
  }

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className={`${s.scrim} adminui`}
        aria-label="Close photo editor"
        onClick={onClose}
      />
      <div
        ref={trapRef}
        className={`${s.cropModal} adminui`}
        role="dialog"
        aria-modal="true"
        aria-label="Profile photo"
        tabIndex={-1}
      >
        <div className={s.modalHead}>
          <span className={s.modalTitle}>Profile photo</span>
          <span className={s.spacer} />
          <button type="button" className={s.modalBtn} onClick={onClose}>
            Cancel
          </button>
        </div>

        <div
          ref={stageRef}
          className={s.cropStage}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src ? (
            <>
              <img
                ref={imgRef}
                src={src}
                alt="Photo being cropped"
                draggable={false}
                style={{
                  maxWidth: 'none',
                  height: 'auto',
                  width: '100%',
                  transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                  transformOrigin: 'center',
                }}
              />
              <div className={s.cropGuide} />
            </>
          ) : (
            <label className={s.cropEmpty}>
              <span>Choose a photo</span>
              <span className="btnFilled">Browse…</span>
              <input
                className={s.visuallyHidden}
                type="file"
                accept="image/*"
                onChange={e => pick(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        <div className={s.cropHint}>
          {src
            ? 'Drag to reposition · Scroll to zoom · The circle is the 1:1 crop'
            : 'A square crop, shown as a circle in the rail'}
        </div>

        <div className={s.cropFoot}>
          {src ? (
            <>
              <button type="button" className={s.modalBtn} onClick={() => setView(START)}>
                Reset
              </button>
              <span className={s.spacer} />
              <button
                type="button"
                className={s.modalBtn}
                onClick={() => void download()}
                disabled={busy}
              >
                Download portrait.jpg
              </button>
              <button
                type="button"
                className={s.modalBtnPrimary}
                onClick={() => void use()}
                disabled={busy}
              >
                Preview in rail
              </button>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
