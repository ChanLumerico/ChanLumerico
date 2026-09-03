import type { QuoteBlock } from '../types'
import s from './blocks.module.css'

export function Quote({ block }: { block: QuoteBlock }) {
  return (
    <blockquote className={s.quote}>
      <p className={s.quoteText}>{block.title || block.body}</p>
      {block.cite ? <div className={s.quoteCite}>{block.cite}</div> : null}
    </blockquote>
  )
}
