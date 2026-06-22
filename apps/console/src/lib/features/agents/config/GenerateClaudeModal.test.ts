/// <reference lib="dom" />

import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";

const generateClaudeDraft = mock(async () => ({
  path: "packages/core/CLAUDE.md",
  content: "# CLAUDE.md\n\nMirrored guidance.",
  validation: {
    path: "packages/core/CLAUDE.md",
    valid: true,
    issues: [],
  },
}));
const saveAgentConfigFiles = mock(async (input: unknown) => {
  void input;
  return { saved: ["packages/core/CLAUDE.md"], validation: [] };
});
const listAgentConfigPairs = mock(async () => []);
const loadAgentPairContents = mock(async () => ({
  agentsPath: "packages/core/AGENTS.md",
  claudePath: "packages/core/CLAUDE.md",
  agentsContent: "# AGENTS",
  claudeContent: "# CLAUDE",
}));
const validateAgentConfigFiles = mock(async () => []);

mock.module("$lib/features/agents/api/config.remote", () => ({
  listAgentConfigPairs,
  loadAgentPairContents,
  validateAgentConfigFiles,
  generateClaudeDraft,
  saveAgentConfigFiles,
}));

let GenerateClaudeModal: typeof import("./GenerateClaudeModal.svelte").default;

const pair = {
  directory: "packages/core",
  status: "missing_claude",
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
  claude: null,
} as const;

describe("GenerateClaudeModal", () => {
  beforeAll(async () => {
    GenerateClaudeModal = (await import("./GenerateClaudeModal.svelte")).default;
  });

  beforeEach(() => {
    generateClaudeDraft.mockClear();
    saveAgentConfigFiles.mockClear();
  });

  test("generates a preview and saves the generated CLAUDE.md", async () => {
    const ongenerated = mock();
    render(GenerateClaudeModal, {
      open: true,
      pair,
      organization: "acme",
      repoName: "repo",
      ongenerated,
    });

    const instructionsBox = screen.getByRole("textbox");
    await fireEvent.input(instructionsBox, { target: { value: "Focus on PR review rules." } });
    await fireEvent.click(screen.getByRole("button", { name: "Generate Preview" }));

    await waitFor(() => expect(generateClaudeDraft).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Rendered")).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "Save CLAUDE.md" }));
    await waitFor(() => expect(saveAgentConfigFiles).toHaveBeenCalledTimes(1));
    expect(ongenerated).toHaveBeenCalledTimes(1);
  });
});
