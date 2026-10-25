import { Cloud, Cpu, AudioLines, ImageIcon, Waypoints } from 'lucide-react'
import { Reveal } from './Reveal'

const ITEMS = [
  { icon: Cloud, name: 'Cloudflare', line: 'Workers, D1 and Vectorize hold the graph and search.' },
  { icon: Cpu, name: 'Gemma 4', line: 'Open-weight reasoning behind summaries, tags and debate.' },
  { icon: AudioLines, name: 'Vapi', line: 'The realtime voice layer.' },
  { icon: ImageIcon, name: 'Grok Imagine', line: 'Final idea visuals.' },
  { icon: Waypoints, name: 'BGE embeddings', line: 'Open-weight semantic search (bge-base-en-v1.5).' },
]

export default function TechStrip() {
  return (
    <section className="py-16 md:py-24" aria-labelledby="stack">
      <div className="mx-auto max-w-container px-4 md:px-6">
        <p id="stack" className="eyebrow">Under the hood</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ITEMS.map((it, i) => (
            <Reveal key={it.name} delay={i * 0.06} className="h-full">
              <li className="h-full rounded-2xl border border-line bg-surface p-5">
                <it.icon className="h-5 w-5 text-accent" aria-hidden />
                <p className="mt-4 text-[15px] font-semibold text-ink">{it.name}</p>
                <p className="mt-1 text-[14px] leading-[22px] text-muted">{it.line}</p>
              </li>
            </Reveal>
          ))}
        </ul>
        <p className="mt-6 text-[14px] text-dim">Open source (MIT) · Runs on Cloudflare's free tier · Your xAI key is encrypted and never sent to the browser</p>
      </div>
    </section>
  )
}
