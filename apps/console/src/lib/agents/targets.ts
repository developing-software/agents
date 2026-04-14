/**
 * Agent CLI targets for the "Copy to agent" component.
 *
 * Each target formats a prompt as a shell command that launches the agent CLI
 * with the prompt pre-filled. Targets are data — projects can extend this
 * registry by pushing to AGENT_TARGETS or by passing a custom list to
 * <CopyToAgent targets={...} />.
 */

export interface AgentTarget {
  id: string;
  name: string;
  description?: string;
  /** Format a prompt as a shell command that launches the agent with it prefilled. */
  format: (prompt: string) => string;
}

/** Single-quote a string for POSIX shells, escaping embedded single quotes. */
function sq(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/** Build a heredoc for multi-line prompts. Single-quoted delimiter => no interpolation. */
function heredoc(cmd: string, prompt: string, delim = "PROMPT_END"): string {
  return `${cmd} <<'${delim}'\n${prompt}\n${delim}`;
}

/** Use a heredoc for multi-line prompts, inline quotes otherwise. */
function smart(cmd: string, prompt: string): string {
  return prompt.includes("\n") ? heredoc(cmd, prompt) : `${cmd} ${sq(prompt)}`;
}

export const AGENT_TARGETS: AgentTarget[] = [
  {
    id: "plain",
    name: "Plain text",
    description: "just the prompt",
    format: (p) => p,
  },
  {
    id: "claude",
    name: "Claude Code",
    description: "claude CLI",
    format: (p) => smart("claude", p),
  },
  {
    id: "codex",
    name: "Codex",
    description: "codex CLI",
    format: (p) => smart("codex", p),
  },
  {
    id: "aider",
    name: "Aider",
    description: "aider --message",
    format: (p) => (p.includes("\n") ? `aider --message ${sq(p)}` : `aider --message ${sq(p)}`),
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "gemini CLI",
    format: (p) => smart("gemini", p),
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "opencode run",
    format: (p) => smart("opencode run", p),
  },
];

export function formatForAgent(target: AgentTarget, prompt: string): string {
  return target.format(prompt);
}
