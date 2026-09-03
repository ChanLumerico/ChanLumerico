import rawConfig from '../content/config.json'
import mainRst from '../content/main.rst?raw'
import researchRst from '../content/research.rst?raw'
import writingRst from '../content/writing.rst?raw'
import {
  ACCENTS,
  PAGE_KEYS,
  RAIL_BLOCKS,
  type AccentKey,
  type PageKey,
  type RailBlockKey,
  type SiteConfig,
  type SiteDraft,
  type SkillGroup,
} from './types'

/** The `.rst` files in the repo are the content of record. */
export const BUILTIN_PAGES: Readonly<Record<PageKey, string>> = {
  main: mainRst,
  research: researchRst,
  writing: writingRst,
}

const str = (v: unknown, fallback: string): string =>
  typeof v === 'string' && v.trim() ? v : fallback

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

/**
 * A hand-edited or older config can be stale, partial, or wrong — normalise
 * it so a bad value can never hide a section or crash a render.
 */
export const normaliseConfig = (raw: unknown): SiteConfig => {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const base = rawConfig as unknown as SiteConfig

  const profileSrc = (src.profile ?? {}) as Record<string, unknown>
  const profile = {
    name: str(profileSrc.name, base.profile.name),
    photo: str(profileSrc.photo, base.profile.photo),
    photoAlt: str(profileSrc.photoAlt, base.profile.photoAlt),
    affiliation: strList(profileSrc.affiliation).length
      ? strList(profileSrc.affiliation)
      : base.profile.affiliation,
    meta: str(profileSrc.meta, base.profile.meta),
    email: str(profileSrc.email, base.profile.email),
    github: str(profileSrc.github, base.profile.github),
    instagram: str(profileSrc.instagram, base.profile.instagram),
  }

  const accent = (
    typeof src.accent === 'string' && src.accent in ACCENTS ? src.accent : 'blue'
  ) as AccentKey

  const side = src.side === 'right' ? 'right' : 'left'

  // Reconcile: drop anything unknown, then append anything missing, so a
  // stale list can neither hide a rail block nor duplicate one.
  const blockOrder = ((): RailBlockKey[] => {
    const wanted = strList(src.blockOrder).filter((k): k is RailBlockKey =>
      (RAIL_BLOCKS as readonly string[]).includes(k)
    )
    for (const k of RAIL_BLOCKS) if (!wanted.includes(k)) wanted.push(k)
    return wanted
  })()

  const skills: SkillGroup[] = Array.isArray(src.skills)
    ? (src.skills as Record<string, unknown>[])
        .map(g => ({
          label: str(g.label, ''),
          items: strList(g.items),
          scroll: g.scroll === true,
        }))
        .filter(g => g.label && g.items.length > 0)
    : base.skills

  const hiddenSrc = (src.hidden ?? {}) as Record<string, unknown>
  const hidden: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(hiddenSrc)) if (v === true) hidden[k] = true

  const footerSrc = (src.footer ?? {}) as Record<string, unknown>

  return {
    accent,
    side,
    profile,
    focus: strList(src.focus).length ? strList(src.focus) : base.focus,
    skills,
    blockOrder,
    sectionOrder: strList(src.sectionOrder).length
      ? strList(src.sectionOrder)
      : base.sectionOrder,
    hidden,
    footer: {
      left: str(footerSrc.left, base.footer.left),
      right: str(footerSrc.right, base.footer.right),
    },
  }
}

export const normalisePages = (raw: unknown): Record<PageKey, string> => {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out = { ...BUILTIN_PAGES } as Record<PageKey, string>
  for (const key of PAGE_KEYS) {
    const value = src[key]
    // An empty buffer is never a real edit — it would blank the page.
    if (typeof value === 'string' && value.trim()) out[key] = value
  }
  return out
}

export const BUILTIN_CONFIG: SiteConfig = normaliseConfig(rawConfig)

export const BUILTIN_DRAFT: SiteDraft = {
  config: BUILTIN_CONFIG,
  pages: { ...BUILTIN_PAGES },
}
