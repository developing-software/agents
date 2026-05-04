import type { AgentDiscovery } from "@agents/core/agent";

export type ConfigStatusFilter = "all" | "paired" | "missing" | "symlinked";
export type ConfigSortMode = "directory" | "status";

export function hasSymlinks(pair: AgentDiscovery.ConfigPair): boolean {
  return pair.aliases.length > 0 || pair.agents.isSymlink || !!pair.claude?.isSymlink;
}

export function statusIcon(pair: AgentDiscovery.ConfigPair): string {
  if (hasSymlinks(pair)) return "⌘";
  if (pair.status === "paired") return "✓";
  return "✗";
}

export function statusLabel(pair: AgentDiscovery.ConfigPair): string {
  if (hasSymlinks(pair) && pair.status === "paired") return "paired + symlinks";
  if (pair.status === "paired") return "paired";
  return hasSymlinks(pair) ? "symlinked copy hidden" : "missing CLAUDE.md";
}

export function filterAndSortPairs(input: {
  pairs: AgentDiscovery.ConfigPair[];
  search: string;
  statusFilter: ConfigStatusFilter;
  sortMode: ConfigSortMode;
}) {
  const query = input.search.trim().toLowerCase();
  return input.pairs
    .filter((pair) => {
      const matchesQuery =
        !query ||
        pair.directory.toLowerCase().includes(query) ||
        pair.agents.path.toLowerCase().includes(query) ||
        (pair.claude?.path.toLowerCase().includes(query) ?? false);

      const matchesStatus =
        input.statusFilter === "all"
          ? true
          : input.statusFilter === "paired"
            ? pair.status === "paired"
            : input.statusFilter === "missing"
              ? pair.status === "missing_claude"
              : hasSymlinks(pair);

      return matchesQuery && matchesStatus;
    })
    .sort((left, right) => {
      if (input.sortMode === "status" && left.status !== right.status) {
        return left.status === "missing_claude" ? -1 : 1;
      }
      return left.directory.localeCompare(right.directory);
    });
}
