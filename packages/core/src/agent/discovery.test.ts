import { describe, expect, test } from "bun:test";
import { AgentDiscovery } from "./discovery";

describe("AgentDiscovery", () => {
  describe("pairConfigFiles", () => {
    test("matches AGENTS.md with CLAUDE.md in the same directory", () => {
      const pairs = AgentDiscovery.pairConfigFiles([
        {
          kind: "AGENTS",
          path: "packages/core/AGENTS.md",
          sha: "a1",
          isSymlink: false,
          symlinkTarget: null,
          resolvedPath: null,
          editable: true,
          collapsed: false,
          collapsedInto: null,
        },
        {
          kind: "CLAUDE",
          path: "packages/core/CLAUDE.md",
          sha: "c1",
          isSymlink: false,
          symlinkTarget: null,
          resolvedPath: null,
          editable: true,
          collapsed: false,
          collapsedInto: null,
        },
        {
          kind: "CLAUDE",
          path: "packages/functions/CLAUDE.md",
          sha: "c2",
          isSymlink: false,
          symlinkTarget: null,
          resolvedPath: null,
          editable: true,
          collapsed: false,
          collapsedInto: null,
        },
      ]);

      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.directory).toBe("packages/core");
      expect(pairs[0]?.status).toBe("paired");
      expect(pairs[0]?.claude?.path).toBe("packages/core/CLAUDE.md");
    });

    test("marks missing CLAUDE.md without crossing directories", () => {
      const pairs = AgentDiscovery.pairConfigFiles([
        {
          kind: "AGENTS",
          path: "packages/core/AGENTS.md",
          sha: "a1",
          isSymlink: false,
          symlinkTarget: null,
          resolvedPath: null,
          editable: true,
          collapsed: false,
          collapsedInto: null,
        },
        {
          kind: "CLAUDE",
          path: "CLAUDE.md",
          sha: "c1",
          isSymlink: false,
          symlinkTarget: null,
          resolvedPath: null,
          editable: true,
          collapsed: false,
          collapsedInto: null,
        },
      ]);

      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.status).toBe("missing_claude");
      expect(pairs[0]?.claude).toBeNull();
    });

    test("collapses same-name symlink copies into the original row", () => {
      const pairs = AgentDiscovery.pairConfigFiles([
        {
          kind: "AGENTS",
          path: "AGENTS.md",
          sha: "root-agents",
          isSymlink: false,
          symlinkTarget: null,
          resolvedPath: null,
          editable: true,
          collapsed: false,
          collapsedInto: null,
        },
        {
          kind: "AGENTS",
          path: "packages/core/AGENTS.md",
          sha: "linked-agents",
          isSymlink: true,
          symlinkTarget: "../../AGENTS.md",
          resolvedPath: "AGENTS.md",
          editable: false,
          collapsed: true,
          collapsedInto: "AGENTS.md",
        },
      ]);

      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.agents.path).toBe("AGENTS.md");
      expect(pairs[0]?.hiddenSymlinkPaths).toEqual(["packages/core/AGENTS.md"]);
      expect(pairs[0]?.hasSymlink).toBe(true);
    });

    test("keeps cross-file symlinks visible in the pair", () => {
      const pairs = AgentDiscovery.pairConfigFiles([
        {
          kind: "AGENTS",
          path: "packages/core/AGENTS.md",
          sha: "a1",
          isSymlink: false,
          symlinkTarget: null,
          resolvedPath: null,
          editable: true,
          collapsed: false,
          collapsedInto: null,
        },
        {
          kind: "CLAUDE",
          path: "packages/core/CLAUDE.md",
          sha: "c1",
          isSymlink: true,
          symlinkTarget: "AGENTS.md",
          resolvedPath: "packages/core/AGENTS.md",
          editable: false,
          collapsed: false,
          collapsedInto: null,
        },
      ]);

      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.status).toBe("paired");
      expect(pairs[0]?.claude?.isSymlink).toBe(true);
      expect(pairs[0]?.claude?.collapsed).toBe(false);
    });
  });

  describe("validateFile", () => {
    test("rejects empty config content", () => {
      const result = AgentDiscovery.validateFile("packages/core/AGENTS.md", "   ");
      expect(result.valid).toBe(false);
      expect(result.issues[0]?.message).toContain("cannot be empty");
    });

    test("reports invalid frontmatter", () => {
      const result = AgentDiscovery.validateFile(
        "packages/core/AGENTS.md",
        ["---", "title: [oops", "---", "", "body"].join("\n"),
      );
      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.message.includes("frontmatter"))).toBe(true);
    });
  });
});
