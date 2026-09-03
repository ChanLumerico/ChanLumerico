import { splitPipes } from '../parse'
import type { StatsBlock } from '../types'
import s from './blocks.module.css'

/** `:item: value | label` — a rule-bounded strip of figures. */
export function Stats({ block }: { block: StatsBlock }) {
  return (
    <div className={s.stats}>
      {block.items.map((item, i) => {
        const [value, label] = splitPipes(item, 2)
        return (
          <div key={`${value}-${i}`}>
            <div className={s.statValue}>{value}</div>
            <div className={s.statLabel}>{label}</div>
          </div>
        )
      })}
    </div>
  )
}
