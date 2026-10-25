import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'

// Real data sources and the real stack, set as text wordmarks. Not customer logos.
const MARKS = ['NASA NTRS', 'NASA T2', 'arXiv', 'Cloudflare', 'Gemma 4', 'Vapi', 'Grok Imagine', 'BGE']

const Mark = ({ t }: { t: string }) => <span className="whitespace-nowrap text-[17px] font-medium tracking-[-0.03em] text-g-500">{t}</span>

export default function BuiltWith() {
  return (
    <section aria-label="Data sources and stack" className="page pb-6 pt-10 md:pt-14">
      <p className="label text-center">Grounded in open technical data · Built with</p>
      <ul className="mt-6 hidden flex-wrap items-center justify-center gap-x-12 gap-y-4 md:flex">
        {MARKS.map((m) => <li key={m}><Mark t={m} /></li>)}
      </ul>
      <div className="relative mt-5 md:hidden">
        <InfiniteSlider gap={40} duration={30}>{MARKS.map((m) => <Mark key={m} t={m} />)}</InfiniteSlider>
        <ProgressiveBlur direction="left" blurIntensity={1} className="absolute inset-y-0 left-0 w-16" />
        <ProgressiveBlur direction="right" blurIntensity={1} className="absolute inset-y-0 right-0 w-16" />
      </div>
    </section>
  )
}
