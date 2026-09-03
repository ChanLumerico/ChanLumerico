import { useMemo } from 'react'
import { parseRst } from '../rst/parse'
import { RstSectionView } from '../rst/RstSection'
import type { SiteConfig } from '../config/types'

/**
 * A page rendered from its `.rst` source.
 *
 * Section order and visibility come from the config when it names them (which
 * is how the admin panel's reorder/hide acts on an RST page); anything the
 * config does not mention keeps its position in the source.
 */
export function RstPage({
  source,
  config,
  applyOrder,
}: {
  source: string
  config: SiteConfig
  /** Only Home is reorderable; the editorial pages read in source order. */
  applyOrder?: boolean
}) {
  const sections = useMemo(() => {
    const parsed = parseRst(source)
    if (!applyOrder) return parsed
    const byId = new Map(parsed.map(sec => [sec.id, sec]))
    const ordered = config.sectionOrder.flatMap(id => {
      const sec = byId.get(id)
      if (!sec) return []
      byId.delete(id)
      return [sec]
    })
    return [...ordered, ...byId.values()]
  }, [source, applyOrder, config.sectionOrder])

  return (
    <>
      {sections
        .filter(sec => !config.hidden[sec.id])
        .map(sec => (
          <div key={sec.id} className="reveal" data-reveal="1">
            <RstSectionView section={sec} />
          </div>
        ))}
    </>
  )
}
