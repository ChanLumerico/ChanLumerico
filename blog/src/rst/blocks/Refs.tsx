import { splitPipes } from '../parse'
import type { RefsBlock } from '../types'
import s from './blocks.module.css'

/** `:item: title | year | url?` — a url turns the whole row into a link. */
export function Refs({ block }: { block: RefsBlock }) {
  return (
    <div className={s.refs}>
      {block.items.map((item, i) => {
        const [title, year, url] = splitPipes(item, 3)
        const cls = i === block.items.length - 1 ? `${s.refRow} ${s.refRowLast}` : s.refRow
        const inner = (
          <>
            <span className={s.refYear}>{year}</span>
            <span className={s.refTitle}>{title}</span>
            {url ? (
              <span className={s.refArrow} aria-hidden="true">
                →
              </span>
            ) : null}
          </>
        )
        return url ? (
          <a key={`${title}-${i}`} className={cls} href={url} target="_blank" rel="noopener">
            {inner}
          </a>
        ) : (
          <div key={`${title}-${i}`} className={cls}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}
