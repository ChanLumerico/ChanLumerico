import type { DiagramBlock } from '../types'
import s from './blocks.module.css'

const SDE_PATH = 'M60 75 C 90 40, 110 110, 138 62 S 176 108, 202 68 S 236 96, 254 75'
const ODE_PATH = 'M60 75 L 254 75'
const ARROW = 'M258 75 l-9 -5 v10 z'

function Panel({
  label,
  sub,
  path,
  straight,
}: {
  label: string
  sub: string
  path: string
  straight: boolean
}) {
  return (
    <div className={`${s.panel} ${s.panelDiagram}`}>
      <div className={s.panelLabel}>{label}</div>
      <svg
        className={`${s.svg} ${s.svgOverflow}`}
        viewBox="0 0 320 150"
        width="100%"
        role="img"
        aria-label={`${label} — ${sub}`}
      >
        <circle cx="34" cy="75" r="26" fill="#1d1d1f" opacity="0.08" />
        <circle cx="34" cy="75" r="13" fill="#1d1d1f" opacity="0.14" />
        <rect x="270" y="49" width="34" height="52" rx="6" fill="#1d1d1f" opacity="0.1" />
        <rect x="279" y="60" width="16" height="30" rx="3" fill="#1d1d1f" opacity="0.18" />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          {...(straight ? {} : { strokeDasharray: '1 5' })}
        />
        <path d={ARROW} fill="currentColor" {...(straight ? {} : { opacity: '0.75' })} />
        <text x="34" y="130" textAnchor="middle" fontSize="10" fill="#6e6e73">
          noise
        </text>
        <text x="287" y="130" textAnchor="middle" fontSize="10" fill="#6e6e73">
          data
        </text>
      </svg>
      <div className={s.panelSub}>{sub}</div>
    </div>
  )
}

/** `:cite: Source line <https://…>` — the URL renders host-stripped. */
function Cite({ cite }: { cite: string }) {
  const m = cite.match(/^(.*?)\s*<(.+)>$/)
  if (!m) return <span className={s.citeLine}>{cite}</span>
  const [, text, url] = m
  return (
    <span className={s.citeLine}>
      {text}{' '}
      <a href={url} target="_blank" rel="noopener">
        {(url ?? '').replace(/^https?:\/\//, '')}
      </a>
    </span>
  )
}

/** `.. diagram::` — a curved SDE path against a straight ODE path. */
export function Diagram({ block }: { block: DiagramBlock }) {
  return (
    <figure className={s.figure}>
      <div className={`${s.frame} ${s.frameDiagram}`}>
        <div className={s.panelRowDiagram}>
          <Panel
            label="Diffusion · SDE"
            sub="Many small stochastic steps along a curved path. Accuracy comes from step count."
            path={SDE_PATH}
            straight={false}
          />
          <Panel
            label="Rectified flow · ODE"
            sub="A velocity field straightened by reflow. The same transport in a handful of steps."
            path={ODE_PATH}
            straight
          />
        </div>
      </div>
      {block.title || block.cite ? (
        <figcaption className={s.caption}>
          {block.title ? <span style={{ display: 'block' }}>{block.title}</span> : null}
          {block.cite ? <Cite cite={block.cite} /> : null}
        </figcaption>
      ) : null}
    </figure>
  )
}
