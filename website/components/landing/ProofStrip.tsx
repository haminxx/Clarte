import { LogoMarquee } from '@/components/ui/logo-marquee'

const ITEMS = [
  'NASA Technical Reports Server', 'NASA T2 Patents', 'arXiv', 'Cloudflare', 'Gemma 4', 'Vapi', 'Grok Imagine',
].map((label) => ({ id: label, label }))

export default function ProofStrip() {
  return (
    <section aria-labelledby="proof" className="border-y border-line/60 py-12">
      <div className="mx-auto max-w-container px-4 md:px-6">
        <p id="proof" className="eyebrow mb-5 text-center">Grounded in open technical data · Built with</p>
        <LogoMarquee items={ITEMS} label="Data sources and stack" speed={34} gap={48} className="!border-0 !bg-transparent" />
      </div>
    </section>
  )
}
