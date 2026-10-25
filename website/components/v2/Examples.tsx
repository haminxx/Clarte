import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRef } from 'react'

// Illustrative cross-domain matches (the kind of link a session surfaces). Not customer quotes.
const CARDS = [
  { tag: 'NASA T2 · Patent', from: 'Satellite thermal control', to: 'Drone battery overheating', note: 'A passive heat-rejection design built for small spacecraft could keep a pack cool without adding a fan.', glow: '#8EC5FF' },
  { tag: 'arXiv · Paper', from: 'Phase-change materials', to: 'Wearable cooling', note: 'Materials that absorb heat as they melt, studied for electronics, map onto a vest that stays cool for hours.', glow: '#B9A6FF' },
  { tag: 'NASA NTRS · Report', from: 'Radiation-tolerant sensors', to: 'Harsh-environment IoT', note: 'Sensor designs hardened for orbit suggest how to keep field devices alive in heat, dust and vibration.', glow: '#9EE6CF' },
  { tag: 'NASA T2 · Patent', from: 'Spacecraft water recovery', to: 'Off-grid filtration', note: 'Closed-loop water recycling from life-support research points at compact filters for remote sites.', glow: '#FFC79E' },
]

/** Lightspark's "Trusted by" carousel, repurposed for clearly labeled example sessions. */
export default function Examples() {
  const track = useRef<HTMLDivElement>(null)
  const go = (d: number) => track.current?.scrollBy({ left: d * Math.min(420, track.current.clientWidth * 0.9), behavior: 'smooth' })
  return (
    <section id="examples" className="border-t border-hair py-24 md:py-32">
      <div className="page flex items-end justify-between gap-6">
        <div>
          <p className="index">03 · Example sessions</p>
          <h2 className="h-section mt-6 max-w-[620px]">The answer is often in another field. <span className="text-g-400">Clarte finds it and shows you where.</span></h2>
          <p className="label mt-4">Illustrative examples of cross-domain matches, not customer stories.</p>
        </div>
        <div className="hidden gap-2 md:flex">
          <button type="button" onClick={() => go(-1)} aria-label="Previous examples" className="btn-secondary w-8 px-0"><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => go(1)} aria-label="Next examples" className="btn-secondary w-8 px-0"><ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={track} className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] rail">
        {CARDS.map((c) => (
          <article key={c.from} className="relative flex min-h-[340px] w-[300px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-xl bg-g-100 p-6 md:w-[380px]">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-70 blur-3xl" style={{ background: c.glow }} />
            <div className="relative flex items-center justify-between"><span className="label">{c.tag}</span><span className="index">example</span></div>
            <div className="relative">
              <p className="text-[13px] text-g-500">{c.from}</p>
              <p className="mt-1 text-[24px] leading-[1.2] tracking-[-0.03em]">→ {c.to}</p>
              <p className="mt-4 text-[13px] leading-[1.5] text-g-600">{c.note}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
