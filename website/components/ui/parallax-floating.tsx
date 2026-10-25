// Adapted from 21st.dev "Parallax Floating" (danielpetho, id 656).
// Changes: inlined the mouse-position hook, window-level tracking, paused under prefers-reduced-motion.
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useAnimationFrame, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

type Ctx = { register: (id: string, el: HTMLDivElement, depth: number) => void; unregister: (id: string) => void }
const FloatingContext = createContext<Ctx | null>(null)

export default function Floating({ children, className, sensitivity = 1, easingFactor = 0.05 }: {
  children: ReactNode; className?: string; sensitivity?: number; easingFactor?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const els = useRef(new Map<string, { el: HTMLDivElement; depth: number; x: number; y: number }>())
  const mouse = useRef({ x: 0, y: 0 })
  const reduced = useReducedMotion()

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      mouse.current = { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const register = useCallback((id: string, el: HTMLDivElement, depth: number) => { els.current.set(id, { el, depth, x: 0, y: 0 }) }, [])
  const unregister = useCallback((id: string) => { els.current.delete(id) }, [])

  useAnimationFrame(() => {
    if (reduced) return
    els.current.forEach((d) => {
      const s = (d.depth * sensitivity) / 20
      d.x += (mouse.current.x * s - d.x) * easingFactor
      d.y += (mouse.current.y * s - d.y) * easingFactor
      d.el.style.transform = `translate3d(${d.x.toFixed(2)}px, ${d.y.toFixed(2)}px, 0)`
    })
  })

  return (
    <FloatingContext.Provider value={{ register, unregister }}>
      <div ref={ref} className={cn('absolute inset-0', className)}>{children}</div>
    </FloatingContext.Provider>
  )
}

export function FloatingElement({ children, className, depth = 1 }: { children: ReactNode; className?: string; depth?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useRef(Math.random().toString(36).slice(2))
  const ctx = useContext(FloatingContext)
  useEffect(() => {
    if (!ref.current || !ctx) return
    const key = id.current
    ctx.register(key, ref.current, depth || 0.01)
    return () => ctx.unregister(key)
  }, [ctx, depth])
  return <div ref={ref} className={cn('absolute will-change-transform', className)}>{children}</div>
}
