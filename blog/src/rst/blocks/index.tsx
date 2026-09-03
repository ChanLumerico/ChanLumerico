import type { RstBlock } from '../types'
import { Card } from './Card'
import { Diagram } from './Diagram'
import { Divider } from './Divider'
import { Embed } from './Embed'
import { Entry } from './Entry'
import { Field } from './Field'
import { Figure } from './Figure'
import { Lede } from './Lede'
import { Para } from './Para'
import { Pills } from './Pills'
import { Post } from './Post'
import { Quote } from './Quote'
import { Refs } from './Refs'
import { Series } from './Series'
import { Stats } from './Stats'
import { Unknown } from './Unknown'
import { Velog } from './Velog'

/**
 * One component per block type. `isLast` matters only for the row blocks,
 * which drop their bottom rule at the end of a list.
 */
export function RstBlockView({ block, isLast }: { block: RstBlock; isLast: boolean }) {
  switch (block.type) {
    case 'card':
      return <Card block={block} />
    case 'para':
      return <Para block={block} />
    case 'divider':
      return <Divider />
    case 'lede':
      return <Lede block={block} />
    case 'quote':
      return <Quote block={block} />
    case 'stats':
      return <Stats block={block} />
    case 'field':
      return <Field block={block} />
    case 'diagram':
      return <Diagram block={block} />
    case 'embed':
      return <Embed block={block} />
    case 'figure':
      return <Figure block={block} />
    case 'refs':
      return <Refs block={block} />
    case 'series':
      return <Series block={block} />
    case 'velog':
      return <Velog block={block} />
    case 'pills':
      return <Pills block={block} />
    case 'entry':
      return <Entry block={block} isLast={isLast} />
    case 'post':
      return <Post block={block} isLast={isLast} />
    case 'unknown':
      return <Unknown block={block} />
  }
}

export {
  Card,
  Diagram,
  Divider,
  Embed,
  Entry,
  Field,
  Figure,
  Lede,
  Para,
  Pills,
  Post,
  Quote,
  Refs,
  Series,
  Stats,
  Unknown,
  Velog,
}
