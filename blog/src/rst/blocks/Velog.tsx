import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useVelog } from '../../hooks/useVelog'
import { fmtDate, velogUrl, type VelogPost } from '../../velog'
import type { VelogBlock } from '../types'
import s from './blocks.module.css'

function Row({ post, isLast }: { post: VelogPost; isLast: boolean }) {
  const when = fmtDate(post.date || post.dateText)
  return (
    <Link
      className={isLast ? `${s.postRow} ${s.postRowLast}` : s.postRow}
      to={post.slug ? `/post/${post.slug}` : '/writing'}
    >
      <span className={s.postDate}>{when}</span>
      <span className={s.postMid}>
        <span className={s.postTitle}>
          {post.series ? <span className={s.postSeriesTag}>{post.series}</span> : null}
          {post.cleanTitle || post.title}
        </span>
        {post.summary ? <span className={s.postSummary}>{post.summary}</span> : null}
      </span>
      <span className={s.postArrow} aria-hidden="true">
        →
      </span>
    </Link>
  )
}

/** Skeleton rows, matching the prototype's placeholder markup. */
function Skeleton() {
  const widths = ['260px', '220px', '240px']
  return (
    <>
      {widths.map((w, i) => (
        <div
          key={w}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '22px 0',
            borderTop: '1px solid var(--hairline)',
            borderBottom: i === widths.length - 1 ? '1px solid var(--hairline)' : undefined,
          }}
        >
          <span
            style={{
              flex: '0 0 96px',
              height: '12px',
              borderRadius: 'var(--r-chip)',
              background: 'var(--fog)',
            }}
          />
          <span
            style={{
              flex: `1 1 ${w}`,
              height: '14px',
              borderRadius: 'var(--r-bar)',
              background: 'var(--fog)',
            }}
          />
        </div>
      ))}
    </>
  )
}

/** `.. velog:: n` — the n newest whitelisted posts, live. */
export function Velog({ block }: { block: VelogBlock }) {
  const { client, feed, feedState } = useVelog()
  const limit = Number.parseInt(block.title, 10) || 4

  useEffect(() => {
    void client.ensureFeed()
  }, [client])

  const posts = client.latest(limit)

  if (feed === null && feedState !== 'error') {
    return (
      <div className={s.layoutList} aria-busy="true">
        <Skeleton />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className={s.layoutList}>
        <div className={s.feedEmpty}>
          Could not reach the velog feed right now. Open the archive on velog.io.
          <div className={s.feedEmptyActions}>
            <a className="btnOutline" href={velogUrl('/')} target="_blank" rel="noopener">
              Velog archive
            </a>
            <button type="button" className="btnFilled" onClick={() => void client.retryFeed()}>
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.layoutList}>
      {posts.map((p, i) => (
        <Row key={p.slug || p.href} post={p} isLast={i === posts.length - 1} />
      ))}
    </div>
  )
}
