import type { CitationView, IdeaCard, VisualView } from "./types";
import { sourceLabel } from "./types";

/** Markdown idea card, visuals, and numbered references. */
export function renderReport(input: {
  stage: string;
  rootCause: string | null;
  idea: IdeaCard | null;
  citations: CitationView[];
  visuals: VisualView[];
}): string {
  const lines: string[] = ["# Clarte idea card", ""];
  if (!input.idea) {
    lines.push("The idea is not confirmed yet.", "");
    if (input.rootCause) lines.push(`**Root cause so far:** ${input.rootCause}`, "");
  } else {
    lines.push(
      `**Problem:** ${input.idea.problem}`,
      "",
      `**Root cause:** ${input.idea.rootCause || input.rootCause || ""}`,
      "",
      `**Solution:** ${input.idea.solution}`,
      "",
      `**Risk:** ${input.idea.risk}`,
      "",
    );
  }

  lines.push(`**Stage:** ${input.stage}`, "", "## Visuals", "");
  if (!input.visuals.length) {
    lines.push("No visuals yet.", "");
  } else {
    for (const visual of input.visuals) {
      lines.push(`- **${visual.kind}** (${visual.model ?? "unknown"})`);
      if (visual.imageUrl) lines.push(`  ${visual.imageUrl}`);
      else lines.push("  Not generated.");
      if (visual.prompt) lines.push(`  ${visual.prompt}`);
    }
    lines.push("");
  }

  lines.push("## References", "");
  if (!input.citations.length) {
    lines.push("No sources cited yet.", "");
  } else {
    input.citations.forEach((citation, index) => {
      const label = sourceLabel(citation.source);
      const link = citation.url ? `[${citation.title}](${citation.url})` : citation.title;
      lines.push(`${index + 1}. ${link} — ${label} — ${citation.type}`);
    });
    lines.push("");
  }
  return lines.join("\n");
}
