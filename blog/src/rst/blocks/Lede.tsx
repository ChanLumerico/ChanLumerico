import type { LedeBlock } from '../types'
import s from './blocks.module.css'

export function Lede({ block }: { block: LedeBlock }) {
  return <p className={s.lede}>{block.title || block.body}</p>
}
