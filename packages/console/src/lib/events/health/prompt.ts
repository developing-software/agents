/**
 * Per-item and selection-based AI prompt generation for fallow reports.
 */

// --- single-item prompts ---

export function hotspotPrompt(h: any): string {
  const lines = [
    `Refactor \`${h.path}\` to reduce complexity.`,
    "",
    `Hotspot score ${h.score}, ${h.commits} commits, trend: ${h.trend}.`,
  ];
  if (Array.isArray(h.actions)) {
    for (const a of h.actions) {
      lines.push(`- ${a.description ?? a}`);
    }
  }
  lines.push("", "Verify: bun run fallow:health");
  return lines.join("\n");
}

export function unusedFilePrompt(file: any): string {
  const path = typeof file === "string" ? file : file.path;
  return `Remove unused file \`${path}\`.

Delete this file — it has no imports pointing to it.
If intentionally kept, add \`// fallow-ignore-file unused-file\` at the top.

Verify: bun run fallow:dead-code`;
}

export function unusedExportPrompt(exp: any): string {
  const loc = exp.line != null ? `:${exp.line}` : "";
  return `Remove unused export \`${exp.export_name}\` from \`${exp.path}${loc}\`.

Remove the \`export\` keyword, or delete the declaration if the function itself is unused.

Verify: bun run fallow:dead-code`;
}

export function cloneGroupPrompt(group: any): string {
  const lines = [
    `Extract duplicated code into a shared module (${group.line_count ?? "?"} lines, ${group.instances?.length ?? "?"} instances):`,
    "",
  ];
  if (Array.isArray(group.instances)) {
    for (const inst of group.instances) {
      lines.push(`  ${inst.file ?? inst.path ?? "?"}:${inst.start_line}-${inst.end_line}`);
    }
    const frag = group.instances[0]?.fragment;
    if (frag) {
      const trimmed = frag.length > 400 ? frag.slice(0, 400) + "..." : frag;
      lines.push("", "```", trimmed, "```");
    }
  }
  lines.push("", "Verify: bun run fallow:dupes");
  return lines.join("\n");
}

// --- selection prompts ---

export function healthSelectionPrompt(hotspots: any[], style: "fix" | "plan"): string {
  const header =
    style === "plan"
      ? `Create a plan to refactor these ${hotspots.length} hotspot files:`
      : `Refactor these ${hotspots.length} hotspot files to reduce complexity:`;

  const lines = [header, ""];
  for (const h of hotspots) {
    lines.push(`- \`${h.path}\` — score ${h.score}, ${h.commits} commits, ${h.trend}`);
    if (Array.isArray(h.actions)) {
      for (const a of h.actions) {
        lines.push(`  ${a.description ?? a}`);
      }
    }
  }

  if (style === "plan") {
    lines.push("", "For each file, outline: the problem, proposed fix, and any risks.");
  }
  lines.push("", "Verify: bun run fallow:health");
  return lines.join("\n");
}

export function deadCodeSelectionPrompt(
  items: { files: any[]; exports: any[]; types: any[] },
  style: "fix" | "plan",
): string {
  const total = items.files.length + items.exports.length + items.types.length;
  const header =
    style === "plan"
      ? `Create a plan to remove these ${total} dead code items:`
      : `Remove these ${total} dead code items:`;

  const lines = [header];

  if (items.files.length > 0) {
    lines.push("", "Unused files:");
    for (const f of items.files) {
      const path = typeof f === "string" ? f : f.path;
      lines.push(`- \`${path}\``);
    }
  }

  if (items.exports.length > 0) {
    lines.push("", "Unused exports:");
    for (const e of items.exports) {
      const loc = e.line != null ? `:${e.line}` : "";
      lines.push(`- \`${e.path}${loc}\` — \`${e.export_name}\``);
    }
  }

  if (items.types.length > 0) {
    lines.push("", "Unused types:");
    for (const t of items.types) {
      const loc = t.line != null ? `:${t.line}` : "";
      lines.push(`- \`${t.path}${loc}\` — \`${t.export_name}\``);
    }
  }

  if (style === "plan") {
    lines.push("", "For each item, confirm it's safe to remove and note any side effects.");
  }
  lines.push("", "Verify: bun run fallow:dead-code");
  return lines.join("\n");
}

export function dupesSelectionPrompt(groups: any[], style: "fix" | "plan"): string {
  const header =
    style === "plan"
      ? `Create a plan to deduplicate these ${groups.length} clone groups:`
      : `Extract shared code from these ${groups.length} clone groups:`;

  const lines = [header];

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    lines.push(
      "",
      `${i + 1}. Clone group (${g.line_count ?? "?"} lines, ${g.token_count ?? "?"} tokens):`,
    );
    if (Array.isArray(g.instances)) {
      for (const inst of g.instances) {
        lines.push(`   ${inst.file ?? inst.path ?? "?"}:${inst.start_line}-${inst.end_line}`);
      }
    }
  }

  if (style === "plan") {
    lines.push("", "For each group, propose where to put the shared code and how to import it.");
  }
  lines.push("", "Verify: bun run fallow:dupes");
  return lines.join("\n");
}
