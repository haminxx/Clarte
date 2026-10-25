import { AnimatedList } from '@/components/ui/animated-list'
import { Reveal } from './Reveal'

const ROWS = [
  { type: 'Patent', src: 'NASA T2', title: 'Thermal control for small spacecraft', color: '#7C9CFF' },
  { type: 'Report', src: 'NASA NTRS', title: 'Passive heat rejection study', color: '#F5A524' },
  { type: 'Paper', src: 'arXiv', title: 'Phase-change materials for battery cooling', color: '#5EEAD4' },
]

function Row({ r, hot }: { r: (typeof ROWS)[number]; hot?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${hot ? 'border-signal/50 bg-signal/[0.06]' : 'border-line bg-bg/60'}`}>
      <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[.08em] text-muted">{r.type}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] text-ink">{r.title}</p>
        <p className="font-mono text-[11px] text-dim">{r.src}</p>
      </div>
      <span className="text-muted" aria-hidden>↗</span>
    </div>
  )
}

export default function Sources() {
  return (
    <section className="py-20 md:py-32" aria-labelledby="sources">
      <div className="mx-auto grid max-w-container items-center gap-12 px-4 md:px-6 lg:grid-cols-2">
        <Reveal>
          <p className="eyebrow" id="sources">Sources & citations</p>
          <h2 className="display mt-4 text-[32px] font-semibold leading-[40px] text-ink md:text-[44px] md:leading-[52px]">If Clarte says it, you can click it.</h2>
          <p className="mt-5 text-[17px] leading-[28px] text-muted">
            Every tool result carries its real URL, from NASA T2, NTRS, arXiv and DOI pages. The agent cites only what the tools return. Click a source to open the original and focus its node in the graph.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between px-1 pb-3">
              <p className="font-mono text-[12px] uppercase tracking-[.08em] text-muted">Sources</p>
              <p className="font-mono text-[11px] text-dim">example</p>
            </div>
            <div className="relative min-h-[216px]">
              <AnimatedList delay={1800} className="!items-stretch !gap-2">
                {ROWS.map((r, i) => <Row key={r.title} r={r} hot={i === 2} />)}
              </AnimatedList>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-bg/60 p-3" aria-hidden>
              <svg viewBox="0 0 120 40" className="h-10 w-28">
                <line x1="12" y1="20" x2="52" y2="10" stroke="#23272E" /><line x1="52" y1="10" x2="96" y2="26" stroke="#5EEAD4" strokeDasharray="3 3" /><line x1="12" y1="20" x2="96" y2="26" stroke="#23272E" />
                <circle cx="12" cy="20" r="3" fill="#7C9CFF" /><circle cx="52" cy="10" r="3" fill="#F5A524" />
                <circle cx="96" cy="26" r="4" fill="#5EEAD4" className="animate-orb-pulse" style={{ transformOrigin: '96px 26px' }} />
              </svg>
              <p className="text-[12px] leading-5 text-muted">Selected source is focused in the graph.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
