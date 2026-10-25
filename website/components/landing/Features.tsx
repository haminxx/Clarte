import type { ReactNode } from 'react'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { cn } from '@/lib/utils'
import { SectionHead, Reveal } from './Reveal'
import { DOMAINS } from './ConstellationGraph'

function Cell({ className, title, body, visual }: { className?: string; title: string; body: string; visual?: ReactNode }) {
  return (
    <Reveal className={cn('h-full', className)}>
      <div className="relative h-full rounded-2xl border border-line p-1.5">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
        <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-surface p-6">
          {visual}
          <h3 className="mt-auto pt-6 text-[20px] font-semibold leading-7 text-ink">{title}</h3>
          <p className="mt-2 text-[15px] leading-6 text-muted">{body}</p>
        </div>
      </div>
    </Reveal>
  )
}

function MiniGraph() {
  const pts = Array.from({ length: 38 }, (_, i) => {
    const a = i * 2.39996, r = 18 + (i % 7) * 11
    return { x: 160 + Math.cos(a) * r * 1.5, y: 80 + Math.sin(a) * r * 0.8, d: i % 5 }
  })
  return (
    <svg viewBox="0 0 320 160" className="h-40 w-full" aria-hidden>
      {pts.slice(1).map((p, i) => (
        <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} stroke={i % 9 === 0 ? '#5EEAD4' : '#23272E'} strokeDasharray={i % 9 === 0 ? '3 3' : undefined} />
      ))}
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i % 9 === 0 ? 3.5 : 2.2} fill={DOMAINS[p.d].color} opacity={0.9} />)}
    </svg>
  )
}

function OrbTranscript() {
  return (
    <div className="flex items-start gap-4" aria-hidden>
      <div className="mt-1 h-14 w-14 shrink-0 animate-orb-pulse rounded-full bg-[radial-gradient(circle_at_35%_30%,#c4cffd,#7C9CFF_45%,#A78BFA_75%,transparent)] shadow-[0_0_40px_-6px_rgba(124,156,255,.7)]" />
      <div className="space-y-2 text-[13px] leading-5">
        <p className="rounded-xl rounded-tl-sm border border-line bg-bg/70 px-3 py-2 text-ink">You said the pack overheats on long flights. Why does heat build up there?</p>
        <p className="ml-6 rounded-xl rounded-tr-sm bg-surface-2 px-3 py-2 text-muted">The cells are packed tight, no airflow.</p>
      </div>
    </div>
  )
}

export default function Features() {
  return (
    <section className="py-20 md:py-32" aria-labelledby="features">
      <div className="mx-auto max-w-container px-4 md:px-6">
        <SectionHead id="features" eyebrow="Features" title="Built for people who check the footnotes." />
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-12">
          <Cell className="md:col-span-7" title="A living map of technology." body="Every paper and patent is a node. Related work clusters by meaning, and cross-domain links glow." visual={<MiniGraph />} />
          <Cell className="md:col-span-5" title="Voice-first, one question at a time." body="A real conversation, not a chat box. Clarte listens, probes and remembers where you are." visual={<OrbTranscript />} />
          <Cell className="md:col-span-4" title="Every source, linked." body="Titles are spoken aloud and shown as clickable URLs. No invented references." />
          <Cell className="md:col-span-4" title="It argues back." body="Debate mode built on Gemma 4 surfaces the strongest counter-evidence." />
          <Cell className="md:col-span-4" title="Idea card + report." body="Problem, root cause, solution, 3 evidence docs and remaining risks. Export to Markdown/PDF." />
          <Cell className="md:col-span-12" title="Your key, your visuals." body="Sign in with Google, connect your own xAI key, and unlock Grok Imagine. Keys are encrypted at rest and only used server-side." />
        </div>
      </div>
    </section>
  )
}
