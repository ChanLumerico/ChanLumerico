import type { PostBlock } from '../types'
import s from './blocks.module.css'

/** `.. post::` — an authored row, as opposed to a row from the live feed. */
export function Post({ block, isLast }: { block: PostBlock; isLast: boolean }) {
  return (
    <a
      className={isLast ? `${s.postRow} ${s.postRowLast}` : s.postRow}
      href={block.href || '#'}
    >
      <span className={s.postDate}>{block.date ?? ''}</span>
      <span className={s.postMid}>
        <span className={s.postTitle}>{block.title}</span>
        {block.body ? <span className={s.postSummary}>{block.body}</span> : null}
      </span>
      <span className={s.postArrow} aria-hidden="true">
        →
      </span>
    </a>
  )
}
