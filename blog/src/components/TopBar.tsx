import { Link, useLocation } from 'react-router-dom'
import { PAGE_LABELS } from '../config/types'
import s from './layout.module.css'

/** `series/*` and `post/*` highlight Writings, which is where they live. */
const activeTab = (pathname: string): string => {
  const path = pathname.replace(/^\//, '')
  if (path.startsWith('series/') || path.startsWith('post/')) return 'writing'
  if (path === 'research' || path === 'writing') return path
  return 'main'
}

export function TopBar() {
  const active = activeTab(useLocation().pathname)
  return (
    <div className={s.barShell}>
      <div className={s.bar}>
        <Link className={s.brand} to="/">
          Chan Lee
        </Link>
        <nav className={s.nav} aria-label="Sections">
          {(['research', 'writing'] as const).map(key => {
            const on = active === key
            return (
              <Link
                key={key}
                className={on ? `${s.navLink} ${s.navLinkActive}` : s.navLink}
                to={`/${key}`}
                {...(on ? { 'aria-current': 'page' as const } : {})}
              >
                {PAGE_LABELS[key]}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
