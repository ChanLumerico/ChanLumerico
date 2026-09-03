import type { CardBlock } from '../types'
import s from './blocks.module.css'

/**
 * `.. card::` — the workhorse block. The eyebrow is `:num:` in the accent
 * colour or, failing that, `:meta:` in grey; `:num:` wins when both are set.
 */
export function Card({ block }: { block: CardBlock }) {
  const hasActions = block.links.length > 0 || block.tags.length > 0
  return (
    <div className={s.card}>
      {block.num ? (
        <div className={s.cardNum}>{block.num}</div>
      ) : block.meta ? (
        <div className={s.cardMeta}>{block.meta}</div>
      ) : null}
      <h3 className={s.cardTitle}>{block.title}</h3>
      {block.body ? <p className={s.cardBody}>{block.body}</p> : null}
      {block.bullets.length > 0 ? (
        <div className={s.bullets}>
          {block.bullets.map((t, i) => (
            <div key={`${t}-${i}`} className={s.bulletRow}>
              <span className={s.bulletDot} aria-hidden="true" />
              <span className={s.bulletText}>{t}</span>
            </div>
          ))}
        </div>
      ) : null}
      {hasActions ? (
        <div className={s.cardActions}>
          {block.links.map((l, i) => (
            <a key={`${l.href}-${i}`} className="btnFilled" href={l.href}>
              {l.label}
            </a>
          ))}
          {block.tags.map((t, i) => (
            <span key={`${t}-${i}`} className={s.tag}>
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
