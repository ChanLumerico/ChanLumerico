import type { UnknownBlock } from '../types'
import s from './blocks.module.css'

/**
 * The prototype's fallback branch: an unrecognised directive still shows its
 * copy rather than vanishing.
 */
export function Unknown({ block }: { block: UnknownBlock }) {
  return <p className={s.para}>{block.body || block.title}</p>
}
