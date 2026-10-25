"use client";

import { motion, type Variants } from "motion/react";
import { REPO_URL } from "@/lib/links";
import { GitHubIcon } from "./icons";

const COLUMNS = [
  { heading: "Product", links: [{ t: "How it works", u: "#how" }, { t: "Features", u: "#features" }, { t: "Sources", u: "#sources" }] },
  {
    heading: "Open source",
    links: [
      { t: "GitHub", u: REPO_URL },
      { t: "README", u: `${REPO_URL}#readme` },
      { t: "Plan", u: `${REPO_URL}/blob/main/readme/PLAN.md` },
    ],
  },
  {
    heading: "Built with",
    links: [
      { t: "Cloudflare", u: "https://www.cloudflare.com" },
      { t: "Gemma", u: "https://ai.google.dev/gemma" },
      { t: "Vapi", u: "https://vapi.ai" },
      { t: "xAI", u: "https://x.ai" },
    ],
  },
  { heading: "Legal", links: [{ t: "Terms", u: "/terms" }, { t: "Privacy", u: "/privacy" }] },
];

const container: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line pt-16">
      <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mx-auto grid max-w-container grid-cols-2 gap-10 px-4 md:grid-cols-4 md:px-6">
        {COLUMNS.map((column) => (
          <motion.div key={column.heading} variants={item}>
            <p className="eyebrow">{column.heading}</p>
            <ul className="mt-4 space-y-3 text-[14px] text-muted">
              {column.links.map((link) => (
                <li key={link.t}>
                  <a href={link.u} className="transition-colors hover:text-ink">
                    {link.t}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
      <div className="mx-auto mt-14 flex max-w-container flex-col items-start justify-between gap-4 border-t border-line px-4 py-6 text-[13px] text-dim sm:flex-row sm:items-center md:px-6">
        <p>© 2026 Clarte · Built at Hacktoberfest × SpaceXAI Hack Day, UC San Diego</p>
        <a href={REPO_URL} aria-label="Clarte on GitHub" className="text-muted transition-colors hover:text-ink">
          <GitHubIcon className="h-5 w-5" />
        </a>
      </div>
      <p
        aria-hidden
        className="pointer-events-none -mb-[0.22em] select-none text-center font-semibold leading-none tracking-[-0.05em] text-transparent"
        style={{ fontSize: "clamp(5rem, 24vw, 20rem)", WebkitTextStroke: "1px rgba(154,161,172,.18)" }}
      >
        Clarte
      </p>
    </footer>
  );
}
