import { describe, expect, test } from "bun:test";
import { filterAndSortPairs, hasSymlinks, statusIcon, statusLabel } from "./page";

const pairs: Parameters<typeof hasSymlinks>[0][] = [
  {
    directory: "",
    status: "paired",
    agents: {
      path: "AGENTS.md",
      sha: "a1",
      canonicalPath: "AGENTS.md",
      isSymlink: false,
      symlinkTarget: null,
    },
    claude: {
      path: "CLAUDE.md",
      sha: "c1",
      canonicalPath: "CLAUDE.md",
      isSymlink: false,
      symlinkTarget: null,
    },
    aliases: [],
  },
  {
    directory: "packages/core",
    status: "missing_claude",
    agents: {
      path: "packages/core/AGENTS.md",
      sha: "a2",
      canonicalPath: "packages/core/AGENTS.md",
      isSymlink: false,
      symlinkTarget: null,
    },
    claude: null,
    aliases: [
      {
        kind: "agents",
        path: "docs/AGENTS.md",
        canonicalPath: "packages/core/AGENTS.md",
      },
    ],
  },
];

describe("config page helpers", () => {
  test("marks symlinked rows distinctly", () => {
    expect(hasSymlinks(pairs[1])).toBe(true);
    expect(statusIcon(pairs[1])).toBe("⌘");
    expect(statusLabel(pairs[1])).toBe("symlinked copy hidden");
  });

  test("filters and sorts pairs", () => {
    const filtered = filterAndSortPairs({
      pairs: [...pairs],
      search: "packages",
      statusFilter: "missing",
      sortMode: "status",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.directory).toBe("packages/core");
  });
});
