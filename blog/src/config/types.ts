export const ACCENT_KEYS = [
  'blue',
  'purple',
  'pink',
  'red',
  'orange',
  'green',
  'graphite',
] as const

export type AccentKey = (typeof ACCENT_KEYS)[number]

/**
 * Apple's system accent set (the macOS Settings highlight colours), each
 * paired with a deeper step for links and outlines on a white ground.
 */
export const ACCENTS: Readonly<Record<AccentKey, readonly [string, string]>> = {
  blue: ['#0071e3', '#0066cc'],
  purple: ['#9F4BC4', '#8236A8'],
  pink: ['#E0347C', '#C21E66'],
  red: ['#D70015', '#B00013'],
  orange: ['#C93400', '#A32A00'],
  green: ['#248A3D', '#1D7333'],
  graphite: ['#48484A', '#3A3A3C'],
}

export type SidebarSide = 'left' | 'right'

export type RailBlockKey = 'profile' | 'focus' | 'skills'

export const RAIL_BLOCKS = ['profile', 'focus', 'skills'] as const

export const RAIL_LABELS: Readonly<Record<RailBlockKey, string>> = {
  profile: 'Profile',
  focus: 'Focus',
  skills: 'Skills',
}

export interface Profile {
  name: string
  /** Relative to the Vite base; resolved through `import.meta.env.BASE_URL`. */
  photo: string
  photoAlt: string
  /** Each entry becomes one line of the affiliation block. */
  affiliation: string[]
  meta: string
  email: string
  github: string
  instagram: string
}

export interface SkillGroup {
  label: string
  items: string[]
  /** Long groups get the scroll-faded panel the prototype gives Coursework. */
  scroll?: boolean
}

export interface SiteConfig {
  accent: AccentKey
  side: SidebarSide
  profile: Profile
  focus: string[]
  skills: SkillGroup[]
  blockOrder: RailBlockKey[]
  /** RST section ids, in the order they should appear on Home. */
  sectionOrder: string[]
  /** Keyed by RST section id, or `blk-<rail block>` for a rail block. */
  hidden: Record<string, boolean>
  footer: { left: string; right: string }
}

/** What the admin layer holds in memory: config plus the three page sources. */
export interface SiteDraft {
  config: SiteConfig
  pages: Record<PageKey, string>
}

export const PAGE_KEYS = ['main', 'research', 'writing'] as const
export type PageKey = (typeof PAGE_KEYS)[number]

export const PAGE_LABELS: Readonly<Record<PageKey, string>> = {
  main: 'Home',
  research: 'Research',
  writing: 'Writings',
}
