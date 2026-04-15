import { GithubWorkflow } from "../../github/repo/workflow";
import type { AgentWorkflow } from "../workflow";
import type { Engine, EngineDispatchContext } from "./types";

const WORKFLOW_FILES: Record<AgentWorkflow.Agent, string> = {
  claude: "agent-claude.yml",
  opencode: "agent-opencode.yml",
  codex: "agent-codex.yml",
};

export const githubEngine: Engine = {
  id: "github",
  label: "GitHub Actions",
  async dispatch(ctx: EngineDispatchContext) {
    const workflowFile = WORKFLOW_FILES[ctx.agent];
    const workflowInputs: Record<string, string> = {
      prompt: ctx.prompt,
    };
    if (ctx.tags.length > 0) workflowInputs.tags = ctx.tags.join("\n");
    if (ctx.model) workflowInputs.model = ctx.model;
    if (ctx.branch) workflowInputs.branch = ctx.branch;

    const ref = ctx.ref ?? "dev";
    await GithubWorkflow.dispatch(ctx.repository, workflowFile, ref, workflowInputs);
  },
};
