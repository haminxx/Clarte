import type { DocType, GraphPayload } from "./types";

const DOMAINS = ["Space", "Energy", "Materials", "Bio", "Electronics"] as const;
const TYPES: DocType[] = ["patent", "paper", "report", "software", "spinoff"];

/** Structural stand-in when the API graph is unreachable. Titles are domains, not invented papers. */
export function previewGraph(count = 140): GraphPayload {
  const nodes = Array.from({ length: count }, (_, index) => {
    const domain = DOMAINS[index % DOMAINS.length];
    return {
      id: `preview-${index}`,
      title: `${domain} technology`,
      type: TYPES[index % TYPES.length],
      source: domain,
      domains: [domain],
      url: "",
      center: null,
    };
  });

  const links = [];
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    links.push({
      source: nodes[index].id,
      target: nodes[next].id,
      weight: 0.4,
      reason: null,
      crossDomain: nodes[index].domains[0] !== nodes[next].domains[0],
    });
    if (index % 7 === 0) {
      const jump = nodes[(index + 17) % count];
      links.push({
        source: nodes[index].id,
        target: jump.id,
        weight: 0.8,
        reason: null,
        crossDomain: nodes[index].domains[0] !== jump.domains[0],
      });
    }
  }

  return { nodes, links };
}
