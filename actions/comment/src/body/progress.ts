import { COMMENT_MARKER, type ProgressInputs } from "../types";

/**
 * Build the comment body for the "progress" phase.
 * Shows a simple table with the agent/model and a running indicator.
 */
export function buildProgressBody(inputs: ProgressInputs): string {
  const { agent, model, runUrl, branch } = inputs;

  const lines: string[] = [
    COMMENT_MARKER,
    "## Agent Run",
    "",
    "| Agent | Model | Status | Run |",
    "|-------|-------|--------|-----|",
    `| ${agent} | ${model ?? "---"} | :hourglass_flowing_sand: Running | [View](${runUrl}) |`,
    "",
  ];

  if (branch) {
    lines.push(`Branch: \`${branch}\``, "");
  }

  lines.push("_In progress..._");

  return lines.join("\n");
}
