import { useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useAuthNotice } from '@/components/v2/auth-notice'
import { APP_URL, REPO_URL } from '@/lib/links'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'What it does' },
  { href: '#examples', label: 'Sources' },
]

/** px of scroll before the header turns solid. */
const SOLID_AT = 56
/** px of scroll before hide-on-scroll-down kicks in (keeps the header visible over the hero). */
const HIDE_AFTER = 480
/** Ignore jitter smaller than this when deciding scroll direction. */
const DELTA = 6
/** Optional behaviour. Set false to keep the header pinned. */
const HIDE_ON_SCROLL_DOWN = true

const SPRING = { type: 'spring', stiffness: 380, damping: 38, mass: 0.6 } as const

/**
 * Transparent over the video hero with white text; past SOLID_AT it springs in a frosted canvas
 * background (backdrop blur, hairline border, soft shadow) and switches to ink text.
 * Optional hide on scroll down / show on scroll up. Only opacity and transform animate (compositor only).
 */
export default function Nav() {
  const reduced = useReducedMotion()
  const { signIn } = useAuthNotice()
  const { scrollY } = useScroll()
  const [solid, setSolid] = useState(false)
  const [hidden, setHidden] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setSolid(y > SOLID_AT) // React bails out when the value is unchanged, so this is cheap
    if (!HIDE_ON_SCROLL_DOWN || reduced) return
    if (y > HIDE_AFTER && y - prev > DELTA) setHidden(true)
    else if (prev - y > DELTA || y <= HIDE_AFTER) setHidden(false)
  })

  const t = reduced ? { duration: 0 } : SPRING

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden ? '-100%' : '0%' }}
      transition={t}
      onFocusCapture={() => setHidden(false)}
      className={cn('fixed inset-x-0 top-0 z-50 transition-colors duration-300 ease-out', solid ? 'text-ink' : 'text-white')}
    >
      {/* frosted layer: opacity + slight slide only */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: solid ? 1 : 0, y: solid ? 0 : -8 }}
        transition={t}
        className="absolute inset-0 -z-10 border-b border-hair bg-canvas/85 shadow-[0_1px_0_rgba(0,0,0,.03),0_8px_24px_-12px_rgba(0,0,0,.14)] backdrop-blur-xl backdrop-saturate-150"
      />
      <nav aria-label="Primary" className="page flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="#top" className={cn('flex items-center gap-2 text-inherit hover:no-underline text-[17px] font-medium tracking-[-0.03em]', !solid && '[text-shadow:0_1px_10px_rgba(0,0,0,.35)]')}>
            <LogoMark className="h-[18px] w-[18px]" />Clarte
          </a>
          <ul className="hidden items-center gap-6 text-[13px] font-medium md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={cn('transition-colors duration-300 hover:no-underline',
                  solid ? 'text-ink/70 hover:text-ink' : 'text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,.45)] hover:text-white')}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2">
          <a href={REPO_URL} className={cn('btn hidden sm:inline-flex', solid ? 'hover:bg-g-100' : 'text-white/90 hover:bg-white/10')}>GitHub</a>
          <button type="button" onClick={signIn} className={cn('btn hidden sm:inline-flex', solid ? 'hover:bg-g-100' : 'text-white/90 hover:bg-white/10')}>Sign in</button>
          <a href={APP_URL} className={cn('btn', solid ? 'bg-ink text-canvas hover:bg-ink-hover' : 'bg-white text-ink hover:bg-g-100')}>Start talking</a>
        </div>
      </nav>
    </motion.header>
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
