/// <reference lib="dom" />

import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";

const loadAgentPairContents = mock(async () => ({
  agentsPath: "packages/core/AGENTS.md",
  claudePath: "packages/core/CLAUDE.md",
  agentsContent: "# AGENTS\n\nBe careful.",
  claudeContent: "# CLAUDE\n\nFollow AGENTS.",
}));
const validateAgentConfigFiles = mock(async (input: unknown) => {
  void input;
  return [
    { path: "packages/core/AGENTS.md", valid: true, issues: [] },
    { path: "packages/core/CLAUDE.md", valid: true, issues: [] },
  ];
});
const saveAgentConfigFiles = mock(async (input: unknown) => {
  void input;
  return {
    saved: ["packages/core/AGENTS.md", "packages/core/CLAUDE.md"],
    validation: [
      { path: "packages/core/AGENTS.md", valid: true, issues: [] },
      { path: "packages/core/CLAUDE.md", valid: true, issues: [] },
    ],
  };
});
const listAgentConfigPairs = mock(async () => []);
const generateClaudeDraft = mock(async () => ({
  path: "packages/core/CLAUDE.md",
  content: "# CLAUDE.md",
  validation: { path: "packages/core/CLAUDE.md", valid: true, issues: [] },
}));

mock.module("$app/navigation", () => ({
  beforeNavigate: () => {},
}));

mock.module("$lib/features/agents/api/config.remote", () => ({
  listAgentConfigPairs,
  loadAgentPairContents,
  validateAgentConfigFiles,
  saveAgentConfigFiles,
  generateClaudeDraft,
}));

let AgentPairEditor: typeof import("./AgentPairEditor.svelte").default;

const pair = {
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
} as const;

describe("AgentPairEditor", () => {
  beforeAll(async () => {
    AgentPairEditor = (await import("./AgentPairEditor.svelte")).default;
  });

  beforeEach(() => {
    loadAgentPairContents.mockClear();
    validateAgentConfigFiles.mockClear();
    saveAgentConfigFiles.mockClear();
  });

  test("loads, validates, and saves paired files", async () => {
    const onupdated = mock();
    render(AgentPairEditor, {
      open: true,
      pair,
      organization: "acme",
      repoName: "repo",
      onupdated,
    });

    await waitFor(() => expect(loadAgentPairContents).toHaveBeenCalledTimes(1));
    const textareas = await screen.findAllByRole("textbox");
    await fireEvent.input(textareas[0]!, { target: { value: "# AGENTS\n\nUpdated guidance." } });

    await fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    await waitFor(() => expect(validateAgentConfigFiles).toHaveBeenCalledTimes(1));

    await fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(saveAgentConfigFiles).toHaveBeenCalledTimes(1));
    expect(onupdated).toHaveBeenCalledTimes(1);
  });
});
