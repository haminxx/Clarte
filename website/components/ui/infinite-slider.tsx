// Adapted from 21st.dev "Infinite Slider" (ibelick, id 1247).
// Changes: motion/react instead of framer-motion, ResizeObserver instead of react-use-measure,
// static row under prefers-reduced-motion.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export function InfiniteSlider({ children, gap = 16, duration = 25, durationOnHover, reverse = false, className }: {
  children: ReactNode; gap?: number; duration?: number; durationOnHover?: number; reverse?: boolean; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [current, setCurrent] = useState(duration)
  const x = useMotionValue(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (reduced || !width) return
    const size = width + gap
    const from = reverse ? -size / 2 : 0
    const to = reverse ? 0 : -size / 2
    const c = animate(x, [from, to], { ease: 'linear', duration: current, repeat: Infinity, repeatType: 'loop', onRepeat: () => x.set(from) })
    return c.stop
  }, [x, width, gap, current, reverse, reduced])

  return (
    <div className={cn('overflow-hidden', className)}>
      <motion.div
        ref={ref}
        className="flex w-max"
        style={{ x, gap: `${gap}px` }}
        onHoverStart={() => durationOnHover && setCurrent(durationOnHover)}
        onHoverEnd={() => durationOnHover && setCurrent(duration)}
      >
        {children}
        {children}
      </motion.div>
    </div>
  )
}
