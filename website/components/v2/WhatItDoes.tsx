import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { SlotImage } from './SlotImage'
import type { SlotName } from '@/lib/images'

type Row = { n: string; label: string; title: string; body: string; list: string[]; slot: SlotName; overlay: ReactNode }

const Chip = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`glass absolute p-3 text-[12px] leading-[1.35] text-ink ${className}`}>{children}</div>
)

const ROWS: Row[] = [
  {
    n: '01', label: 'Living map', slot: 'rowMap', title: 'A 3D map of papers and patents.',
    body: 'Every document is a node. Related work clusters by meaning, and links across fields glow when they matter to your problem.',
    list: ['Papers', 'Patents', 'NASA technical reports', 'Cross-domain links'],
    overlay: <Chip className="bottom-[16%] left-[12%] w-[64%]"><p className="index">Edge · semantic</p><p className="mt-1">Satellite thermal control <span className="text-g-400">↔</span> drone battery</p></Chip>,
  },
  {
    n: '02', label: 'Voice-first', slot: 'rowVoice', title: 'A conversation, not a chat box.',
    body: 'Talk the way you think. Clarte listens, asks one question at a time, and keeps track of where you are in the session.',
    list: ['5 Whys', 'Why · How · What', 'Market & debate', 'Interrupt any time'],
    overlay: <Chip className="bottom-[16%] right-[12%] w-[62%]"><p className="index">You</p><p className="mt-1">It dies after twenty minutes.</p><p className="index mt-2">Clarte</p><p className="mt-1">Is it the cold, or the load?</p></Chip>,
  },
  {
    n: '03', label: 'Every source, linked', slot: 'rowSources', title: 'Titles spoken aloud. URLs on screen.',
    body: 'The agent cites only what the search tools return. Each source is read out by title and shown as a clickable link.',
    list: ['NASA T2', 'NASA NTRS', 'arXiv', 'DOI pages'],
    overlay: <Chip className="bottom-[14%] left-[12%] w-[70%]"><p className="index">Sources · example</p>{['NASA T2 · Patent', 'arXiv · Paper', 'NTRS · Report'].map((t) => <p key={t} className="mt-1.5 flex items-center justify-between border-t border-hair pt-1.5">{t}<ArrowUpRight className="h-3 w-3 text-g-500" /></p>)}</Chip>,
  },
  {
    n: '04', label: 'Idea card & report', slot: 'rowIdea', title: 'Leave with something you can defend.',
    body: 'Problem, root cause, solution, three evidence documents and the risks that remain. Export it as Markdown or PDF.',
    list: ['Root cause', 'Solution', 'Evidence', 'Risks', 'Export'],
    overlay: <Chip className="bottom-[14%] right-[12%] w-[60%]"><p className="index">Idea card</p><p className="mt-1 font-medium">Passive cooling pack</p><div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-g-600">{['Root', 'Fix', 'Risk'].map((t) => <span key={t} className="rounded bg-white/60 px-1.5 py-1 text-center">{t}</span>)}</div></Chip>,
  },
  {
    n: '05', label: 'Visualize · optional', slot: 'rowVisualize', title: 'See the idea before you build it.',
    body: 'Confirm the idea and Grok Imagine renders a concept image, a system diagram and a paper-style figure. Off by default; you bring your own key.',
    list: ['Concept image', 'System diagram', 'Paper figure', 'Your own key'],
    overlay: <Chip className="bottom-[14%] left-[12%] flex gap-1.5">{['Concept', 'Diagram', 'Figure'].map((t) => <span key={t} className="grid h-14 w-16 place-items-end rounded-md bg-gradient-to-br from-white/80 to-g-200/80 p-1 text-[9px] text-g-600">{t}</span>)}</Chip>,
  },
]

/** Image-led feature rows: label + title + body on the left, feathered photo with glass UI in the middle, hairline list on the right. */
export default function WhatItDoes() {
  return (
    <section id="features" className="page py-24 md:py-32">
      <div className="grid gap-6 md:grid-cols-12">
        <p className="index md:col-span-3">02 · What it does</p>
        <h2 className="h-section max-w-[640px] md:col-span-9">Everything a good research partner does, <span className="text-g-400">out loud and with receipts.</span></h2>
      </div>
      <div className="mt-16 divide-y divide-hair border-y border-hair">
        {ROWS.map((r, i) => (
          <article key={r.n} className="grid items-center gap-8 py-10 md:grid-cols-12 md:py-14">
            <div className={`md:col-span-4 ${i % 2 ? 'md:order-3 md:col-start-9' : ''}`}>
              <p className="flex items-center gap-3"><span className="index">{r.n}</span><span className="label">{r.label}</span></p>
              <h3 className="mt-4 text-[22px] leading-[1.25] tracking-[-0.03em] md:text-[24px]">{r.title}</h3>
              <p className="mt-3 max-w-[340px] text-[14px] leading-[1.5] text-g-600">{r.body}</p>
            </div>
            <div className={`md:col-span-5 ${i % 2 ? 'md:order-2 md:col-start-4' : ''}`}>
              <SlotImage slot={r.slot} className="mx-auto w-full max-w-[460px]">{r.overlay}</SlotImage>
            </div>
            <ul className={`md:col-span-3 ${i % 2 ? 'md:order-1 md:col-start-1' : ''}`}>
              {r.list.map((t) => <li key={t} className="border-t border-hair py-2.5 text-[13px] text-g-700 first:border-t-0 md:first:border-t">{t}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
