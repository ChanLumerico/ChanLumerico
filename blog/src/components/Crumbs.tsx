import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import s from './layout.module.css'

export interface Crumb {
  label: string
  /** A step with no `to` renders unlinked — the tail, or an unresolved series. */
  to?: string
}

export function Crumbs({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav className={s.crumbs} aria-label="Breadcrumb">
      {trail.map((step, i) => (
        <Fragment key={`${step.label}-${i}`}>
          {i > 0 ? (
            <span className={s.crumbSep} aria-hidden="true">
              /
            </span>
          ) : null}
          {step.to ? (
            <Link className={s.crumbLink} to={step.to}>
              {step.label}
            </Link>
          ) : (
            <span className={s.crumbTail} aria-current="page">
              {step.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
