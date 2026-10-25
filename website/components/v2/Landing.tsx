"use client";

import { AuthNoticeProvider } from "@/components/v2/auth-notice";
import BuiltWith from "@/components/v2/BuiltWith";
import Examples from "@/components/v2/Examples";
import Footer from "@/components/v2/Footer";
import GetStarted from "@/components/v2/GetStarted";
import Hero from "@/components/v2/Hero";
import Manifesto from "@/components/v2/Manifesto";
import Nav from "@/components/v2/Nav";
import StageBand from "@/components/v2/StageBand";
import WhatItDoes from "@/components/v2/WhatItDoes";

/** Approved v2 landing. Sections and markup come from the handoff, not a redesign. */
export default function Landing() {
  return (
    <AuthNoticeProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-canvas"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <BuiltWith />
        <Manifesto />
        <StageBand />
        <WhatItDoes />
        <Examples />
        <GetStarted />
      </main>
      <Footer />
    </AuthNoticeProvider>
  );
}
