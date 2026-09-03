import { useState } from 'react'
import type { EmbedBlock } from '../types'
import s from './blocks.module.css'

const videoId = (url: string): string => url.match(/[\w-]{8,}$/)?.[0] ?? ''

/**
 * `.. embed::` — a YouTube poster that links out.
 *
 * Embedding can be refused outright (Error 153 is a referrer/permission
 * rejection, not something an origin check can predict), so the poster is a
 * plain link to YouTube: the block can never render a third-party error.
 */
export function Embed({ block }: { block: EmbedBlock }) {
  const id = videoId(block.title)
  const [poster, setPoster] = useState(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`)
  const fallback = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

  return (
    <figure className={`${s.figure} ${s.figureTight}`}>
      <div className={s.embedFrame}>
        <img
          className={s.poster}
          src={poster}
          alt={block.caption || 'Video poster'}
          width={1280}
          height={720}
          onError={() => setPoster(p => (p === fallback ? p : fallback))}
        />
        <a
          className={s.play}
          href={`https://www.youtube.com/watch?v=${id}`}
          target="_blank"
          rel="noopener"
          aria-label="Watch on YouTube"
        >
          <span className={s.playDot}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#1d1d1f" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </a>
        <span className={s.embedBadge}>Watch on YouTube</span>
      </div>
      {block.caption ? <figcaption className={s.caption}>{block.caption}</figcaption> : null}
    </figure>
  )
}
