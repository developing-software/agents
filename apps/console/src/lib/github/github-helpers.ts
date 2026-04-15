// Shared utility functions for GitHub issue/PR rendering

export function issueStateColor(state: string): string {
  return state === "open" ? "var(--color-success)" : "var(--color-dim)";
}

export function prStateColor(state: string): string {
  if (state === "open") return "var(--color-success)";
  if (state === "merged") return "var(--color-merged)";
  return "var(--color-danger)";
}

export function issueStateDotStyle(state: string): string {
  return `background: ${issueStateColor(state)};`;
}

export function prStateDotStyle(state: string): string {
  const color = prStateColor(state);
  const glow = state === "open" ? `box-shadow: 0 0 5px ${color};` : "";
  return `background: ${color}; ${glow}`;
}
