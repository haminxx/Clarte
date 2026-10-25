/**
 * "Built with" attribution marks. Monochrome SVGs in /public/logos (fill="currentColor"),
 * rendered through a CSS mask so they take the surrounding text colour.
 * `h` is the optical height in px at desktop size (wide wordmarks sit lower so the row reads even).
 * `ratio` is width / height of the trimmed viewBox (keeps layout stable before the mask paints).
 */
export type BrandLogo = { id: string; name: string; href: string; src?: string; ratio?: number; h: number; text?: string }

export const BUILT_WITH: BrandLogo[] = [
  { id: 'nasa', name: 'NASA NTRS · NASA T2', href: 'https://ntrs.nasa.gov', text: 'NASA NTRS · NASA T2', h: 18 },
  { id: 'arxiv', name: 'arXiv', href: 'https://arxiv.org', src: '/logos/arxiv.svg', ratio: 2.2, h: 22 },
  { id: 'cloudflare', name: 'Cloudflare', href: 'https://www.cloudflare.com', src: '/logos/cloudflare.svg', ratio: 14.22, h: 13 },
  { id: 'gemma', name: 'Gemma', href: 'https://ai.google.dev/gemma', src: '/logos/gemma.svg', ratio: 4.42, h: 20 },
  { id: 'vapi', name: 'Vapi', href: 'https://vapi.ai', src: '/logos/vapi.svg', ratio: 3.09, h: 22 },
  { id: 'xai', name: 'xAI', href: 'https://x.ai', src: '/logos/xai.svg', ratio: 3.06, h: 19 },
  { id: 'baai', name: 'BAAI (BGE embeddings)', href: 'https://huggingface.co/BAAI', src: '/logos/baai.svg', ratio: 5.18, h: 16 },
  { id: 'exa', name: 'Exa', href: 'https://exa.ai', src: '/logos/exa.svg', ratio: 3.46, h: 20 },
]
