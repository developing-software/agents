import { describe, test, expect } from "bun:test";
import { AgentDiscovery } from "./discovery";
import type { NormalizedTreeEntry } from "../git/provider/interface";

function blob(path: string, opts?: { isSymlink?: boolean }): NormalizedTreeEntry {
  return {
    type: "blob",
    path,
    sha: `sha-${path.replace(/\//g, "-")}`,
    isSymlink: opts?.isSymlink,
  };
}

function tree(path: string): NormalizedTreeEntry {
  return { type: "tree", path, sha: `sha-${path}` };
}

describe("AgentDiscovery.matchPairsFromTree", () => {
  test("returns empty array for empty tree", () => {
    expect(AgentDiscovery.matchPairsFromTree([])).toEqual([]);
  });

  test("matches AGENTS.md and CLAUDE.md in root directory", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("AGENTS.md"),
      blob("CLAUDE.md"),
      blob("README.md"),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]!).toEqual({
      directory: ".",
      agentsPath: "AGENTS.md",
      claudePath: "CLAUDE.md",
      agentsSha: "sha-AGENTS.md",
      claudeSha: "sha-CLAUDE.md",
      agentsIsSymlink: false,
      claudeIsSymlink: false,
    });
  });

  test("matches pairs in subdirectories", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("actions/AGENTS.md"),
      blob("actions/CLAUDE.md"),
      blob("apps/cli/AGENTS.md"),
      blob("apps/cli/CLAUDE.md"),
    ]);

    expect(pairs).toHaveLength(2);
    expect(pairs[0]!.directory).toBe("actions");
    expect(pairs[0]!.agentsPath).toBe("actions/AGENTS.md");
    expect(pairs[0]!.claudePath).toBe("actions/CLAUDE.md");
    expect(pairs[1]!.directory).toBe("apps/cli");
  });

  test("shows missing CLAUDE.md when only AGENTS.md exists", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("packages/core/AGENTS.md"),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.agentsPath).toBe("packages/core/AGENTS.md");
    expect(pairs[0]!.claudePath).toBeNull();
    expect(pairs[0]!.claudeSha).toBeNull();
  });

  test("shows missing AGENTS.md when only CLAUDE.md exists", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("packages/core/CLAUDE.md"),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.agentsPath).toBeNull();
    expect(pairs[0]!.claudePath).toBe("packages/core/CLAUDE.md");
  });

  test("does not cross-match across directories", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("apps/web/AGENTS.md"),
      blob("apps/api/CLAUDE.md"),
    ]);

    expect(pairs).toHaveLength(2);
    const webPair = pairs.find((p) => p.directory === "apps/web")!;
    const apiPair = pairs.find((p) => p.directory === "apps/api")!;
    expect(webPair.agentsPath).toBe("apps/web/AGENTS.md");
    expect(webPair.claudePath).toBeNull();
    expect(apiPair.claudePath).toBe("apps/api/CLAUDE.md");
    expect(apiPair.agentsPath).toBeNull();
  });

  test("ignores tree entries (directories)", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      tree("actions"),
      blob("actions/AGENTS.md"),
      tree("apps"),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.agentsPath).toBe("actions/AGENTS.md");
  });

  test("ignores files that are not AGENTS.md or CLAUDE.md", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("AGENTS.md"),
      blob("README.md"),
      blob("package.json"),
      blob("src/index.ts"),
    ]);

    expect(pairs).toHaveLength(1);
  });

  test("detects symlinks on AGENTS.md", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("AGENTS.md"),
      blob("sub/AGENTS.md", { isSymlink: true }),
      blob("sub/CLAUDE.md"),
    ]);

    const subPair = pairs.find((p) => p.directory === "sub")!;
    expect(subPair.agentsIsSymlink).toBe(true);
    expect(subPair.claudeIsSymlink).toBe(false);
  });

  test("detects symlinks on CLAUDE.md", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("sub/AGENTS.md"),
      blob("sub/CLAUDE.md", { isSymlink: true }),
    ]);

    expect(pairs[0]!.claudeIsSymlink).toBe(true);
    expect(pairs[0]!.agentsIsSymlink).toBe(false);
  });

  test("sorts pairs by directory name", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("zzz/AGENTS.md"),
      blob("aaa/AGENTS.md"),
      blob("mmm/AGENTS.md"),
    ]);

    expect(pairs.map((p) => p.directory)).toEqual(["aaa", "mmm", "zzz"]);
  });

  test("root directory sorts before subdirectories", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("sub/AGENTS.md"),
      blob("AGENTS.md"),
    ]);

    expect(pairs[0]!.directory).toBe(".");
    expect(pairs[1]!.directory).toBe("sub");
  });

  test("handles deeply nested directories", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("a/b/c/d/AGENTS.md"),
      blob("a/b/c/d/CLAUDE.md"),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.directory).toBe("a/b/c/d");
    expect(pairs[0]!.agentsPath).toBe("a/b/c/d/AGENTS.md");
    expect(pairs[0]!.claudePath).toBe("a/b/c/d/CLAUDE.md");
  });

  test("is case-sensitive", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("AGENTS.md"),
      blob("agents.md"),
      blob("Claude.md"),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.agentsPath).toBe("AGENTS.md");
  });

  test("handles mixed scenario with root, subdirs, missing, and symlinks", () => {
    const pairs = AgentDiscovery.matchPairsFromTree([
      blob("AGENTS.md"),
      blob("CLAUDE.md"),
      blob("actions/emit/AGENTS.md"),
      blob("apps/console/AGENTS.md"),
      blob("apps/console/CLAUDE.md"),
      blob("apps/cli/AGENTS.md"),
      blob("apps/cli/CLAUDE.md", { isSymlink: true }),
    ]);

    expect(pairs).toHaveLength(4);

    const root = pairs.find((p) => p.directory === ".")!;
    expect(root.agentsPath).toBe("AGENTS.md");
    expect(root.claudePath).toBe("CLAUDE.md");

    const emit = pairs.find((p) => p.directory === "actions/emit")!;
    expect(emit.agentsPath).toBe("actions/emit/AGENTS.md");
    expect(emit.claudePath).toBeNull();

    const consolePair = pairs.find((p) => p.directory === "apps/console")!;
    expect(consolePair.agentsPath).toBe("apps/console/AGENTS.md");
    expect(consolePair.claudePath).toBe("apps/console/CLAUDE.md");

    const cli = pairs.find((p) => p.directory === "apps/cli")!;
    expect(cli.claudeIsSymlink).toBe(true);
  });
});
