/** Typed AST for the RST-flavoured page DSL. */

export type Layout = 'grid' | 'stack' | 'list'

export interface RstLink {
  label: string
  href: string
}

/** Fields every directive block carries, whether or not it uses them. */
interface BlockBase {
  /** `:link: Label <url>` — repeatable. */
  links: RstLink[]
  /** `:tag:` — repeatable. */
  tags: string[]
  /** `:bullet:` — repeatable. */
  bullets: string[]
  /** `:item:` — repeatable. */
  items: string[]
  /** Indented continuation lines, whitespace-collapsed. */
  body: string
  /** Any `:key: value` the parser did not special-case. */
  opts: Readonly<Record<string, string>>
}

export interface CardBlock extends BlockBase {
  type: 'card'
  title: string
  num?: string
  meta?: string
}

export interface ParaBlock {
  type: 'para'
  body: string
}

export interface DividerBlock {
  type: 'divider'
}

export interface LedeBlock extends BlockBase {
  type: 'lede'
  title: string
}

export interface QuoteBlock extends BlockBase {
  type: 'quote'
  title: string
  cite?: string
}

export interface StatsBlock extends BlockBase {
  type: 'stats'
  title: string
}

export interface FieldBlock extends BlockBase {
  type: 'field'
  title: string
}

export interface DiagramBlock extends BlockBase {
  type: 'diagram'
  title: string
  cite?: string
}

export interface EmbedBlock extends BlockBase {
  type: 'embed'
  /** The video URL — the directive argument. */
  title: string
  caption?: string
}

export interface FigureBlock extends BlockBase {
  type: 'figure'
  title: string
  id?: string
  ratio?: string
  placeholder?: string
  src?: string
}

export interface RefsBlock extends BlockBase {
  type: 'refs'
  title: string
}

export interface SeriesBlock extends BlockBase {
  type: 'series'
  title: string
}

export interface VelogBlock extends BlockBase {
  type: 'velog'
  /** The post count — the directive argument. */
  title: string
}

export interface PillsBlock extends BlockBase {
  type: 'pills'
  title: string
}

export interface EntryBlock extends BlockBase {
  type: 'entry'
  title: string
  date?: string
  org?: string
}

export interface PostBlock extends BlockBase {
  type: 'post'
  title: string
  date?: string
  href?: string
}

/** A directive whose name has no dedicated renderer. */
export interface UnknownBlock extends BlockBase {
  type: 'unknown'
  name: string
  title: string
}

export type RstBlock =
  | CardBlock
  | ParaBlock
  | DividerBlock
  | LedeBlock
  | QuoteBlock
  | StatsBlock
  | FieldBlock
  | DiagramBlock
  | EmbedBlock
  | FigureBlock
  | RefsBlock
  | SeriesBlock
  | VelogBlock
  | PillsBlock
  | EntryBlock
  | PostBlock
  | UnknownBlock

export interface RstSection {
  title: string
  id: string
  layout: Layout
  blocks: RstBlock[]
}

/** Directive names that get their own component. */
export const KNOWN_BLOCKS = [
  'card',
  'lede',
  'quote',
  'stats',
  'field',
  'diagram',
  'embed',
  'figure',
  'refs',
  'series',
  'velog',
  'pills',
  'entry',
  'post',
] as const

export type KnownBlockName = (typeof KNOWN_BLOCKS)[number]
