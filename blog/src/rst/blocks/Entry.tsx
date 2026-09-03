import type { EntryBlock } from '../types'
import s from './blocks.module.css'

export function Entry({ block, isLast }: { block: EntryBlock; isLast: boolean }) {
  return (
    <div className={isLast ? `${s.entry} ${s.entryLast}` : s.entry}>
      {block.date ? <div className={s.entryDate}>{block.date}</div> : null}
      <div className={s.entryRole}>{block.title}</div>
      {block.org ? <div className={s.entryOrg}>{block.org}</div> : null}
    </div>
  )
}
