import { RstPage } from './RstPage'
import type { SiteConfig } from '../config/types'

export default function Research({ source, config }: { source: string; config: SiteConfig }) {
  return <RstPage source={source} config={config} />
}
