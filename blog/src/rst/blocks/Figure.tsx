import type { FigureBlock } from '../types'
import { rstSlug } from '../parse'
import s from './blocks.module.css'

/**
 * `.. figure::` — an image frame at a declared aspect ratio.
 *
 * The prototype mounts the DC runtime's `<image-slot>` here, which is a
 * drop target backed by a sidecar JSON file. This port has no such runtime:
 * the frame renders `:src:` when the source names one, and otherwise shows
 * the `:placeholder:` copy so the block never renders as a broken image.
 */
export function Figure({ block }: { block: FigureBlock }) {
  const id = block.id || `fig-${rstSlug(block.title.slice(0, 24))}`
  const ratio = (block.ratio || '16/9').replace('/', ' / ')
  return (
    <figure className={`${s.figure} ${s.figureTight}`}>
      <div className={s.figureFrame} id={id} style={{ aspectRatio: ratio }}>
        {block.src ? (
          <img className={s.figureImg} src={block.src} alt={block.title || ''} />
        ) : (
          <span className={s.figurePlaceholder}>
            {block.placeholder || 'Drop a figure here'}
          </span>
        )}
      </div>
      {block.title ? (
        <figcaption className={`${s.caption} ${s.captionNarrow}`}>{block.title}</figcaption>
      ) : null}
    </figure>
  )
}
