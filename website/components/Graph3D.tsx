"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import type { GraphLink, GraphNode, GraphPayload } from "@/lib/types";

/**
 * The library as a constellation. Every document is a node; edges are the top-5
 * similarity links from ingest. Nodes the coach mentions light up and pull the
 * camera toward them, which is the "the graph is listening" moment in the demo.
 */

const TYPE_COLORS: Record<string, string> = {
  patent: "#ffb347",
  paper: "#6ec6ff",
  report: "#b388ff",
  software: "#69f0ae",
  spinoff: "#ff8a80",
};

const DIM = "#2b3a5c";

interface Props {
  graph: GraphPayload;
  highlighted: string[];
  /** Bumps when a source row is clicked so the camera flies even if the id did not change. */
  focusId?: string | null;
  focusToken?: number;
  /** Session view flies to new mentions. The landing hero leaves the camera alone. */
  followHighlight?: boolean;
  /** Slow orbit for the landing hero. */
  autoRotate?: boolean;
  /** Pointer drag and node clicks. Off in the hero so the page can scroll. */
  interactive?: boolean;
  onSelect?: (node: GraphNode) => void;
}

interface RenderNode extends GraphNode {
  x?: number;
  y?: number;
  z?: number;
}

export default function Graph3D({
  graph,
  highlighted,
  focusId,
  focusToken = 0,
  followHighlight = true,
  autoRotate = false,
  interactive = true,
  onSelect,
}: Props) {
  const graphRef = useRef<ForceGraphMethods<RenderNode, GraphLink> | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 640 });
  const highlightSet = useMemo(() => new Set(highlighted), [highlighted]);
  const newest = highlighted[highlighted.length - 1];

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const flyTo = (id: string | null | undefined) => {
    if (!id || !graphRef.current) return;
    const node = graph.nodes.find((candidate) => candidate.id === id) as RenderNode | undefined;
    if (!node || node.x === undefined || node.y === undefined || node.z === undefined) return;
    const { x = 0, y = 0, z = 0 } = node;
    const distance = 160;
    const ratio = 1 + distance / Math.max(1, Math.hypot(x, y, z));
    graphRef.current.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio }, { x, y, z }, 1200);
  };

  useEffect(() => {
    if (!followHighlight) return;
    flyTo(newest);
    // flyTo closes over the latest graph; newest is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest, graph.nodes, followHighlight]);

  useEffect(() => {
    if (!autoRotate || !graphRef.current) return;
    try {
      const controls = graphRef.current.controls() as { autoRotate?: boolean; autoRotateSpeed?: number };
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
    } catch {
      // Controls attach after the first WebGL frame.
    }
  }, [autoRotate, size.width, size.height, graph.nodes]);

  // A source click focuses that node even when it is not the newest mention.
  useEffect(() => {
    flyTo(focusId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, focusToken, graph.nodes]);

  return (
    <div ref={boxRef} className="graph-fill">
    <ForceGraph3D<RenderNode, GraphLink>
      ref={graphRef}
      width={size.width}
      height={size.height}
      graphData={graph as { nodes: RenderNode[]; links: GraphLink[] }}
      backgroundColor="rgba(0,0,0,0)"
      showNavInfo={false}
      enableNavigationControls={interactive}
      enablePointerInteraction={interactive}
      nodeLabel={(node) => `<div class="graph-tip"><strong>${escapeHtml(node.title)}</strong><br/>${escapeHtml(
        node.center ?? node.source,
      )} · ${escapeHtml(node.type)}</div>`}
      nodeColor={(node) =>
        highlightSet.has(node.id) ? (TYPE_COLORS[node.type] ?? "#ffffff") : DIM
      }
      nodeVal={(node) => (highlightSet.has(node.id) ? 6 : 1.4)}
      nodeOpacity={0.95}
      nodeResolution={10}
      linkColor={(link) => (link.crossDomain ? "#5f6fa8" : "#23304d")}
      linkWidth={(link) =>
        highlightSet.has(linkEnd(link.source)) || highlightSet.has(linkEnd(link.target)) ? 1.4 : 0.3
      }
      linkOpacity={0.35}
      linkDirectionalParticles={(link) =>
        highlightSet.has(linkEnd(link.source)) || highlightSet.has(linkEnd(link.target)) ? 2 : 0
      }
      linkDirectionalParticleSpeed={0.006}
      warmupTicks={40}
      cooldownTicks={120}
      onNodeClick={(node) => onSelect?.(node)}
    />
    </div>
  );
}

/** force-graph replaces string endpoints with node objects once it has laid out. */
function linkEnd(end: GraphLink["source"] | GraphNode): string {
  return typeof end === "string" ? end : (end as GraphNode).id;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
