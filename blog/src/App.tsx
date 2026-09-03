import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { adminEnabled } from './components/admin/gate'
import { useSiteDraft } from './components/admin/useSiteDraft'
import { Footer } from './components/Footer'
import { ProfileRail } from './components/ProfileRail'
import { TopBar } from './components/TopBar'
import { PAGE_LABELS } from './config/types'
import { useAccent } from './hooks/useAccent'
import { useDocumentTitle } from './hooks/useDocumentTitle'
import type { SiteConfig, PageKey } from './config/types'
import layout from './components/layout.module.css'
import './styles/global.css'

const Home = lazy(() => import('./routes/Home'))
const Research = lazy(() => import('./routes/Research'))
const Writing = lazy(() => import('./routes/Writing'))
const SeriesPage = lazy(() => import('./routes/SeriesPage'))
const PostPage = lazy(() => import('./routes/PostPage'))

// Gated *and* code-split: a visitor never downloads the editing UI.
const AdminLayer = lazy(() => import('./components/admin/AdminLayer'))

/**
 * Writing and everything nested under it — a series, a post — plus Research
 * run full-width: the profile rail belongs to the CV, not to the reading
 * views.
 */
const isReadingRoute = (pathname: string): boolean => {
  const path = pathname.replace(/^\//, '')
  return (
    path === 'writing' ||
    path === 'research' ||
    path.startsWith('series/') ||
    path.startsWith('post/')
  )
}

const titleFor = (pathname: string): string | null => {
  const path = pathname.replace(/^\//, '')
  if (path === 'research') return PAGE_LABELS.research
  if (path === 'writing' || path.startsWith('series/') || path.startsWith('post/')) {
    return PAGE_LABELS.writing
  }
  return null
}

function Shell({
  config,
  pages,
}: {
  config: SiteConfig
  pages: Readonly<Record<PageKey, string>>
}) {
  const { pathname } = useLocation()
  const reading = isReadingRoute(pathname)

  useAccent(config.accent)
  useDocumentTitle(titleFor(pathname))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const pageClass = [layout.page, config.side === 'right' ? layout.pageRight : '']
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <TopBar />
      <div id="top" className={pageClass}>
        {reading ? null : <ProfileRail config={config} />}
        <main className={reading ? `${layout.main} ${layout.mainRead}` : layout.main}>
          <Suspense fallback={<div style={{ minHeight: '50vh' }} aria-busy="true" />}>
            <Routes>
              <Route path="/" element={<Home source={pages.main} config={config} />} />
              <Route
                path="/research"
                element={<Research source={pages.research} config={config} />}
              />
              <Route
                path="/writing"
                element={<Writing source={pages.writing} config={config} />}
              />
              <Route path="/series/:slug" element={<SeriesPage />} />
              <Route path="/post/:slug" element={<PostPage />} />
              {/* Anything unrecognised is Home, as in the prototype. */}
              <Route path="*" element={<Home source={pages.main} config={config} />} />
            </Routes>
          </Suspense>
          <Footer left={config.footer.left} right={config.footer.right} />
        </main>
      </div>
    </>
  )
}

function Site() {
  const draft = useSiteDraft()
  return (
    <>
      <Shell config={draft.config} pages={draft.pages} />
      {adminEnabled() ? (
        <Suspense fallback={null}>
          <AdminLayer />
        </Suspense>
      ) : null}
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Site />
    </HashRouter>
  )
}
