import type { ParaBlock } from '../types'
import s from './blocks.module.css'

export function Para({ block }: { block: ParaBlock }) {
  return <p className={s.para}>{block.body}</p>
}
