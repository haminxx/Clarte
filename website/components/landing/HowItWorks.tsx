import { SectionHead, Reveal } from './Reveal'

const STAGES = ['5 Whys', 'Why·How·What', 'Market & Debate', 'Visualize']

function Fragment({ kind }: { kind: number }) {
  if (kind === 0)
    return (
      <div className="rounded-xl border border-line bg-bg/60 p-3">
        <p className="font-mono text-[10px] uppercase tracking-[.08em] text-accent">Clarte</p>
        <p className="mt-1 text-[13px] leading-5 text-ink">“Why do you think it drains so fast?”</p>
      </div>
    )
  if (kind === 1)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-bg/60 p-3 font-mono text-[11px] text-muted">
        <span className="h-2 w-2 rounded-full bg-accent" />satellite thermal control
        <span className="flex-1 border-t border-dashed border-signal/70" />
        <span className="h-2 w-2 rounded-full bg-warn" />drone battery
      </div>
    )
  if (kind === 2)
    return (
      <div className="rounded-xl border border-warn/30 bg-warn/[0.06] p-3">
        <p className="font-mono text-[10px] uppercase tracking-[.08em] text-warn">Counterpoint</p>
        <p className="mt-1 text-[13px] leading-5 text-ink">“There's already a NASA patent for this. What's your differentiator?”</p>
      </div>
    )
  return (
    <div className="grid grid-cols-3 gap-2">
      {['concept', 'system', 'figure'].map((l, i) => (
        <div key={l} className="aspect-square rounded-lg border border-line" style={{ background: `linear-gradient(${135 + i * 40}deg, rgba(124,156,255,.25), rgba(167,139,250,.08) 60%, transparent)` }}>
          <span className="sr-only">{l} thumbnail</span>
        </div>
      ))}
    </div>
  )
}

const CARDS = [
  { n: '01', t: 'Dig: 5 Whys', b: 'Clarte doesn’t hand you answers. It asks “why?” until you can name the root cause in one sentence.' },
  { n: '02', t: 'Shape: Why · How · What', b: 'Why it matters, how you’ll solve it, what you’ll build. Clarte pulls in technology from other domains and asks how you’d apply it.' },
  { n: '03', t: 'Defend: Market & Debate', b: 'Real patents and papers become counter-evidence. Clarte argues the other side so you find the weak spots first.' },
  { n: '04', t: 'See it: Visualize', b: 'Confirm the idea and Grok Imagine renders it as a concept image, a system-structure diagram and a paper-style figure.' },
]

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-32" aria-labelledby="how">
      <div className="mx-auto max-w-container px-4 md:px-6">
        <SectionHead id="how" eyebrow="How it works" title={<>One conversation, <span className="text-muted">four stages.</span></>} sub="A session moves from the root cause to an idea you can defend, and ends with something you can show." />
        <Reveal className="mt-12">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[12px] uppercase tracking-[.08em] text-muted">
            {STAGES.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className="rounded-full border border-line bg-surface px-3 py-1">{s}</span>
                {i < STAGES.length - 1 && <span className="text-dim">→</span>}
              </span>
            ))}
          </div>
        </Reveal>
        <div className="relative mt-8">
          <div className="pointer-events-none absolute left-0 right-0 top-[27px] hidden h-px overflow-hidden bg-line lg:block" aria-hidden>
            <div className="h-px w-1/4 animate-beam bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((c, i) => (
              <Reveal key={c.n} delay={i * 0.06} className="h-full">
                <li className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-transform duration-200 hover:-translate-y-0.5">
                  <span className="relative z-10 inline-flex h-7 w-10 items-center justify-center rounded-full border border-line bg-bg font-mono text-[12px] text-accent">{c.n}</span>
                  <h3 className="mt-5 text-[19px] font-semibold leading-7 text-ink">{c.t}</h3>
                  <p className="mt-2 flex-1 text-[15px] leading-6 text-muted">{c.b}</p>
                  <div className="mt-6"><Fragment kind={i} /></div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
