import { describe, expect, test } from "bun:test";
import { AgentDiscovery } from "../src/agent";
import type { NormalizedDirEntry, NormalizedTreeEntry } from "../src/git";

function file(path: string, sha: string): NormalizedTreeEntry {
  return { type: "blob", path, sha };
}

function symlink(path: string, sha: string): NormalizedTreeEntry {
  return { type: "symlink", path, sha, mode: "120000" };
}

function dirEntry(
  path: string,
  type: NormalizedDirEntry["type"],
  target?: string,
): NormalizedDirEntry {
  return {
    type,
    name: path.split("/").pop() ?? path,
    path,
    sha: `${path}-sha`,
    size: 1,
    target,
  };
}

describe("AgentDiscovery.buildConfigPairs", () => {
  test("groups AGENTS.md and CLAUDE.md by directory without cross-directory matching", () => {
    const tree: NormalizedTreeEntry[] = [
      file("AGENTS.md", "root-agents"),
      file("packages/core/AGENTS.md", "core-agents"),
      file("packages/core/CLAUDE.md", "core-claude"),
      file("libs/forjero-sdk/CLAUDE.md", "sdk-claude"),
      file("packages/core/agents.md", "wrong-case"),
    ];

    const pairs = AgentDiscovery.buildConfigPairs(tree, {
      "": [dirEntry("AGENTS.md", "file")],
      "packages/core": [
        dirEntry("packages/core/AGENTS.md", "file"),
        dirEntry("packages/core/CLAUDE.md", "file"),
      ],
      "libs/forjero-sdk": [dirEntry("libs/forjero-sdk/CLAUDE.md", "file")],
    });

    expect(pairs).toHaveLength(3);
    expect(pairs.map((pair) => [pair.directory, pair.status])).toEqual([
      ["", "missing_claude"],
      ["libs/forjero-sdk", "missing_agents"],
      ["packages/core", "paired"],
    ]);
    expect(pairs[2]?.agents?.path).toBe("packages/core/AGENTS.md");
    expect(pairs[2]?.claude?.path).toBe("packages/core/CLAUDE.md");
  });

  test("resolves symlink metadata to the original repo path", () => {
    const tree: NormalizedTreeEntry[] = [
      file("apps/console/AGENTS.md", "agents"),
      symlink("apps/console/CLAUDE.md", "claude-link"),
    ];

    const pairs = AgentDiscovery.buildConfigPairs(tree, {
      "apps/console": [
        dirEntry("apps/console/AGENTS.md", "file"),
        dirEntry("apps/console/CLAUDE.md", "symlink", "AGENTS.md"),
      ],
    });

    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({
      directory: "apps/console",
      status: "paired",
      hasSymlink: true,
      agents: {
        isSymlink: false,
        originalPath: "apps/console/AGENTS.md",
      },
      claude: {
        isSymlink: true,
        targetPath: "apps/console/AGENTS.md",
        originalPath: "apps/console/AGENTS.md",
      },
    });
  });

  test("ignores symlink targets that escape the repository root", () => {
    const tree: NormalizedTreeEntry[] = [symlink("docs/CLAUDE.md", "claude-link")];

    const pairs = AgentDiscovery.buildConfigPairs(tree, {
      docs: [dirEntry("docs/CLAUDE.md", "symlink", "../../outside/CLAUDE.md")],
    });

    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.claude).toMatchObject({
      isSymlink: true,
      targetPath: null,
      originalPath: "docs/CLAUDE.md",
    });
  });
});
