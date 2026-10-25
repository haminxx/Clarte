// From 21st.dev "Progressive blur" (ibelick, id 1674). Plain divs instead of motion.div.
import { cn } from '@/lib/utils'

const ANGLES = { top: 0, right: 90, bottom: 180, left: 270 } as const

export function ProgressiveBlur({ direction = 'bottom', blurLayers = 8, blurIntensity = 0.25, className }: {
  direction?: keyof typeof ANGLES; blurLayers?: number; blurIntensity?: number; className?: string
}) {
  const layers = Math.max(blurLayers, 2)
  const seg = 1 / (blurLayers + 1)
  return (
    <div className={cn('pointer-events-none', className)} aria-hidden>
      {Array.from({ length: layers }).map((_, i) => {
        const stops = [i * seg, (i + 1) * seg, (i + 2) * seg, (i + 3) * seg]
          .map((p, k) => `rgba(255,255,255,${k === 1 || k === 2 ? 1 : 0}) ${p * 100}%`)
        const g = `linear-gradient(${ANGLES[direction]}deg, ${stops.join(', ')})`
        return <div key={i} className="absolute inset-0 rounded-[inherit]" style={{ maskImage: g, WebkitMaskImage: g, backdropFilter: `blur(${i * blurIntensity}px)`, WebkitBackdropFilter: `blur(${i * blurIntensity}px)` }} />
      })}
    </div>
  )
}
