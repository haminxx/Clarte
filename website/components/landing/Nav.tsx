"use client";

import { ArrowRight } from "lucide-react";
import { GOOGLE_URL, REPO_URL, SESSION_PATH } from "@/lib/links";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#sources", label: "Sources" },
  { href: REPO_URL, label: "Open source" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-black/60 backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-container items-center justify-between gap-3 px-4 md:px-6">
        <a href="#top" className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] text-ink">
          <img src="/favicon.svg" alt="" width={22} height={22} />
          Clarte
        </a>
        <ul className="hidden items-center gap-8 text-sm text-muted md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a className="transition-colors hover:text-ink" href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a href={GOOGLE_URL} className="hidden rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-ink sm:inline-flex">
            Sign in
          </a>
          <a href={SESSION_PATH} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg transition-transform duration-200 hover:-translate-y-px">
            Start brainstorming <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </nav>
    </header>
  );
}
