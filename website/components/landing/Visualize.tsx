import { Reveal, SectionHead } from './Reveal'

function Concept() {
  return (
    <svg viewBox="0 0 200 260" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="cg" cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#A78BFA" stopOpacity=".55" /><stop offset="1" stopColor="#07080A" stopOpacity="0" /></radialGradient>
        <linearGradient id="cb" x1="0" x2="1"><stop offset="0" stopColor="#7C9CFF" /><stop offset="1" stopColor="#A78BFA" /></linearGradient>
      </defs>
      <rect width="200" height="260" fill="url(#cg)" />
      <rect x="62" y="96" width="76" height="52" rx="10" fill="#15181D" stroke="url(#cb)" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={70 + i * 16} y="106" width="10" height="32" rx="3" fill="#7C9CFF" opacity={0.35 + i * 0.12} />)}
      {[[40, 80], [160, 80], [40, 164], [160, 164]].map(([x, y], i) => (
        <g key={i}><line x1="100" y1="122" x2={x} y2={y} stroke="#23272E" strokeWidth="3" /><circle cx={x} cy={y} r="16" fill="none" stroke="#9AA1AC" strokeOpacity=".5" /></g>
      ))}
      <path d="M62 152 C 80 176, 120 176, 138 152" stroke="#5EEAD4" strokeDasharray="4 4" fill="none" />
    </svg>
  )
}
function System() {
  const box = (x: number, y: number, t: string, c = '#23272E') => (
    <g><rect x={x} y={y} width="70" height="28" rx="6" fill="#0E1013" stroke={c} /><text x={x + 35} y={y + 18} fill="#9AA1AC" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle">{t}</text></g>
  )
  return (
    <svg viewBox="0 0 200 260" className="h-full w-full" aria-hidden>
      <g stroke="#7C9CFF" strokeOpacity=".6" fill="none"><path d="M100 58v28M100 114v28M65 170h-20v28M135 170h20v28" /><path d="M100 142v28" /></g>
      {box(65, 30, 'sensor', '#7C9CFF')}{box(65, 86, 'controller')}{box(65, 142, 'pcm layer', '#5EEAD4')}{box(10, 198, 'cells')}{box(120, 198, 'radiator', '#F5A524')}
    </svg>
  )
}
function Figure() {
  const pts = Array.from({ length: 12 }, (_, i) => [30 + i * 13, 190 - Math.log(i + 1.4) * 52])
  const pts2 = Array.from({ length: 12 }, (_, i) => [30 + i * 13, 190 - Math.log(i + 1.4) * 34])
  return (
    <svg viewBox="0 0 200 260" className="h-full w-full" aria-hidden>
      <path d="M28 40v152h150" stroke="#6B7280" fill="none" />
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#7C9CFF" strokeWidth="2" />
      <polyline points={pts2.map((p) => p.join(',')).join(' ')} fill="none" stroke="#F5A524" strokeWidth="2" strokeDasharray="4 3" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill="#7C9CFF" />)}
      <text x="100" y="222" fill="#9AA1AC" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle">Fig. 1 · Cell temperature vs. time</text>
    </svg>
  )
}

const CARDS = [
  { cap: 'concept image', el: <Concept /> },
  { cap: 'system-structure diagram', el: <System /> },
  { cap: 'paper-style figure', el: <Figure /> },
]

export default function Visualize() {
  return (
    <section className="relative py-20 md:py-32" aria-labelledby="visualize">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_70%,rgba(167,139,250,.10),transparent)]" aria-hidden />
      <div className="relative mx-auto max-w-container px-4 md:px-6">
        <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[.08em] text-accent">Optional · Bring your own xAI key</span>
        <div className="mt-5"><SectionHead id="visualize" eyebrow="Visualize with Grok Imagine" title="End with something you can show." sub="When you confirm your idea, Clarte writes the prompts and Grok Imagine renders the idea: what it looks like, how the system fits together, and a journal-style figure. All three land on your idea card next to the sources." /></div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.cap} delay={i * 0.06}>
              <figure className="group overflow-hidden rounded-2xl border border-line bg-surface transition-transform duration-300 hover:-translate-y-0.5">
                <div className="aspect-[4/5] bg-bg/60 p-4">{c.el}</div>
                <figcaption className="flex items-center justify-between border-t border-line px-4 py-3 font-mono text-[12px] text-muted">
                  <span>{String(i + 1).padStart(2, '0')} · {c.cap}</span><span className="text-dim">illustration</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-dim">Illustrations only. Real renders are generated in the app with your own key.</p>
      </div>
    </section>
  )
}
