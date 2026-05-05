import type { AgentDiscovery } from "@agents/core/agent";

export type ConfigPairFilter = "all" | "paired" | "missing_agents" | "missing_claude" | "symlink";
export type ConfigPairSort = "path" | "status";

type ConfigPair = AgentDiscovery.ConfigPair;
type ConfigFile = AgentDiscovery.ConfigFile;

const STATUS_ORDER: Record<AgentDiscovery.ConfigPair["status"], number> = {
  paired: 0,
  missing_claude: 1,
  missing_agents: 2,
};

export function formatDirectoryLabel(directory: string): string {
  return directory || "repo root";
}

export function getConfigPairStatus(pair: ConfigPair): {
  icon: string;
  label: string;
  tone: "success" | "warning" | "danger";
} {
  if (pair.status === "paired") {
    return {
      icon: pair.hasSymlink ? "⌘" : "✓",
      label: pair.hasSymlink ? "paired with symlink" : "paired",
      tone: pair.hasSymlink ? "warning" : "success",
    };
  }

  if (pair.status === "missing_claude") {
    return { icon: "⚠", label: "CLAUDE.md missing", tone: "warning" };
  }

  return { icon: "✗", label: "AGENTS.md missing", tone: "danger" };
}

export function describeConfigFile(file: ConfigFile | null): string {
  if (!file) return "missing";
  if (!file.isSymlink || file.originalPath === file.path) return file.path;
  return `${file.path} -> ${file.originalPath}`;
}

export function validateConfigContent(content: string): string[] {
  const errors: string[] = [];
  if (!content.trim()) {
    errors.push("Content cannot be empty.");
    return errors;
  }

  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return errors;

  const closingIndex = normalized.indexOf("\n---\n", 4);
  const closesAtEnd = normalized.endsWith("\n---") ? normalized.length - 4 : -1;
  if (closingIndex === -1 && closesAtEnd === -1) {
    errors.push("Frontmatter must be closed with a matching --- line.");
  }

  return errors;
}

export function generateClaudeTemplate(input: {
  directory: string;
  agentsPath?: string | null;
  instructions?: string;
}): string {
  const scope = formatDirectoryLabel(input.directory);
  const instructions = input.instructions?.trim();
  const agentsPath = input.agentsPath ?? (input.directory ? `${input.directory}/AGENTS.md` : "AGENTS.md");

  return [
    "# CLAUDE.md",
    "",
    `Use \`${agentsPath}\` as the shared source of truth for ${scope}.`,
    "",
    "## Claude Notes",
    "",
    "- Keep edits minimal and aligned with existing repository patterns.",
    "- Prefer direct, factual progress updates while working.",
    "- Validate the changed files before finishing and call out remaining risks.",
    ...(instructions
      ? ["", "## Additional Context", "", instructions]
      : ["", "## Additional Context", "", "Add any Claude-specific guidance for this directory here."]),
  ].join("\n");
}

export function filterAndSortConfigPairs(
  pairs: ConfigPair[],
  options: { search: string; filter: ConfigPairFilter; sort: ConfigPairSort },
): ConfigPair[] {
  const query = options.search.trim().toLowerCase();

  return pairs
    .filter((pair) => {
      if (options.filter === "paired" && pair.status !== "paired") return false;
      if (options.filter === "missing_agents" && pair.status !== "missing_agents") return false;
      if (options.filter === "missing_claude" && pair.status !== "missing_claude") return false;
      if (options.filter === "symlink" && !pair.hasSymlink) return false;

      if (!query) return true;

      const haystack = [
        pair.directory,
        pair.agents?.path,
        pair.agents?.originalPath,
        pair.claude?.path,
        pair.claude?.originalPath,
        getConfigPairStatus(pair).label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    })
    .sort((left, right) => {
      if (options.sort === "status") {
        const statusDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
        if (statusDelta !== 0) return statusDelta;
      }

      const leftPath = left.directory || left.agents?.path || left.claude?.path || "";
      const rightPath = right.directory || right.agents?.path || right.claude?.path || "";
      return leftPath.localeCompare(rightPath);
    });
}
