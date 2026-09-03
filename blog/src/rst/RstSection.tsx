import { RstBlockView } from './blocks'
import type { RstSection as Section } from './types'
import s from './blocks/blocks.module.css'

const LAYOUT = {
  grid: s.layoutGrid,
  stack: s.layoutStack,
  list: s.layoutList,
} as const

export function RstSectionView({ section }: { section: Section }) {
  return (
    <section className={s.section} id={section.id} aria-labelledby={`${section.id}-title`}>
      {section.title ? (
        <h2 className={s.sectionTitle} id={`${section.id}-title`}>
          {section.title}
        </h2>
      ) : null}
      <div className={LAYOUT[section.layout]}>
        {section.blocks.map((block, i) => (
          <RstBlockView
            key={`${block.type}-${i}`}
            block={block}
            isLast={i === section.blocks.length - 1}
          />
        ))}
      </div>
    </section>
  )
}
