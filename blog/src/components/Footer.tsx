import s from './layout.module.css'

export function Footer({ left, right }: { left: string; right: string }) {
  return (
    <footer className={`${s.footer} reveal`} data-reveal="1">
      <span className={s.footerText}>{left}</span>
      <span className={s.footerText}>{right}</span>
    </footer>
  )
}
