import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Crumbs } from '../components/Crumbs'
import { useVelog } from '../hooks/useVelog'
import { fmtDate, plural, seriesIndexUrl, seriesUrl } from '../velog'
import s from './routes.module.css'

/** `#/series/<slug>` — the full post list for one velog series. */
export default function SeriesPage() {
  const raw = useParams().slug ?? ''
  const slug = decodeURIComponent(raw)
  const { client, feed, series } = useVelog()
  const slot = series[slug]
  const record = slot?.record

  useEffect(() => {
    void client.ensureFeed()
  }, [client])

  useEffect(() => {
    // A failure stays terminal until the user retries, so a re-render cannot
    // re-enter the load and spin the main thread.
    if (!slot || slot.state === 'idle') void client.ensureSeries(slug, true).catch(() => {})
    // The feed is merged into the listing, so a late feed is worth a reload.
  }, [client, slug, slot, feed])

  const name = record?.name ?? slug.replace(/-/g, ' ')
  const posts = record?.posts ?? []
  const pending = slot === undefined || slot.state === 'loading'

  return (
    <section>
      <Crumbs trail={[{ label: 'Writings', to: '/writing' }, { label: name }]} />
      <h1 className={s.seriesTitle}>{name}</h1>
      <p className={s.seriesNote}>
        {posts.length > 0 ? plural(posts.length, 'post', 'posts') : pending ? 'Loading…' : ''}
      </p>

      {posts.length === 0 && !pending ? (
        <div className={s.errorBox}>
          <p className={s.notice}>Could not load this series.</p>
          <div className={s.errorActions}>
            <button
              type="button"
              className="btnFilled"
              onClick={() => void client.retrySeries(slug)}
            >
              Try again
            </button>
            <a className="btnOutline" href={seriesUrl(slug)} target="_blank" rel="noopener">
              Open on velog
            </a>
          </div>
        </div>
      ) : null}

      <div className={s.seriesList}>
        {posts.map((p, i) => (
          <Link
            key={p.slug || p.href}
            className={
              i === posts.length - 1 ? `${s.seriesRow} ${s.seriesRowLast}` : s.seriesRow
            }
            to={`/post/${p.slug}`}
          >
            <span className={s.seriesIndex}>
              {String(p.n || posts.length - i).padStart(2, '0')}
            </span>
            <span className={s.seriesMid}>
              <span className={s.seriesRowTitle}>{p.cleanTitle || p.title}</span>
              {p.summary ? <span className={s.seriesRowSummary}>{p.summary}</span> : null}
              <span className={s.seriesRowDate}>{fmtDate(p.date || p.dateText)}</span>
            </span>
            <span className={s.seriesRowArrow} aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>

      {posts.length > 0 ? (
        <div className={s.seriesMore}>
          <a
            className="btnOutline"
            href={record ? seriesUrl(record.slug) : seriesIndexUrl()}
            target="_blank"
            rel="noopener"
          >
            This series on velog
          </a>
        </div>
      ) : null}
    </section>
  )
}
