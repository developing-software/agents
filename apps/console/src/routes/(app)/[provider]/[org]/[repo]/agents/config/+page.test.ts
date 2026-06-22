/// <reference lib="dom" />

import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { render, screen } from "@testing-library/svelte";

const listAgentConfigPairs = mock(async () => []);

mock.module("$app/navigation", () => ({
  beforeNavigate: () => {},
}));

mock.module("$lib/features/agents/api/config.remote", () => ({
  listAgentConfigPairs,
  loadAgentPairContents: mock(async () => ({
    agentsPath: "packages/core/AGENTS.md",
    claudePath: "packages/core/CLAUDE.md",
    agentsContent: "# AGENTS",
    claudeContent: "# CLAUDE",
  })),
  validateAgentConfigFiles: mock(async () => []),
  saveAgentConfigFiles: mock(async () => ({ saved: [], validation: [] })),
  generateClaudeDraft: mock(async () => ({
    path: "packages/core/CLAUDE.md",
    content: "# CLAUDE.md",
    validation: { path: "packages/core/CLAUDE.md", valid: true, issues: [] },
  })),
}));

let Page: typeof import("./+page.svelte").default;

describe("agents config page", () => {
  beforeAll(async () => {
    Page = (await import("./+page.svelte")).default;
  });

  beforeEach(() => {
    listAgentConfigPairs.mockReset();
  });

  test("renders config pairs and filter controls", async () => {
    render(Page, {
      data: {
        provider: "github",
        organization: "acme",
        repoName: "repo",
        defaultBranch: "main",
        pairs: [
          {
            directory: "packages/core",
            status: "paired",
            hasSymlink: false,
            hiddenSymlinkPaths: [],
            agents: {
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
            claude: {
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
          },
          {
            directory: "packages/functions",
            status: "missing_claude",
            hasSymlink: true,
            hiddenSymlinkPaths: ["packages/functions-copy/AGENTS.md"],
            agents: {
              kind: "AGENTS",
              path: "packages/functions/AGENTS.md",
              sha: "a2",
              isSymlink: false,
              symlinkTarget: null,
              resolvedPath: null,
              editable: true,
              collapsed: false,
              collapsedInto: null,
            },
            claude: null,
          },
        ],
      },
    });

    expect(screen.getByText("packages/core")).toBeTruthy();
    expect(screen.getByText("packages/functions")).toBeTruthy();
    expect(screen.getByText("MISSING CLAUDE")).toBeTruthy();
    expect(screen.getByText("LINKED")).toBeTruthy();
    expect(screen.getByPlaceholderText("Filter by directory or file path")).toBeTruthy();
    expect(screen.getByDisplayValue("All")).toBeTruthy();
  });
});
