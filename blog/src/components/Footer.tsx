import { Reveal } from './Reveal'
import s from './layout.module.css'

export function Footer({ left, right }: { left: string; right: string }) {
  return (
    <Reveal>
      <footer className={s.footer}>
        <span className={s.footerText}>{left}</span>
        <span className={s.footerText}>{right}</span>
      </footer>
    </Reveal>
  )
}
