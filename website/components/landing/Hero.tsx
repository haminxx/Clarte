"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Mic } from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { AsciiOrb } from "@/components/ui/ascii-voice-orb";
import { fetchGraph } from "@/lib/api";
import { GOOGLE_URL, REPO_URL, SESSION_PATH } from "@/lib/links";
import { previewGraph } from "@/lib/preview-graph";
import type { GraphNode, GraphPayload } from "@/lib/types";
import ConstellationGraph, { DOMAINS } from "./ConstellationGraph";
import { GoogleG } from "./icons";

const Graph3D = dynamic(() => import("@/components/Graph3D"), {
  ssr: false,
  loading: () => null,
});

const EXAMPLE_CHIPS = [
  "NASA T2 · Satellite thermal control patent ↗",
  "arXiv · Phase-change materials for battery cooling ↗",
  "NASA NTRS · Passive heat rejection study ↗",
  "arXiv · Bio-inspired adhesion for grippers ↗",
  "NASA T2 · Radiation-hardened sensor patent ↗",
];

function useFakeVoice() {
  const reduced = useReducedMotion();
  return () => {
    if (reduced) return 0.15;
    const t = performance.now() / 1000;
    const phrase = (Math.sin(t * 0.7) + 1) / 2;
    return phrase * (Math.max(0, Math.sin(t * 6.2)) * 0.7 + Math.max(0, Math.sin(t * 9.1 + 1)) * 0.3);
  };
}

function chipLabel(node: GraphNode): string {
  const source = node.source || node.type;
  return `${source} · ${node.title}`;
}

export default function Hero() {
  const level = useFakeVoice();
  const reduced = useReducedMotion();
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [live, setLive] = useState(false);
  const [chipIndex, setChipIndex] = useState(0);
  const [highlight, setHighlight] = useState<string[]>([]);

  useEffect(() => {
    let cancel = false;
    fetchGraph(160)
      .then((payload) => {
        if (cancel) return;
        if (payload.nodes?.length) {
          setGraph(payload);
          setLive(true);
        } else {
          setGraph(previewGraph());
        }
      })
      .catch(() => {
        if (!cancel) setGraph(previewGraph());
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (reduced || !graph?.nodes.length) return;
    const nodes = graph.nodes;
    const timer = window.setInterval(() => {
      setChipIndex((current) => {
        const next = current + 1;
        const start = next % nodes.length;
        setHighlight(nodes.slice(start, start + 6).map((node) => node.id));
        return next;
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [reduced, graph]);

  const liveNode = live && graph?.nodes.length ? graph.nodes[chipIndex % graph.nodes.length] : null;
  const exampleChip = EXAMPLE_CHIPS[chipIndex % EXAMPLE_CHIPS.length];

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="glow-top pointer-events-none absolute inset-0" aria-hidden />
      <div className="hairline-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_30%,black,transparent_70%)]" aria-hidden />
      <div className="relative mx-auto grid min-h-[calc(100vh-64px)] max-w-container items-center gap-10 px-4 pb-16 pt-12 md:px-6 xl:grid-cols-[1.05fr_1fr] xl:pt-8">
        <div className="relative z-10 text-center xl:text-left">
          <a href={REPO_URL} className="group inline-flex items-center rounded-full border border-line bg-surface/80 px-3.5 py-1 text-[13px] transition-colors hover:border-accent/50">
            <span className="mr-2 rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[.08em] text-accent">New</span>
            <AnimatedShinyText className="inline-flex items-center">Built at SpaceXAI Hack Day, UC San Diego</AnimatedShinyText>
            <ArrowRight className="ml-1.5 h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>
          <p className="eyebrow mt-8">Voice-first research partner</p>
          <h1 className="display mt-4 text-[40px] font-semibold leading-[44px] text-ink sm:text-[52px] sm:leading-[58px] lg:text-[64px] lg:leading-[72px]">
            Think <span className="font-serif font-normal italic tracking-[-0.01em] text-accent">out loud.</span> Find the technology that already exists.
          </h1>
          <p className="mx-auto mt-6 max-w-[600px] text-[17px] leading-[28px] text-muted xl:mx-0">
            Clarte is a voice brainstorm partner backed by a 3D map of papers and patents. It asks why, connects your problem to technology from other fields, argues back, and cites every source.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row xl:justify-start">
            <a href={SESSION_PATH} aria-label="Start talking to Clarte Coach" className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-bg shadow-[0_0_40px_-8px_rgba(124,156,255,.6)] transition-transform duration-200 hover:-translate-y-px">
              <Mic className="h-4 w-4" aria-hidden /> Start talking
            </a>
            <a href={GOOGLE_URL} className="inline-flex h-12 items-center gap-2.5 rounded-full border border-line bg-surface px-6 text-[15px] font-medium text-ink transition-colors hover:bg-surface-2">
              <GoogleG /> Continue with Google
            </a>
          </div>
          <a href="#how" className="mt-5 inline-block text-sm text-muted underline-offset-4 hover:text-ink hover:underline">See how a session works →</a>
          <p className="mt-8 font-mono text-[12px] uppercase tracking-[.08em] text-dim">
            Free to try · No sign-in needed to brainstorm · Every claim links to its source
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[600px]">
          <p className="sr-only">
            Clarte&apos;s knowledge graph: papers and patents as a 3D constellation, with a voice orb at the center and citation chips for the sources Clarte Coach names.
          </p>
          <div className="absolute inset-0 overflow-hidden rounded-full" aria-hidden>
            {reduced || !graph ? (
              <ConstellationGraph className="absolute inset-0" />
            ) : (
              <div className="pointer-events-none absolute inset-0">
                <Graph3D
                  graph={graph}
                  highlighted={highlight}
                  followHighlight={false}
                  autoRotate
                  interactive={false}
                />
              </div>
            )}
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
            <div className="rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,.28),rgba(124,156,255,.08),transparent)] p-4">
              <AsciiOrb state="speaking" level={level} color="#c4cffd" size="clamp(120px, 28vw, 190px)" fontSize={7} glow={0.6} />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-[6%] flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={liveNode?.id ?? exampleChip}
                initial={reduced ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduced ? undefined : { opacity: 0, y: -8, filter: "blur(6px)" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex max-w-[90%] items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1.5 font-mono text-[12px] text-muted backdrop-blur"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" style={{ background: DOMAINS[chipIndex % DOMAINS.length].color }} />
                {liveNode?.url ? (
                  <a className="pointer-events-auto truncate text-muted hover:text-ink" href={liveNode.url} target="_blank" rel="noreferrer">
                    {chipLabel(liveNode)} ↗
                  </a>
                ) : (
                  <span className="truncate">{liveNode ? `${chipLabel(liveNode)} ↗` : exampleChip}</span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="absolute left-[4%] top-[8%] hidden rounded-xl border border-line bg-surface/85 px-3 py-2 text-left backdrop-blur sm:block" aria-hidden>
            <p className="font-mono text-[10px] uppercase tracking-[.08em] text-dim">Clarte Coach · listening</p>
            <p className="mt-1 max-w-[220px] text-[13px] leading-5 text-ink">“Why do you think it drains so fast?”</p>
          </div>
        </div>
      </div>
    </section>
  );
}
