/** Shared seed topics and per-source quotas — plan section 7 and Appendix A3. */

export const SEEDS = [
  "thermal control",
  "battery",
  "propulsion",
  "composite materials",
  "sensors",
  "robotics",
  "communications",
  "life support",
  "imaging",
  "power systems",
  "cryogenics",
  "water purification",
] as const;

/** arXiv space categories (Appendix A3), rate-limited to one request per 3 s. */
export const ARXIV_CATEGORIES = ["astro-ph.IM", "physics.space-ph"] as const;

/** Europe PMC is the optional "space tech → bio" example. */
export const EUROPEPMC_SEEDS = [
  "spaceflight thermal regulation",
  "microgravity bone loss",
  "radiation shielding astronaut",
  "closed loop life support",
] as const;

/** Target document counts per source — Appendix A3, about 710 documents, 70%+ patents. */
export const QUOTAS = {
  nasa_t2_patent: 300,
  nasa_t2_spinoff: 100,
  nasa_t2_software: 80,
  ntrs: 150,
  arxiv: 80,
  europepmc: 50,
} as const;

export type QuotaKey = keyof typeof QUOTAS;
