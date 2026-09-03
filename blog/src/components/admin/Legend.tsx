import { RST_LEGEND } from './rstLegend'
import s from './admin.module.css'

/** The floating cheatsheet beside the source editor. Hidden below 1240px. */
export function Legend() {
  return (
    <aside className={`${s.legend} adminui`} aria-label="RST syntax reference">
      <div>
        <div className={s.modalTitle}>Syntax</div>
        <div className={s.panelSub}>RST-flavoured, three-space indents</div>
      </div>
      {RST_LEGEND.map(row => (
        <div key={row.label} className={s.legendRow}>
          <div className={s.legendLabel}>{row.label}</div>
          <pre className={s.legendCode}>{row.code}</pre>
        </div>
      ))}
    </aside>
  )
}
