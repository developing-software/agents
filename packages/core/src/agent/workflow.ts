import { GithubIssue } from "../github/repo/issue";
import { Repository } from "../repository/index";
import { VisibleError } from "../error";
import { AgentEngine } from "./engine";

export namespace AgentWorkflow {
  export const Agents = ["claude", "opencode", "codex"] as const;
  export type Agent = (typeof Agents)[number];

  export interface DispatchInput {
    /** Repository owner */
    owner: string;
    /** Repository name */
    repo: string;
    /** Agent to dispatch */
    agent: Agent;
    /** Task/instructions for the agent. Required if issue_number is not provided. */
    prompt?: string;
    /** Issue number — auto-fetches title/body to build prompt and adds gh:issue tag. */
    issueNumber?: number;
    /** Additional tags for event linking */
    tags?: string[];
    /** Model override */
    model?: string;
    /** Git ref to dispatch on (default: "dev") */
    ref?: string;
    /** Existing branch to work on (for fix dispatches on open PRs) */
    branch?: string;
    /** Engine to dispatch on (default: "github") */
    engine?: AgentEngine.Id;
  }

  /**
   * Build a prompt from a GitHub issue's title and body.
   */
  export function buildIssuePrompt(title: string, body: string | null): string {
    return [
      `Implement the following GitHub issue:`,
      ``,
      `Title: ${title}`,
      ``,
      `${body ?? ""}`,
      ``,
      `Make the necessary code changes to implement this feature or fix.`,
      `Follow the existing code style, naming conventions, and patterns in the codebase.`,
      `Do NOT commit, push, or open a pull request — only modify the files.`,
    ].join("\n");
  }

  /**
   * Dispatch an agent on the selected engine.
   *
   * Resolves the repository, optionally fetches the issue to build a prompt,
   * and delegates execution to the chosen engine (default: GitHub Actions).
   */
  export async function dispatch(input: DispatchInput) {
    if (!input.prompt && !input.issueNumber) {
      throw new VisibleError(
        "validation",
        "missing_required_field",
        "Either prompt or issueNumber is required",
      );
    }

    const fullName = `${input.owner}/${input.repo}`;
    const repository = await Repository.findByFullName(fullName);
    if (!repository) {
      throw new VisibleError("not_found", "resource_not_found", `Repository ${fullName} not found`);
    }

    let prompt = input.prompt;
    const tags = input.tags ? [...input.tags] : [];

    if (input.issueNumber) {
      tags.push(`gh:issue:${input.issueNumber}`);

      if (!prompt) {
        const issue = await GithubIssue.get(repository, input.issueNumber);
        prompt = buildIssuePrompt(issue.title, issue.body ?? null);
      }
    }

    const engine = AgentEngine.resolve(input.engine ?? "github");
    await engine.dispatch({
      repository,
      agent: input.agent,
      prompt: prompt!,
      tags,
      model: input.model,
      branch: input.branch,
      ref: input.ref,
    });
  }
}
