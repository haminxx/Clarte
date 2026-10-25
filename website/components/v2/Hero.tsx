import { ArrowUpRight, Mic } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import Floating, { FloatingElement } from '@/components/ui/parallax-floating'
import { GoogleG } from '@/components/landing/icons'
import { useAuthNotice } from '@/components/v2/auth-notice'
import { APP_URL } from '@/lib/links'

const POSTER = '/video/hero-blueprint-poster.webp'

/**
 * Full-bleed blueprint video hero. The source is a 10s pan, played as a 20s ping-pong loop.
 * Readability: CSS filter dims the bright traces, a ~60% radial scrim sits behind the headline,
 * plus a vignette and a bottom fade into the canvas. Reduced motion shows the poster only.
 */
export default function Hero() {
  const reduced = useReducedMotion()
  const { signIn } = useAuthNotice()
  return (
    <section id="top" className="relative isolate flex min-h-[640px] items-center overflow-hidden bg-[#05080d] text-white" style={{ height: '100svh' }}>
      <div aria-hidden className="absolute inset-0 -z-10">
        {reduced ? (
          <img src={POSTER} alt="" className="h-full w-full object-cover" style={{ filter: 'brightness(.72) saturate(.75)' }} />
        ) : (
          <video className="h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata" poster={POSTER}
            style={{ filter: 'brightness(.72) saturate(.75)' }}>
            <source src="/video/hero-blueprint.mp4" type="video/mp4" />
          </video>
        )}
        {/* base tint */}
        <div className="absolute inset-0 bg-[#05080d]/35" />
        {/* scrim behind the headline */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 50%, rgba(5,8,13,.62) 0%, rgba(5,8,13,.45) 50%, rgba(5,8,13,0) 100%)' }} />
        {/* vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,.6) 100%)' }} />
        {/* top shade for the nav, bottom fade into the canvas */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-[#F8F8F7]/30 to-[#F8F8F7]" />
      </div>

      <Floating sensitivity={-0.6} className="pointer-events-none hidden lg:block">
        <FloatingElement depth={0.6} className="left-[6%] top-[24%]">
          <div className="glass-dark w-[236px] p-3 text-left">
            <p className="font-mono text-[9px] uppercase tracking-[.08em] text-white/60">Clarte · listening</p>
            <p className="mt-2 text-[13px] leading-[1.35] text-white/90">Why do you think the battery overheats on long flights?</p>
          </div>
        </FloatingElement>
        <FloatingElement depth={1.1} className="right-[6%] top-[28%]">
          <div className="glass-dark w-[252px] p-3 text-left">
            <p className="font-mono text-[9px] uppercase tracking-[.08em] text-white/60">Source · example</p>
            <p className="mt-2 flex items-start justify-between gap-2 text-[13px] leading-[1.35] text-white/90">NASA T2 patent · passive thermal control for small spacecraft<ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/60" /></p>
          </div>
        </FloatingElement>
        <FloatingElement depth={0.8} className="bottom-[20%] left-[10%]">
          <div className="glass-dark flex items-center gap-2 px-3 py-2 text-[12px] text-white/85">
            satellite thermal control<span className="text-white/40">↔</span>drone battery
          </div>
        </FloatingElement>
        <FloatingElement depth={1.4} className="bottom-[22%] right-[9%]">
          <div className="glass-dark w-[232px] p-3 text-left">
            <p className="font-mono text-[9px] uppercase tracking-[.08em] text-white/60">Counterpoint</p>
            <p className="mt-2 text-[13px] leading-[1.35] text-white/90">NASA already patented this. What makes yours different?</p>
          </div>
        </FloatingElement>
      </Floating>

      <div className="page relative flex flex-col items-center text-center">
        <h1 className="max-w-[900px] text-[36px] font-normal leading-[1.12] tracking-[-0.04em] [text-shadow:0_2px_24px_rgba(0,0,0,.45)] sm:text-[44px] lg:text-[56px]">
          Think out loud.<br />Find the technology that already exists.
        </h1>
        <p className="mt-5 max-w-[520px] text-[15px] leading-[1.5] text-white/80 [text-shadow:0_1px_12px_rgba(0,0,0,.5)]">
          Clarte is a voice brainstorm partner backed by a living map of papers and patents. It asks why, connects your problem to technology from other fields, argues back, and cites every source.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row">
          <a href={APP_URL} className="btn h-10 bg-white px-4 text-[14px] text-ink hover:bg-g-100"><Mic className="h-4 w-4" aria-hidden />Start talking</a>
          <button type="button" onClick={signIn} className="btn h-10 border border-white/20 bg-white/10 px-4 text-[14px] text-white backdrop-blur-md hover:bg-white/20"><GoogleG className="h-4 w-4" />Continue with Google</button>
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[.08em] text-white/55">Free · Open source · Every claim has a link</p>
      </div>
    </section>
  )
}
