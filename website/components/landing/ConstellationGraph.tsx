import { useEffect, useRef } from 'react'

export const DOMAINS = [
  { name: 'Space', color: '#7C9CFF' },
  { name: 'Energy', color: '#F5A524' },
  { name: 'Materials', color: '#5EEAD4' },
  { name: 'Bio', color: '#F472B6' },
  { name: 'Electronics', color: '#A78BFA' },
] as const

type Node = { x: number; y: number; z: number; d: number; r: number }
type Edge = { a: number; b: number; cross: boolean }

function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

function build(count: number) {
  const rand = rng(7)
  const centers = DOMAINS.map((_, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / DOMAINS.length)
    const th = Math.PI * (1 + Math.sqrt(5)) * i
    return [Math.sin(phi) * Math.cos(th), Math.cos(phi) * 0.8, Math.sin(phi) * Math.sin(th)]
  })
  const nodes: Node[] = []
  for (let i = 0; i < count; i++) {
    const d = i % DOMAINS.length
    const c = centers[d]
    const g = () => (rand() + rand() + rand() - 1.5) * 0.55
    nodes.push({ x: c[0] * 0.75 + g(), y: c[1] * 0.75 + g(), z: c[2] * 0.75 + g(), d, r: 1 + rand() * 1.6 })
  }
  const edges: Edge[] = []
  for (let i = 0; i < count; i++) {
    const n = nodes[i]
    const near = nodes
      .map((m, j) => ({ j, dist: (m.x - n.x) ** 2 + (m.y - n.y) ** 2 + (m.z - n.z) ** 2, same: m.d === n.d }))
      .filter((o) => o.j !== i && o.same)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2)
    near.forEach((o) => { if (o.j > i) edges.push({ a: i, b: o.j, cross: false }) })
  }
  // a handful of glowing cross-domain links (the "aha" connections)
  for (let k = 0; k < 9; k++) {
    const a = Math.floor(rand() * count)
    let b = Math.floor(rand() * count)
    while (nodes[b].d === nodes[a].d) b = Math.floor(rand() * count)
    edges.push({ a, b, cross: true })
  }
  return { nodes, edges }
}

export default function ConstellationGraph({ className, onPulse }: { className?: string; onPulse?: (domain: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const pulseCb = useRef(onPulse)
  pulseCb.current = onPulse

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const small = window.innerWidth < 640
    const { nodes, edges } = build(small ? 90 : 150)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true
    let angle = 0.6, last = performance.now(), pulseT = 0, pulseDomain = 0, sincePulse = 0

    const resize = () => {
      const r = cv.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width; h = r.height
      cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr)
      if (reduce) draw()
    }

    const proj = new Float32Array(nodes.length * 3)
    function draw() {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.clearRect(0, 0, w, h)
      const R = Math.min(w, h) * 0.42
      const cs = Math.cos(angle), sn = Math.sin(angle), tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        const x = n.x * cs - n.z * sn
        let z = n.x * sn + n.z * cs
        const y = n.y * ct - z * st
        z = n.y * st + z * ct
        const p = 2.6 / (2.6 + z)
        proj[i * 3] = w / 2 + x * R * p
        proj[i * 3 + 1] = h / 2 + y * R * p
        proj[i * 3 + 2] = z
      }
      const glow = pulseT > 0 ? Math.sin(Math.min(1, pulseT) * Math.PI) : 0
      ctx!.lineWidth = 1
      for (const e of edges) {
        const za = proj[e.a * 3 + 2], zb = proj[e.b * 3 + 2]
        const depth = 0.55 - (za + zb) * 0.2
        const hot = glow > 0 && (nodes[e.a].d === pulseDomain || nodes[e.b].d === pulseDomain)
        if (e.cross) {
          ctx!.strokeStyle = `rgba(94,234,212,${(0.16 + (hot ? glow * 0.5 : 0)) * depth * 1.6})`
          ctx!.setLineDash([3, 4])
        } else {
          ctx!.strokeStyle = `rgba(154,161,172,${(0.12 + (hot ? glow * 0.35 : 0)) * depth})`
          ctx!.setLineDash([])
        }
        ctx!.beginPath()
        ctx!.moveTo(proj[e.a * 3], proj[e.a * 3 + 1])
        ctx!.lineTo(proj[e.b * 3], proj[e.b * 3 + 1])
        ctx!.stroke()
      }
      ctx!.setLineDash([])
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        const z = proj[i * 3 + 2]
        const a = Math.max(0.15, 0.85 - z * 0.45)
        const hot = glow > 0 && n.d === pulseDomain
        const r = n.r * (2.6 / (2.6 + z)) * (hot ? 1 + glow * 0.8 : 1)
        ctx!.globalAlpha = Math.min(1, a + (hot ? glow * 0.4 : 0))
        ctx!.fillStyle = DOMAINS[n.d].color
        if (hot) { ctx!.shadowBlur = 12 * glow; ctx!.shadowColor = DOMAINS[n.d].color }
        ctx!.beginPath()
        ctx!.arc(proj[i * 3], proj[i * 3 + 1], r, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.shadowBlur = 0
      }
      ctx!.globalAlpha = 1
    }

    function frame(now: number) {
      raf = 0
      if (!visible) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      angle += dt * ((Math.PI * 2) / 90)
      sincePulse += dt
      if (sincePulse > 3) {
        sincePulse = 0
        pulseDomain = (pulseDomain + 2) % DOMAINS.length
        pulseT = 0.0001
        pulseCb.current?.(pulseDomain)
      }
      if (pulseT > 0) { pulseT += dt / 1.6; if (pulseT >= 1) pulseT = 0 }
      draw()
      raf = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    resize()
    let io: IntersectionObserver | undefined
    if (reduce) {
      draw()
    } else {
      io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
        if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame) }
      })
      io.observe(cv)
    }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io?.disconnect() }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className={className} style={{ width: '100%', height: '100%', display: 'block' }} />
}
