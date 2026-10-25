/**
 * Image slots for the v2 landing page.
 *
 * Originals from cosmos.so live in public/images/cosmos/. `python3 scripts/optimize_images.py`
 * writes resized WebP copies to public/images/opt/, and vite.config.ts injects the list of those
 * files as __OPT_IMAGES__. A slot whose file is missing renders a neutral placeholder instead.
 *
 * To swap a photo, change `file` below (basename without extension) and rebuild.
 */
export type Slot = {
  /** basename in public/images/opt/ (without .webp) */
  file: string
  /** what the photo should show, for whoever replaces it */
  subject: string
  /** intended crop, CSS aspect-ratio */
  aspect: '1 / 1' | '4 / 3' | '3 / 4'
  alt: string
}

export const SLOTS = {
  // Hero: scattered feathered cards (square crops)
  heroSatellite: { file: 'satellite-03', subject: 'Satellite over Earth', aspect: '1 / 1', alt: '' },
  heroDevice: { file: 'product-01', subject: 'Minimal white hardware product, held in hand', aspect: '1 / 1', alt: '' },
  heroBlueprint: { file: 'blueprint-02', subject: 'Dark-blue rocket blueprint', aspect: '1 / 1', alt: '' },
  heroPaper: { file: 'paper-01', subject: 'Printed research pages / tables', aspect: '1 / 1', alt: '' },
  heroDunes: { file: 'texture-02', subject: 'Soft white-blue dunes texture', aspect: '1 / 1', alt: '' },
  heroDish: { file: 'satellite-01', subject: 'Satellite dish on white', aspect: '1 / 1', alt: '' },
  heroLens: { file: 'product-02', subject: 'Minimal white lens device', aspect: '1 / 1', alt: '' },
  heroPlan: { file: 'blueprint-01', subject: 'Pale architectural floor plan', aspect: '1 / 1', alt: '' },
  heroLight: { file: 'texture-01', subject: 'Beige light study texture', aspect: '1 / 1', alt: '' },
  heroOrbit: { file: 'satellite-02', subject: 'Spacecraft over a coastline', aspect: '1 / 1', alt: '' },
  // "What it does" rows: one centered square card per row
  rowMap: { file: 'blueprint-01', subject: 'Network / plan drawing for the living map of technology', aspect: '1 / 1', alt: 'Pale technical floor plan' },
  rowVoice: { file: 'product-02', subject: 'Minimal speaker-like device for the voice conversation', aspect: '1 / 1', alt: 'Minimal white device with a round lens' },
  rowSources: { file: 'paper-01', subject: 'Printed research papers for citations', aspect: '1 / 1', alt: 'Stack of printed research pages' },
  rowIdea: { file: 'product-01', subject: 'Minimal product shot for the idea card', aspect: '1 / 1', alt: 'Minimal white hardware product held in a hand' },
  rowVisualize: { file: 'satellite-03', subject: 'Spacecraft render for Grok Imagine visuals', aspect: '1 / 1', alt: 'Satellite with solar panels above Earth' },
  // "Get started" cards
  startTalk: { file: 'texture-01', subject: 'Warm, quiet light texture', aspect: '4 / 3', alt: '' },
  startGoogle: { file: 'texture-02', subject: 'Soft white-blue dunes', aspect: '4 / 3', alt: '' },
  startCode: { file: 'blueprint-02', subject: 'Blueprint detail', aspect: '4 / 3', alt: '' },
  startPlan: { file: 'satellite-02', subject: 'Spacecraft over a coastline', aspect: '4 / 3', alt: '' },
} satisfies Record<string, Slot>

export type SlotName = keyof typeof SLOTS

const available = new Set([
  "blueprint-01.webp",
  "blueprint-02.webp",
  "paper-01.webp",
  "product-01.webp",
  "product-02.webp",
  "satellite-01.webp",
  "satellite-02.webp",
  "satellite-03.webp",
  "texture-01.webp",
  "texture-02.webp",
])

/** Public URL for a slot, or null when the optimized file is missing. */
export function slotSrc(name: SlotName): string | null {
  const f = `${SLOTS[name].file}.webp`
  return available.has(f) ? `/images/opt/${f}` : null
}
