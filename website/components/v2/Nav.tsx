import { useEffect, useState } from 'react'
import { APP_URL, REPO_URL } from '@/lib/links'
import { cn } from '@/lib/utils'
import { useAuthNotice } from '@/components/v2/auth-notice'

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'What it does' },
  { href: '#examples', label: 'Sources' },
]

/** Lightspark-style nav: 13px links, 32px buttons. White over the video hero, ink + canvas blur after scroll. */
export default function Nav() {
  const [solid, setSolid] = useState(false)
  const { signIn } = useAuthNotice()
  useEffect(() => {
    const on = () => setSolid(window.scrollY > window.innerHeight * 0.75)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-colors duration-300', solid ? 'text-ink' : 'text-white')}>
      <div aria-hidden className={cn('absolute inset-0 -z-10 transition-opacity duration-300', solid ? 'opacity-100' : 'opacity-0')}
        style={{ background: 'linear-gradient(#F8F8F7 0%, rgba(248,248,247,.85) 70%, rgba(248,248,247,0))', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', maskImage: 'linear-gradient(#000 60%, transparent)', WebkitMaskImage: 'linear-gradient(#000 60%, transparent)' }} />
      <nav aria-label="Primary" className="page flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="#top" className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.03em]">
            <LogoMark className="h-[18px] w-[18px]" />Clarte
          </a>
          <ul className="hidden items-center gap-6 text-[13px] md:flex">
            {LINKS.map((l) => (
              <li key={l.href}><a href={l.href} className={cn('transition-opacity hover:opacity-100', solid ? 'opacity-70' : 'opacity-80')}>{l.label}</a></li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2">
          <a href={REPO_URL} className={cn('btn hidden sm:inline-flex', solid ? 'hover:bg-g-100' : 'hover:bg-white/10')}>GitHub</a>
          <button type="button" onClick={signIn} className={cn('btn hidden sm:inline-flex', solid ? 'hover:bg-g-100' : 'hover:bg-white/10')}>Sign in</button>
          <a href={APP_URL} className={cn('btn', solid ? 'bg-ink text-canvas hover:bg-ink-hover' : 'bg-white text-ink hover:bg-g-100')}>Start talking</a>
        </div>
      </nav>
    </header>
  )
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="10" r="8.3" />
      <circle cx="10" cy="10" r="2.2" fill="currentColor" stroke="none" />
      <path d="M10 1.7v3.6M10 14.7v3.6M1.7 10h3.6M14.7 10h3.6" strokeLinecap="round" />
    </svg>
  )
}
