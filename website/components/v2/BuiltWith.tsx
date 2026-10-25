import type React from 'react'
import { useReducedMotion } from 'motion/react'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { BUILT_WITH, type BrandLogo } from '@/lib/logos'

/**
 * Logo cloud: real data sources and the real stack, shown as monochrome "built with" attribution
 * (not customer logos). Pattern adapted from 21st.dev "Blurred Marquee" (grootstudio, id 20147):
 * hairline rules, slow marquee, progressive blur on both edges. Reduced motion shows a static wrapped row.
 */
function Logo({ l }: { l: BrandLogo }) {
  const className = "flex h-10 shrink-0 items-center text-g-500 hover:no-underline transition-colors duration-300 hover:text-ink focus-visible:text-ink"
  if (l.text) {
    return (
      <a href={l.href} target="_blank" rel="noreferrer" title={l.name} className={className}>
        <span className="whitespace-nowrap text-[15px] font-medium tracking-[-0.03em] md:text-[17px]">{l.text}</span>
      </a>
    )
  }
  const mask = `url(${l.src}) center / contain no-repeat`
  return (
    <a href={l.href} target="_blank" rel="noreferrer" title={l.name} className={className}>
      <span role="img" aria-label={l.name} className="block h-[calc(var(--h)*0.8px)] bg-current md:h-[calc(var(--h)*1px)]"
        style={{ '--h': l.h, aspectRatio: l.ratio, mask, WebkitMask: mask } as React.CSSProperties} />
    </a>
  )
}

export default function BuiltWith() {
  const reduced = useReducedMotion()
  return (
    <section aria-labelledby="built-with" className="page pb-6 pt-10 md:pt-14">
      <p id="built-with" className="label text-center">Built with</p>
      {reduced ? (
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
          {BUILT_WITH.map((l) => <li key={l.id}><Logo l={l} /></li>)}
        </ul>
      ) : (
        <div className="relative mt-5 border-y border-hair py-5">
          <InfiniteSlider gap={48} duration={45}>
            {BUILT_WITH.map((l) => <Logo key={l.id} l={l} />)}
          </InfiniteSlider>
          <ProgressiveBlur direction="left" blurIntensity={1} className="absolute inset-y-0 left-0 w-12 md:w-40" />
          <ProgressiveBlur direction="right" blurIntensity={1} className="absolute inset-y-0 right-0 w-12 md:w-40" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-canvas to-transparent md:w-28" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-canvas to-transparent md:w-28" />
        </div>
      )}
    </section>
  )
}
