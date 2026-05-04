import { describe, test, expect } from "bun:test";
import { AgentDiscovery } from "./discovery";

type FakeEntry = { type: string; path: string };
type DirMap = Map<string, Map<string, "file" | "dir" | "symlink" | "submodule">>;

const blob = (path: string): FakeEntry => ({ type: "blob", path });
const tree = (path: string): FakeEntry => ({ type: "tree", path });

describe("AgentDiscovery.buildPairsFromTree", () => {
  test("pairs root AGENTS.md with root CLAUDE.md", () => {
    const pairs = AgentDiscovery.buildPairsFromTree([blob("AGENTS.md"), blob("CLAUDE.md")], new Map());
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({
      dir: "",
      agentsPath: "AGENTS.md",
      claudePath: "CLAUDE.md",
      agentsExists: true,
      claudeExists: true,
      agentsIsSymlink: false,
      claudeIsSymlink: false,
    });
  });

  test("marks claudeExists false when CLAUDE.md is absent", () => {
    const pairs = AgentDiscovery.buildPairsFromTree([blob("actions/AGENTS.md")], new Map());
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.claudeExists).toBe(false);
    expect(pairs[0]?.claudePath).toBe("actions/CLAUDE.md");
  });

  test("does not cross-directory pair CLAUDE.md", () => {
    const pairs = AgentDiscovery.buildPairsFromTree(
      [blob("apps/AGENTS.md"), blob("other/CLAUDE.md")],
      new Map(),
    );
    expect(pairs[0]?.claudeExists).toBe(false);
  });

  test("root CLAUDE.md does not pair with subdirectory AGENTS.md", () => {
    const pairs = AgentDiscovery.buildPairsFromTree(
      [blob("actions/AGENTS.md"), blob("CLAUDE.md")],
      new Map(),
    );
    expect(pairs[0]?.claudeExists).toBe(false);
    expect(pairs[0]?.dir).toBe("actions");
  });

  test("detects symlink status from dirEntryMap", () => {
    const dirMap: DirMap = new Map([
      ["actions", new Map([["AGENTS.md", "symlink"], ["CLAUDE.md", "file"]])],
    ]);
    const pairs = AgentDiscovery.buildPairsFromTree(
      [blob("actions/AGENTS.md"), blob("actions/CLAUDE.md")],
      dirMap,
    );
    expect(pairs[0]?.agentsIsSymlink).toBe(true);
    expect(pairs[0]?.claudeIsSymlink).toBe(false);
  });

  test("both symlinks detected independently", () => {
    const dirMap: DirMap = new Map([
      ["pkg", new Map([["AGENTS.md", "symlink"], ["CLAUDE.md", "symlink"]])],
    ]);
    const pairs = AgentDiscovery.buildPairsFromTree(
      [blob("pkg/AGENTS.md"), blob("pkg/CLAUDE.md")],
      dirMap,
    );
    expect(pairs[0]?.agentsIsSymlink).toBe(true);
    expect(pairs[0]?.claudeIsSymlink).toBe(true);
  });

  test("ignores files not named exactly AGENTS.md", () => {
    const pairs = AgentDiscovery.buildPairsFromTree(
      [blob("AGENTS.yml"), blob("docs/agents.md"), blob("src/AGENTS.md.bak")],
      new Map(),
    );
    expect(pairs).toHaveLength(0);
  });

  test("ignores tree-type AGENTS.md entries", () => {
    const pairs = AgentDiscovery.buildPairsFromTree(
      [tree("AGENTS.md"), blob("src/AGENTS.md")],
      new Map(),
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.dir).toBe("src");
  });

  test("handles multiple pairs across directories, sorted by dir", () => {
    const entries = [
      blob("AGENTS.md"),
      blob("CLAUDE.md"),
      blob("actions/AGENTS.md"),
      blob("apps/cli/AGENTS.md"),
      blob("apps/cli/CLAUDE.md"),
    ];
    const pairs = AgentDiscovery.buildPairsFromTree(entries, new Map());
    expect(pairs).toHaveLength(3);
    expect(pairs[0]?.dir).toBe("");
    expect(pairs[1]?.dir).toBe("actions");
    expect(pairs[2]?.dir).toBe("apps/cli");
    expect(pairs[0]?.claudeExists).toBe(true);
    expect(pairs[1]?.claudeExists).toBe(false);
    expect(pairs[2]?.claudeExists).toBe(true);
  });

  test("missing dirEntryMap entry leaves symlink flags false", () => {
    const pairs = AgentDiscovery.buildPairsFromTree([blob("x/AGENTS.md")], new Map());
    expect(pairs[0]?.agentsIsSymlink).toBe(false);
    expect(pairs[0]?.claudeIsSymlink).toBe(false);
  });
});

describe("AgentDiscovery.generateClaudeTemplate", () => {
  test("includes directory name in output", () => {
    const out = AgentDiscovery.generateClaudeTemplate("actions/AGENTS.md");
    expect(out).toContain("actions");
  });

  test("uses 'root' for root-level file", () => {
    const out = AgentDiscovery.generateClaudeTemplate("AGENTS.md");
    expect(out).toContain("root");
  });

  test("output is non-empty markdown", () => {
    const out = AgentDiscovery.generateClaudeTemplate("apps/cli/AGENTS.md");
    expect(out).toBeString();
    expect(out.length).toBeGreaterThan(20);
    expect(out).toContain("# Claude");
  });

  test("nested path includes innermost directory", () => {
    const out = AgentDiscovery.generateClaudeTemplate("apps/cli/AGENTS.md");
    expect(out).toContain("apps/cli");
  });
});
