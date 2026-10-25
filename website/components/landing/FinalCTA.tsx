"use client";

import { AuroraBackground } from "@/components/ui/aurora-background";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { GOOGLE_URL, SESSION_PATH } from "@/lib/links";
import { GoogleG } from "./icons";
import { Reveal } from "./Reveal";

export default function FinalCTA() {
  return (
    <section className="px-4 py-16 md:px-6 md:py-24" aria-labelledby="cta">
      <AuroraBackground className="mx-auto max-w-container overflow-hidden rounded-3xl border border-line py-24 md:py-32" showRadialGradient>
        <Reveal className="relative z-10 flex flex-col items-center px-6 text-center">
          <div className="mb-8 h-14 w-14 animate-orb-pulse rounded-full bg-[radial-gradient(circle_at_35%_30%,#c4cffd,#7C9CFF_45%,#A78BFA_75%,transparent)] shadow-[0_0_50px_-4px_rgba(124,156,255,.8)]" aria-hidden />
          <h2 id="cta" className="display max-w-[760px] text-[32px] font-semibold leading-[40px] text-ink md:text-[48px] md:leading-[56px]">
            Bring a problem. Leave with an idea you can <span className="font-serif font-normal italic">defend.</span>
          </h2>
          <p className="mt-5 max-w-[560px] text-[17px] leading-[28px] text-muted">
            Free to try. Brainstorming, the graph and sources work without an account. Sign in to save sessions and unlock visuals.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <a href={GOOGLE_URL} className="inline-flex h-12 items-center gap-3 rounded-full bg-white px-6 text-[15px] font-medium text-[#1f1f1f] transition-transform duration-200 hover:-translate-y-px">
              <GoogleG /> Continue with Google
            </a>
            <ShimmerButton
              onClick={() => {
                window.location.assign(SESSION_PATH);
              }}
              background="rgba(7,8,10,0.85)"
              shimmerColor="#7C9CFF"
              className="h-12 px-6 text-[15px] font-medium"
            >
              Start without signing in
            </ShimmerButton>
          </div>
          <p className="mt-6 text-[13px] text-dim">
            By continuing you agree to the <a className="underline-offset-4 hover:underline" href="/terms">Terms</a> and{" "}
            <a className="underline-offset-4 hover:underline" href="/privacy">Privacy Policy</a>.
          </p>
        </Reveal>
      </AuroraBackground>
    </section>
  );
}
