import { useState } from 'react'
import { useScrollFade } from '../hooks/useScrollFade'
import type { RailBlockKey, SiteConfig, SkillGroup } from '../config/types'
import { GitHubMark, InstagramMark } from './icons'
import s from './layout.module.css'

/** Reveal delays, verbatim from the prototype: 0, 140ms, 200ms. */
const DELAY: Record<RailBlockKey, string> = {
  profile: '0ms',
  focus: '140ms',
  skills: '200ms',
}

const asset = (path: string): string =>
  /^(https?:)?\/\//.test(path) ? path : `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

function Portrait({ src, alt, name }: { src: string; alt: string; name: string }) {
  const [broken, setBroken] = useState(false)
  const initials = name
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={s.portrait}>
      {broken ? (
        <span className={s.portraitFallback} aria-label={alt} role="img">
          {initials}
        </span>
      ) : (
        <img
          className={s.portraitImg}
          src={asset(src)}
          alt={alt}
          width={256}
          height={256}
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
    </div>
  )
}

function ProfileBlock({ config }: { config: SiteConfig }) {
  const { profile } = config
  return (
    <div>
      <Portrait src={profile.photo} alt={profile.photoAlt} name={profile.name} />
      <h1 className={s.name}>{profile.name}</h1>
      <p className={s.affiliation}>
        {profile.affiliation.map((line, i) => (
          <span key={line}>
            {i > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
      <p className={s.profileMeta}>{profile.meta}</p>
      <div className={s.links}>
        <a className="btnFilled" href={`mailto:${profile.email}`}>
          Email
        </a>
        <a
          className={`${s.iconBtn} ${s.github}`}
          href={profile.github}
          target="_blank"
          rel="noopener"
          aria-label="GitHub profile"
          title="GitHub"
        >
          <GitHubMark />
        </a>
        <a
          className={`${s.iconBtn} ${s.instagram}`}
          href={profile.instagram}
          target="_blank"
          rel="noopener"
          aria-label="Instagram profile"
          title="Instagram"
        >
          <InstagramMark />
        </a>
      </div>
    </div>
  )
}

function FocusBlock({ items }: { items: readonly string[] }) {
  return (
    <div className={s.focusBlock}>
      <div className="eyebrow">Focus</div>
      <div className={s.focusPills}>
        {items.map(t => (
          <span key={t} className={s.focusPill}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

function SkillScroller({ items }: { items: readonly string[] }) {
  const ref = useScrollFade<HTMLDivElement>()
  return (
    <div ref={ref} className={`${s.skillScroller} scrollfade`}>
      {items.map(t => (
        <div key={t} className={s.skillItem}>
          {t}
        </div>
      ))}
    </div>
  )
}

function SkillsBlock({ groups }: { groups: readonly SkillGroup[] }) {
  return (
    <div className={s.skillsBlock}>
      <div className="eyebrow">Skills</div>
      {groups.map(group => (
        <div key={group.label}>
          <div className={s.skillLabel}>{group.label}</div>
          {group.scroll ? (
            <SkillScroller items={group.items} />
          ) : (
            group.items.map(t => (
              <div key={t} className={s.skillItem}>
                {t}
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * The Home rail: profile, focus and skills, in the configured order, each
 * fading in on its own delay.
 *
 * Not sticky — only the topbar is `position: sticky` in the prototype, and
 * this is a port. See DESIGN.md §7 item 2.
 */
export function ProfileRail({ config }: { config: SiteConfig }) {
  const render = (key: RailBlockKey) => {
    if (config.hidden[`blk-${key}`]) return null
    const body =
      key === 'profile' ? (
        <ProfileBlock config={config} />
      ) : key === 'focus' ? (
        <FocusBlock items={config.focus} />
      ) : (
        <SkillsBlock groups={config.skills} />
      )
    return (
      <div
        key={key}
        className="reveal"
        data-reveal="1"
        style={{ '--reveal-delay': DELAY[key] } as React.CSSProperties}
      >
        {body}
      </div>
    )
  }

  return (
    <aside className={s.aside} aria-label="Profile">
      {config.blockOrder.map(render)}
    </aside>
  )
}
