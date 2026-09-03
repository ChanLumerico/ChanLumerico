import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useVelog } from '../../hooks/useVelog'
import { fmtDate, plural, seriesIndexUrl, type SeriesRecord } from '../../velog'
import type { SeriesBlock } from '../types'
import s from './blocks.module.css'

interface CardProps {
  name: string
  slug?: string
  latest?: string
  count?: number
  when?: string
  note?: string
  onRetry?: () => void
}

function SeriesCard({ name, slug, latest, count, when, note, onRetry }: CardProps) {
  const inner = (
    <>
      <div className={s.seriesEyebrow}>Series</div>
      <div className={s.seriesName}>{name}</div>
      <div className={s.seriesLatest}>
        {note ?? (latest ? `Latest: ${latest}` : 'Loading…')}
      </div>
      <div className={s.seriesFoot}>
        <span className={s.seriesCount}>
          {count ? `${plural(count, 'post', 'posts')}${when ? ` · ${when}` : ''}` : ''}
        </span>
        <span className={s.seriesArrow} aria-hidden="true">
          →
        </span>
      </div>
    </>
  )

  if (onRetry) {
    return (
      <button type="button" className={`${s.seriesCard} hoverLift`} onClick={onRetry}>
        {inner}
      </button>
    )
  }
  if (slug) {
    return (
      <Link className={`${s.seriesCard} hoverLift`} to={`/series/${encodeURIComponent(slug)}`}>
        {inner}
      </Link>
    )
  }
  return <div className={s.seriesCard}>{inner}</div>
}

const cardFor = (rec: SeriesRecord) => {
  const first = rec.posts[0]
  return {
    name: rec.name,
    slug: rec.slug,
    latest: first ? first.cleanTitle || first.title : undefined,
    count: rec.posts.length,
    when: first ? fmtDate(first.date || first.dateText) : '',
  }
}

/**
 * `.. series::` — the velog series gallery.
 *
 * With no `:item:` lines the whitelisted series are discovered from the
 * author's `/series` page; with them, exactly those slugs are shown.
 */
export function Series({ block }: { block: SeriesBlock }) {
  const { client, feed, index, indexState, series } = useVelog()
  const declared = block.items.map(t => t.trim()).filter(Boolean)

  useEffect(() => {
    void client.ensureFeed()
  }, [client])

  useEffect(() => {
    // The feed is merged into each listing, so it is worth having first — but
    // a failed feed must not block the gallery.
    if (declared.length > 0) {
      for (const slug of declared) void client.ensureSeries(slug).catch(() => {})
    } else if (feed !== null) {
      void client.ensureIndex()
    }
    // `declared` is derived from the source text, which is stable per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, feed, declared.join(';')])

  const slugs = declared.length > 0 ? declared : (index ?? [])

  if (slugs.length === 0) {
    if (indexState === 'ready') {
      return (
        <div className={s.gallery}>
          <div className={s.seriesLatest}>No series to show yet.</div>
        </div>
      )
    }
    if (indexState === 'error') {
      return (
        <div className={s.feedEmpty}>
          Could not reach the velog series index right now.
          <div className={s.feedEmptyActions}>
            <button
              type="button"
              className="btnFilled"
              onClick={() => void client.retryIndex()}
            >
              Reload series
            </button>
            <a className="btnOutline" href={seriesIndexUrl()} target="_blank" rel="noopener">
              Open on velog
            </a>
          </div>
        </div>
      )
    }
    return (
      <div className={s.gallery} aria-busy="true">
        <SeriesCard name="Loading series…" />
      </div>
    )
  }

  return (
    <div className={s.gallery}>
      {slugs.map(slug => {
        const slot = series[slug]
        if (slot?.state === 'ready' && slot.record) {
          return <SeriesCard key={slug} {...cardFor(slot.record)} />
        }
        if (slot?.state === 'error') {
          return (
            <SeriesCard
              key={slug}
              name={slug.replace(/-/g, ' ')}
              note="Could not load this series. Tap to retry."
              onRetry={() => void client.retrySeries(slug)}
            />
          )
        }
        return <SeriesCard key={slug} name={slug.replace(/-/g, ' ')} />
      })}
    </div>
  )
}
