// Agent name aliases → canonical ID
const ALIASES: Record<string, string> = {
  claude: "claude-code",
  "claude-code": "claude-code",
  claudecode: "claude-code",
  codex: "codex",
  opencode: "opencode",
};

/** Resolve an agent name to its canonical ID. Returns input lowercased if no alias found. */
export function resolveAgent(name: string): string {
  return ALIASES[name.toLowerCase()] ?? name.toLowerCase();
}

/** Split a model string into base model and provider.
 *  Handles `provider/model` format (e.g. opencode's `anthropic/claude-sonnet-4-20250514`)
 *  and plain model names (e.g. `claude-sonnet-4-20250514`). */
export function resolveModel(model: string): { model: string; provider: string | null } {
  const slash = model.indexOf("/");
  if (slash > 0 && slash < model.length - 1) {
    return { provider: model.slice(0, slash), model: model.slice(slash + 1) };
  }
  return { model, provider: null };
}
