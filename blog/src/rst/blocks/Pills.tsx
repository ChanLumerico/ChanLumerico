import type { PillsBlock } from '../types'
import s from './blocks.module.css'

export function Pills({ block }: { block: PillsBlock }) {
  const items = block.title
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
  return (
    <div className={s.pills}>
      {items.map(t => (
        <span key={t} className={s.pill}>
          {t}
        </span>
      ))}
    </div>
  )
}
