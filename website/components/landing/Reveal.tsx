import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 12, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

export function SectionHead({ eyebrow, title, sub, id }: { eyebrow: string; title: ReactNode; sub?: ReactNode; id?: string }) {
  return (
    <Reveal className="max-w-[760px]">
      <p className="eyebrow" id={id}>{eyebrow}</p>
      <h2 className="display mt-4 text-[32px] font-semibold leading-[40px] text-ink md:text-[44px] md:leading-[52px]">{title}</h2>
      {sub && <p className="mt-5 text-[17px] leading-[28px] text-muted">{sub}</p>}
    </Reveal>
  )
}
