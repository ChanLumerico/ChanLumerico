import { useMemo } from 'react'
import {
  arrowsFor,
  blobsFor,
  H,
  railsFor,
  RAIL_RX,
  RAIL_RY,
  sampleField,
  SCORE_LABEL,
  SCORE_SUB,
  scoreAt,
  velAt,
  VEL_LABEL,
  VEL_SUB,
  W,
  type Arrow,
} from '../../field/field'
import type { FieldBlock } from '../types'
import s from './blocks.module.css'

function Arrows({ arrows }: { arrows: readonly Arrow[] }) {
  return (
    <>
      {arrows.map((a, i) => (
        <g key={i} opacity={a.opacity}>
          <path
            d={`M${a.ax.toFixed(1)} ${a.ay.toFixed(1)} L${a.bx.toFixed(1)} ${a.by.toFixed(1)}`}
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <path
            d={
              `M${a.bx.toFixed(1)} ${a.by.toFixed(1)}` +
              ` L${a.c1x.toFixed(1)} ${a.c1y.toFixed(1)}` +
              ` L${a.c2x.toFixed(1)} ${a.c2y.toFixed(1)} Z`
            }
            fill="currentColor"
          />
        </g>
      ))}
    </>
  )
}

function Panel({
  label,
  sub,
  children,
}: {
  label: string
  sub: string
  children: React.ReactNode
}) {
  return (
    <div className={s.panel}>
      <div className={s.panelLabel}>{label}</div>
      <svg
        className={s.svg}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`${label} — ${sub}`}
      >
        {children}
      </svg>
      <div className={s.panelSub}>{sub}</div>
    </div>
  )
}

/**
 * `.. field::` — a scientific figure, not decoration.
 *
 * Both panels are evaluated from their actual definitions on a grid: the
 * score of a two-mode Gaussian mixture, and the velocity field of a rectified
 * flow. The maths lives in `src/field/field.ts` and is unit-tested; this
 * component only turns its output into SVG.
 */
export function Field({ block }: { block: FieldBlock }) {
  const scoreArrows = useMemo(() => arrowsFor(sampleField(scoreAt), false), [])
  const velArrows = useMemo(() => arrowsFor(sampleField(velAt), true), [])
  const blobs = useMemo(() => blobsFor(), [])
  const rails = useMemo(() => railsFor(), [])

  return (
    <figure className={s.figure}>
      <div className={s.frame}>
        <div className={s.panelRowField}>
          <Panel label={SCORE_LABEL} sub={SCORE_SUB}>
            {blobs.map((b, i) => (
              <g key={i}>
                <circle
                  cx={b.cx.toFixed(1)}
                  cy={b.cy.toFixed(1)}
                  r={b.r.toFixed(1)}
                  fill="#1d1d1f"
                  opacity="0.05"
                />
                <circle
                  cx={b.cx.toFixed(1)}
                  cy={b.cy.toFixed(1)}
                  r={(b.r * 0.4).toFixed(1)}
                  fill="#1d1d1f"
                  opacity="0.12"
                />
              </g>
            ))}
            <Arrows arrows={scoreArrows} />
          </Panel>
          <Panel label={VEL_LABEL} sub={VEL_SUB}>
            {rails.map(r => (
              <g key={r.label}>
                <ellipse
                  cx={r.cx.toFixed(1)}
                  cy={r.cy.toFixed(1)}
                  rx={RAIL_RX}
                  ry={RAIL_RY}
                  fill="#1d1d1f"
                  opacity="0.06"
                />
                <text
                  x={r.cx.toFixed(1)}
                  y={H - 3}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6e6e73"
                >
                  {r.label}
                </text>
              </g>
            ))}
            <Arrows arrows={velArrows} />
          </Panel>
        </div>
      </div>
      {block.title ? <figcaption className={s.caption}>{block.title}</figcaption> : null}
    </figure>
  )
}
