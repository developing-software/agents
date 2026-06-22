import { describe, test, expect, mock, beforeEach } from "bun:test";
import { AgentDiscovery } from "./discovery";

const mockGetTree = mock(() => Promise.resolve([] as any[]));
const mockListDir = mock(() => Promise.resolve(null as any));

mock.module("../git", () => ({
  getProvider: () => ({
    repos: { getTree: mockGetTree },
    content: { listDir: mockListDir },
  }),
}));

describe("AgentDiscovery.findAgentPairs", () => {
  const repo: AgentDiscovery.RepoRef = {
    source: "github",
    fullName: "org/repo",
    defaultBranch: "main",
  };

  beforeEach(() => {
    mockGetTree.mockReset();
    mockListDir.mockReset();
    mockListDir.mockResolvedValue(null);
  });

  test("returns empty array for repo with no AGENTS.md or CLAUDE.md", async () => {
    mockGetTree.mockResolvedValue([
      { type: "blob", path: "README.md", sha: "abc", size: 100 },
      { type: "tree", path: "src", sha: "def" },
    ]);

    const pairs = await AgentDiscovery.findAgentPairs(repo);
    expect(pairs).toEqual([]);
  });

  test("returns paired entry when both files exist in root", async () => {
    mockGetTree.mockResolvedValue([
      { type: "blob", path: "AGENTS.md", sha: "a1", size: 100 },
      { type: "blob", path: "CLAUDE.md", sha: "c1", size: 200 },
    ]);
    mockListDir.mockResolvedValue([
      { type: "file", name: "AGENTS.md", path: "AGENTS.md", sha: "a1", size: 100 },
      { type: "file", name: "CLAUDE.md", path: "CLAUDE.md", sha: "c1", size: 200 },
    ]);

    const pairs = await AgentDiscovery.findAgentPairs(repo);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.directory).toBe(".");
    expect(pairs[0]!.agents).toEqual({ path: "AGENTS.md", sha: "a1", isSymlink: false });
    expect(pairs[0]!.claude).toEqual({ path: "CLAUDE.md", sha: "c1", isSymlink: false });
  });

  test("returns unpaired entry when CLAUDE.md is missing", async () => {
    mockGetTree.mockResolvedValue([
      { type: "blob", path: "actions/AGENTS.md", sha: "a1", size: 100 },
    ]);
    mockListDir.mockResolvedValue([
      { type: "file", name: "AGENTS.md", path: "actions/AGENTS.md", sha: "a1", size: 100 },
    ]);

    const pairs = await AgentDiscovery.findAgentPairs(repo);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.directory).toBe("actions");
    expect(pairs[0]!.agents).not.toBeNull();
    expect(pairs[0]!.claude).toBeNull();
  });

  test("detects symlink status", async () => {
    mockGetTree.mockResolvedValue([
      { type: "blob", path: "AGENTS.md", sha: "a1", size: 100 },
      { type: "blob", path: "CLAUDE.md", sha: "c1", size: 200 },
    ]);
    mockListDir.mockResolvedValue([
      { type: "file", name: "AGENTS.md", path: "AGENTS.md", sha: "a1", size: 100 },
      { type: "symlink", name: "CLAUDE.md", path: "CLAUDE.md", sha: "c1", size: 200 },
    ]);

    const pairs = await AgentDiscovery.findAgentPairs(repo);
    expect(pairs[0]!.agents!.isSymlink).toBe(false);
    expect(pairs[0]!.claude!.isSymlink).toBe(true);
  });

  test("handles multiple directories independently", async () => {
    mockGetTree.mockResolvedValue([
      { type: "blob", path: "AGENTS.md", sha: "a1", size: 100 },
      { type: "blob", path: "CLAUDE.md", sha: "c1", size: 200 },
      { type: "blob", path: "apps/cli/AGENTS.md", sha: "a2", size: 100 },
      { type: "blob", path: "packages/core/AGENTS.md", sha: "a3", size: 100 },
      { type: "blob", path: "packages/core/CLAUDE.md", sha: "c3", size: 200 },
    ]);
    mockListDir.mockResolvedValue([]);

    const pairs = await AgentDiscovery.findAgentPairs(repo);
    expect(pairs).toHaveLength(3);

    const root = pairs.find((p) => p.directory === ".");
    expect(root!.agents).not.toBeNull();
    expect(root!.claude).not.toBeNull();

    const cli = pairs.find((p) => p.directory === "apps/cli");
    expect(cli!.agents).not.toBeNull();
    expect(cli!.claude).toBeNull();

    const core = pairs.find((p) => p.directory === "packages/core");
    expect(core!.agents).not.toBeNull();
    expect(core!.claude).not.toBeNull();
  });

  test("sorts results by directory name", async () => {
    mockGetTree.mockResolvedValue([
      { type: "blob", path: "packages/core/AGENTS.md", sha: "a3", size: 100 },
      { type: "blob", path: "AGENTS.md", sha: "a1", size: 100 },
      { type: "blob", path: "apps/cli/AGENTS.md", sha: "a2", size: 100 },
    ]);
    mockListDir.mockResolvedValue([]);

    const pairs = await AgentDiscovery.findAgentPairs(repo);
    expect(pairs.map((p) => p.directory)).toEqual([".", "apps/cli", "packages/core"]);
  });

  test("does not cross-match files between directories", async () => {
    mockGetTree.mockResolvedValue([
      { type: "blob", path: "actions/AGENTS.md", sha: "a1", size: 100 },
      { type: "blob", path: "apps/CLAUDE.md", sha: "c1", size: 200 },
    ]);
    mockListDir.mockResolvedValue([]);

    const pairs = await AgentDiscovery.findAgentPairs(repo);
    expect(pairs).toHaveLength(2);

    const actions = pairs.find((p) => p.directory === "actions");
    expect(actions!.agents).not.toBeNull();
    expect(actions!.claude).toBeNull();

    const apps = pairs.find((p) => p.directory === "apps");
    expect(apps!.agents).toBeNull();
    expect(apps!.claude).not.toBeNull();
  });

  test("ignores tree entries (directories) that happen to match names", async () => {
    mockGetTree.mockResolvedValue([
      { type: "tree", path: "AGENTS.md", sha: "abc" },
      { type: "blob", path: "src/AGENTS.md", sha: "a1", size: 100 },
    ]);
    mockListDir.mockResolvedValue([]);

    const pairs = await AgentDiscovery.findAgentPairs(repo);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.directory).toBe("src");
  });

  test("handles standalone CLAUDE.md without AGENTS.md", async () => {
    mockGetTree.mockResolvedValue([
      { type: "blob", path: "CLAUDE.md", sha: "c1", size: 200 },
    ]);
    mockListDir.mockResolvedValue([
      { type: "file", name: "CLAUDE.md", path: "CLAUDE.md", sha: "c1", size: 200 },
    ]);

    const pairs = await AgentDiscovery.findAgentPairs(repo);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.directory).toBe(".");
    expect(pairs[0]!.agents).toBeNull();
    expect(pairs[0]!.claude).not.toBeNull();
  });

  test("uses custom ref when provided", async () => {
    mockGetTree.mockResolvedValue([]);
    mockListDir.mockResolvedValue(null);

    await AgentDiscovery.findAgentPairs(repo, "feature-branch");
    expect(mockGetTree).toHaveBeenCalledWith("org/repo", "feature-branch");
  });
});
