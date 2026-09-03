import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Crumbs, type Crumb } from '../components/Crumbs'
import { loadTypeset } from '../components/katex'
import { useVelog } from '../hooks/useVelog'
import { fmtDate, repairMath, sanitiseHtml } from '../velog'
import '../styles/article.css'
import s from './routes.module.css'

type Body =
  { state: 'loading' } | { state: 'error' } | { state: 'ready'; html: string; typeset: boolean }

/** `#/post/<slug>` — the article, read in-page. */
export default function PostPage() {
  const raw = useParams().slug ?? ''
  const { client, feed, series } = useVelog()
  const [body, setBody] = useState<Body>({ state: 'loading' })
  const articleRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    void client.ensureFeed()
  }, [client])

  const post = client.findPost(raw)

  // Resolve the body: a feed-sourced post already carries one, anything else
  // needs its own page fetched.
  useEffect(() => {
    if (!post) {
      setBody({ state: 'loading' })
      return
    }
    if (post.content) {
      setBody({
        state: 'ready',
        html: sanitiseHtml(repairMath(post.content)),
        typeset: true,
      })
      return
    }
    let live = true
    setBody({ state: 'loading' })
    client
      .fetchArticle(post.href)
      .then(res => {
        // A late response must not paint over a page the user has left.
        if (live) setBody({ state: 'ready', html: res.html, typeset: res.typeset })
      })
      .catch(() => {
        if (live) setBody({ state: 'error' })
      })
    return () => {
      live = false
    }
  }, [client, post?.href, post?.content, post])

  // KaTeX arrives only here, and only when there is math left to render.
  useEffect(() => {
    if (body.state !== 'ready' || !body.typeset) return
    const node = articleRef.current
    if (!node) return
    let live = true
    void loadTypeset().then(typeset => {
      if (live && articleRef.current) typeset(articleRef.current)
    })
    return () => {
      live = false
    }
  }, [body])

  const seriesSlug = post ? post.seriesSlug || client.slugForSeriesName(post.series) : ''
  const trail: Crumb[] = [{ label: 'Writings', to: '/writing' }]
  if (post && (seriesSlug || post.series)) {
    trail.push(
      seriesSlug
        ? {
            label: series[seriesSlug]?.record?.name || post.series || seriesSlug,
            to: `/series/${encodeURIComponent(seriesSlug)}`,
          }
        : { label: post.series }
    )
  }
  trail.push({ label: post ? post.cleanTitle || post.title : 'Post' })

  if (!post) {
    return (
      <section>
        <Crumbs trail={trail} />
        <p className={s.notice}>
          {feed === null ? 'Loading…' : 'That post is not in the current feed.'}
        </p>
      </section>
    )
  }

  const when = fmtDate(post.date || post.dateText)

  return (
    <section>
      <Crumbs trail={trail} />
      {when ? (
        <div className={s.postMeta}>
          <span className={s.postMetaText}>{when}</span>
        </div>
      ) : null}
      <h1 className={s.postTitle}>{post.cleanTitle || post.title}</h1>

      {body.state === 'ready' ? (
        <div
          ref={articleRef}
          className={`${s.articleWrap} article`}
          // Sanitised in the velog layer: scripts, styles and frames are
          // stripped, links forced to noopener, images made lazy.
          dangerouslySetInnerHTML={{ __html: body.html }}
        />
      ) : body.state === 'error' ? (
        <p className={s.notice}>Could not load this post right now. Open it on velog below.</p>
      ) : (
        <p className={s.notice}>Loading the post…</p>
      )}

      <div className={s.postFoot}>
        <a className="btnOutline" href={post.href} target="_blank" rel="noopener">
          Read on velog
        </a>
        {seriesSlug ? (
          <a className="btnQuiet" href={`#/series/${encodeURIComponent(seriesSlug)}`}>
            ← Back to {series[seriesSlug]?.record?.name || post.series || seriesSlug}
          </a>
        ) : null}
      </div>
    </section>
  )
}
