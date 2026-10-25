"use client";

import Features from "./Features";
import FinalCTA from "./FinalCTA";
import Footer from "./Footer";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import Nav from "./Nav";
import Problem from "./Problem";
import ProofStrip from "./ProofStrip";
import Sources from "./Sources";
import TechStrip from "./TechStrip";
import Visualize from "./Visualize";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-bg font-sans text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-bg">
        Skip to content
      </a>
      <div className="pointer-events-none fixed inset-y-0 left-1/2 z-0 hidden w-full max-w-container -translate-x-1/2 border-x border-white/[0.04] xl:block" aria-hidden />
      <Nav />
      <main id="main" className="relative z-10">
        <Hero />
        <ProofStrip />
        <Problem />
        <HowItWorks />
        <Features />
        <Sources />
        <Visualize />
        <TechStrip />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
