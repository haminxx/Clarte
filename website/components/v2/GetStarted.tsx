import { SlotImage } from './SlotImage'
import type { SlotName } from '@/lib/images'
import { APP_URL, GOOGLE_URL, REPO_URL } from '@/lib/links'

const CARDS: { label: string; title: string; href: string; slot: SlotName }[] = [
  { label: 'App', title: 'Start talking', href: APP_URL, slot: 'startTalk' },
  { label: 'Account', title: 'Continue with Google', href: GOOGLE_URL, slot: 'startGoogle' },
  { label: 'Open source', title: 'Read the code', href: REPO_URL, slot: 'startCode' },
  { label: 'Plan', title: 'How a session works', href: '#how', slot: 'startPlan' },
]

export default function GetStarted() {
  return (
    <section className="page border-t border-hair py-24 md:py-32">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <h2 className="h-section">Get started</h2>
        <div className="flex gap-2"><a href={APP_URL} className="btn-primary">Start talking</a><a href={REPO_URL} className="btn-secondary">View on GitHub</a></div>
      </div>
      <div className="mt-12 grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <a key={c.title} href={c.href} className="arrow-item group flex-col items-stretch">
            <SlotImage slot={c.slot} feather={false} className="w-full rounded-lg transition-transform duration-500 ease-spring group-hover:scale-[1.02]" />
            <span className="label mt-3">{c.label}</span>
            <span className="mt-1 text-[15px] tracking-[-0.02em]"><span className="inner">{c.title}</span> <span className="arr">→</span></span>
          </a>
        ))}
      </div>
    </section>
  )
}
