"use client";

import { useEffect, useMemo, useRef } from "react";
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
  onSelect?: (node: GraphNode) => void;
}

interface RenderNode extends GraphNode {
  x?: number;
  y?: number;
  z?: number;
}

export default function Graph3D({ graph, highlighted, onSelect }: Props) {
  const graphRef = useRef<ForceGraphMethods<RenderNode, GraphLink> | undefined>(undefined);
  const highlightSet = useMemo(() => new Set(highlighted), [highlighted]);
  const newest = highlighted[highlighted.length - 1];

  // Fly to the most recently mentioned node.
  useEffect(() => {
    if (!newest || !graphRef.current) return;
    const node = graph.nodes.find((candidate) => candidate.id === newest) as RenderNode | undefined;
    if (!node || node.x === undefined) return;

    const { x = 0, y = 0, z = 0 } = node;
    const distance = 160;
    const ratio = 1 + distance / Math.max(1, Math.hypot(x, y, z));
    graphRef.current.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio }, { x, y, z }, 1200);
  }, [newest, graph.nodes]);

  return (
    <ForceGraph3D<RenderNode, GraphLink>
      ref={graphRef}
      graphData={graph as { nodes: RenderNode[]; links: GraphLink[] }}
      backgroundColor="rgba(0,0,0,0)"
      showNavInfo={false}
      nodeLabel={(node) => `<div class="graph-tip"><strong>${node.title}</strong><br/>${
        node.center ?? node.source
      } · ${node.type}</div>`}
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
  );
}

/** force-graph replaces string endpoints with node objects once it has laid out. */
function linkEnd(end: GraphLink["source"] | GraphNode): string {
  return typeof end === "string" ? end : (end as GraphNode).id;
}
