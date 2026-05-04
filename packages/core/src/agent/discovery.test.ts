import { describe, expect, test } from "bun:test";
import { AgentDiscovery } from "./discovery";

describe("AgentDiscovery", () => {
  describe("resolveSymlinkPath", () => {
    test("resolves relative symlink targets", () => {
      expect(AgentDiscovery.resolveSymlinkPath("docs/AGENTS.md", "../AGENTS.md")).toBe(
        "AGENTS.md",
      );
    });

    test("normalizes rooted symlink targets", () => {
      expect(AgentDiscovery.resolveSymlinkPath("packages/core/CLAUDE.md", "/CLAUDE.md")).toBe(
        "CLAUDE.md",
      );
    });
  });

  describe("matchConfigPairs", () => {
    test("pairs AGENTS.md with CLAUDE.md in the same directory", () => {
      const pairs = AgentDiscovery.matchConfigPairs([
        { type: "blob", path: "AGENTS.md", sha: "a1" },
        { type: "blob", path: "CLAUDE.md", sha: "c1" },
        { type: "blob", path: "docs/AGENTS.md", sha: "a2" },
      ]);

      expect(pairs).toHaveLength(2);
      expect(pairs[0]).toMatchObject({
        directory: "",
        status: "paired",
        agents: { path: "AGENTS.md", isSymlink: false },
        claude: { path: "CLAUDE.md", isSymlink: false },
      });
      expect(pairs[1]).toMatchObject({
        directory: "docs",
        status: "missing_claude",
        agents: { path: "docs/AGENTS.md", isSymlink: false },
        claude: null,
      });
    });

    test("does not cross-match files from different directories", () => {
      const pairs = AgentDiscovery.matchConfigPairs([
        { type: "blob", path: "packages/core/AGENTS.md", sha: "a1" },
        { type: "blob", path: "packages/cli/CLAUDE.md", sha: "c1" },
      ]);

      expect(pairs).toEqual([
        expect.objectContaining({
          directory: "packages/core",
          status: "missing_claude",
          claude: null,
        }),
      ]);
    });

    test("collapses symlinked AGENTS.md copies onto the original file", () => {
      const pairs = AgentDiscovery.matchConfigPairs(
        [
          { type: "blob", path: "AGENTS.md", sha: "a1" },
          { type: "blob", path: "CLAUDE.md", sha: "c1" },
          { type: "symlink", path: "docs/AGENTS.md", sha: "a2" },
          { type: "symlink", path: "docs/CLAUDE.md", sha: "c2" },
        ],
        {
          "docs/AGENTS.md": "../AGENTS.md",
          "docs/CLAUDE.md": "../CLAUDE.md",
        },
      );

      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toMatchObject({
        directory: "",
        status: "paired",
      });
      expect(pairs[0]!.aliases).toEqual([
        { kind: "agents", path: "docs/AGENTS.md", canonicalPath: "AGENTS.md" },
        { kind: "claude", path: "docs/CLAUDE.md", canonicalPath: "CLAUDE.md" },
      ]);
    });

    test("treats unresolved symlinks as standalone entries", () => {
      const pairs = AgentDiscovery.matchConfigPairs([
        { type: "symlink", path: "docs/AGENTS.md", sha: "a1" },
      ]);

      expect(pairs).toEqual([
        expect.objectContaining({
          directory: "docs",
          agents: expect.objectContaining({
            path: "docs/AGENTS.md",
            canonicalPath: "docs/AGENTS.md",
            isSymlink: true,
          }),
        }),
      ]);
    });
  });
});
