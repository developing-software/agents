import { z } from "zod";
import { Api } from "../api/api";
import { ErrorCodes, VisibleError } from "../error";
import { Event } from "../events";
import { AgentEvent } from "../events/agent";
import { Tags } from "../events/tag";
import type { OriginType } from "../events/types";
import { getProvider } from "../git";
import { Identifier } from "../identifier";
import { Repository } from "../repository/index";
import { Sandbox } from "../sandbox";

export namespace AgentDispatch {
  export const Agents = ["claude", "opencode", "codex"] as const;
  export type Agent = (typeof Agents)[number];

  const DEFAULT_IMAGE = "ghcr.io/developing-software/agents-runner:latest";
  const DEFAULT_API_URL = "https://api.agents.developing.company/api";
  const DEFAULT_LLM_BASE_URL = "https://llm.developing.company";
  const RUN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

  export interface DispatchInput {
    /** Repository owner */
    owner: string;
    /** Repository name */
    repo: string;
    /** Agent to dispatch */
    agent: Agent;
    /** Task/instructions for the agent. Required if issueNumber is not provided. */
    prompt?: string;
    /** Issue number — auto-fetches title/body to build prompt and adds git:issue tag. */
    issueNumber?: number;
    /** Additional tags for event linking */
    tags?: string[];
    /** Model override (LiteLLM model name) */
    model?: string;
    /** Branch to clone from (default: repository default branch) */
    baseBranch?: string;
    /** Existing branch to work on (for fix dispatches on open PRs) */
    branch?: string;
    /** What triggered the dispatch */
    origin?: OriginType;
  }

  export interface DispatchResult {
    eventId: string;
    sandboxId: string;
    branch: string;
  }

  /**
   * Build a prompt from an issue's title and body.
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
   * Dispatch an agent run into a sandboxd sandbox.
   *
   * Records the `agent` event up front, then starts the runner image with the repo, prompt,
   * LiteLLM gateway and short-lived credentials. The runner reports back through
   * `POST /agents/runs/{id}/finish` when the agent exits.
   */
  export async function dispatch(input: DispatchInput): Promise<DispatchResult> {
    if (!input.prompt && !input.issueNumber) {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
        "Either prompt or issueNumber is required",
      );
    }

    const fullName = `${input.owner}/${input.repo}`;
    const repository = await Repository.findByFullName(fullName);
    if (!repository) {
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        `Repository ${fullName} not found`,
      );
    }

    const provider = getProvider(repository.source);

    let prompt = input.prompt;
    const tags = input.tags ? [...input.tags] : [];

    if (input.issueNumber) {
      tags.push(Tags.Git.issue(input.issueNumber));

      if (!prompt) {
        const issue = await provider.issues.get(repository.fullName, input.issueNumber);
        if (!issue) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            `Issue #${input.issueNumber} not found on ${repository.fullName}`,
          );
        }
        prompt = buildIssuePrompt(issue.title, issue.body);
      }
    }

    const remote = await provider.repos.get(repository.fullName);
    const eventId = Identifier.create("event");
    const branch = input.branch ?? `${input.agent}/${eventId.slice(-10).toLowerCase()}`;
    const baseBranch = input.branch ?? input.baseBranch ?? remote.defaultBranch;

    tags.push(
      Tags.Git.provider(repository.source),
      Tags.Git.repo(repository.source, repository.fullName),
      Tags.Git.branch(branch),
      Tags.harness(AgentEvent.resolveAgent(input.agent)),
    );
    if (input.model) tags.push(Tags.model(input.model));

    const run: AgentEvent.Completed.Run = {
      provider: "sandboxd",
      id: null,
      state: "queued",
      endedReason: null,
      baseBranch,
    };

    await Event.create({
      id: eventId,
      type: AgentEvent.Def.type,
      origin: input.origin ?? "api",
      source: "repository",
      sourceId: repository.id,
      tags: [...new Set(tags)],
      data: { run, agent: { name: AgentEvent.resolveAgent(input.agent) } },
    });

    const [git, apiToken] = await Promise.all([
      provider.repos.getInstallationToken(repository.installationRef),
      Api.Personal.create({
        name: `agent run ${eventId}`,
        expiresAt: new Date(Date.now() + RUN_TOKEN_TTL_MS).toISOString(),
      }),
    ]);

    try {
      const sandbox = await Sandbox.create({
        image: process.env.SANDBOXD_AGENT_IMAGE || DEFAULT_IMAGE,
        tags: parseList(process.env.SANDBOXD_TAGS),
        env: {
          REPO: remote.cloneUrl,
          BRANCH: branch,
          BASE_BRANCH: baseBranch,
          AGENT: input.agent,
          PROMPT: prompt!,
          ...(input.model ? { MODEL: input.model } : {}),
          LLM_BASE_URL: process.env.LLM_BASE_URL || DEFAULT_LLM_BASE_URL,
          AGENTS_API_URL: process.env.AGENTS_API_URL || DEFAULT_API_URL,
          AGENTS_EVENT_ID: eventId,
        },
        secret_env: {
          LLM_API_KEY: process.env.LLM_API_KEY ?? "",
          GIT_TOKEN: git.token,
          AGENTS_API_TOKEN: apiToken.token,
        },
      });

      await Event.update(eventId, { data: { run: toRun(run, sandbox) } });

      return { eventId, sandboxId: sandbox.id, branch };
    } catch (err) {
      await Api.Personal.remove(apiToken.id).catch(() => {});
      await Event.update(eventId, {
        data: {
          run: { ...run, state: "ended", endedReason: "failed" },
          agent: { name: AgentEvent.resolveAgent(input.agent), status: "failure" },
        },
      });
      throw err;
    }
  }

  function parseList(raw: string | undefined) {
    return (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  export const FinishInput = z
    .object({
      status: z.enum(["success", "failure", "cancelled"]),
      sessionId: z.string().nullable().default(null),
      finalMessage: z.string().nullable().default(null),
      metrics: AgentEvent.Completed.Metrics.nullable().default(null),
      pricing: AgentEvent.Completed.Pricing.nullable().default(null),
      durationMs: z.number().int().nonnegative().default(0),
      diff: z
        .object({ linesAdded: z.number().int(), linesRemoved: z.number().int() })
        .nullable()
        .default(null),
      pushed: z.boolean().default(false),
      title: z.string().max(200).optional(),
    })
    .meta({
      ref: "AgentRunFinishInput",
      description: "What the runner reports when the agent exits.",
    });
  export type FinishInput = z.input<typeof FinishInput>;

  /**
   * Record the runner's report: open a pull request for a pushed branch (unless one is
   * already open) and complete the agent event.
   */
  export async function finish(eventId: string, raw: FinishInput) {
    const input = FinishInput.parse(raw);
    const { event, data, repository } = await loadRun(eventId);

    const branchTag = Tags.Git.find(event.tags, "branch");
    let pr = data.pr;

    if (input.pushed && branchTag) {
      const provider = getProvider(repository.source);
      const open = await provider.pulls.list(repository.fullName, { state: "open" });
      const existing = open.find((p) => p.headBranch === branchTag.name);
      if (existing) {
        pr = { url: existing.url };
      } else {
        const base =
          data.run?.baseBranch ?? (await provider.repos.get(repository.fullName)).defaultBranch;
        const created = await provider.pulls.create(repository.fullName, {
          title: input.title || `${data.agent.name}: agent changes`,
          head: branchTag.name,
          base,
          body: [input.finalMessage ?? "", "", `Agent run: \`${eventId}\``].join("\n").trim(),
        });
        pr = { url: created.url };
        const tags = [...new Set([...event.tags, Tags.Git.pr(created.number)])];
        await Event.update(eventId, { tags });
      }
    }

    if (input.metrics && input.metrics.cost_usd == null && input.pricing?.cost_usd != null) {
      input.metrics.cost_usd = input.pricing.cost_usd;
    }

    await Event.update(eventId, {
      data: {
        agent: {
          name: data.agent.name,
          sessionId: input.sessionId,
          finalMessage: input.finalMessage,
          status: input.status,
          metrics: input.metrics,
          pricing: input.pricing,
        },
        workflow: { ...data.workflow, durationMs: input.durationMs, conclusion: input.status },
        ...(input.diff ? { diff: input.diff } : {}),
        ...(pr ? { pr } : {}),
        run: {
          ...(data.run ?? { provider: "sandboxd", id: null, endedReason: null, baseBranch: null }),
          state: "ended",
        },
      },
    });

    return Event.fromID(eventId);
  }

  function toRun(
    prev: AgentEvent.Completed.Run | undefined,
    sandbox: Sandbox.Info,
  ): AgentEvent.Completed.Run {
    return {
      provider: "sandboxd",
      baseBranch: prev?.baseBranch ?? null,
      id: sandbox.id,
      state: sandbox.status,
      endedReason: sandbox.ended_reason,
    };
  }

  /** Load an agent event in the actor's workspace, or fail as not found. */
  async function loadRun(eventId: string) {
    const event = await Event.fromID(eventId);
    const repoTag = event ? Tags.Git.find(event.tags, "repo") : null;
    const repository = repoTag ? await Repository.findByFullName(repoTag.fullName) : null;
    if (!event || event.type !== AgentEvent.Def.type || !repository) {
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        `Agent run ${eventId} not found`,
      );
    }
    const data = AgentEvent.Completed.parse(event.data);
    // Runs dispatched before the name was recorded up front still carry it as a tag.
    if (data.agent.name === "unknown") {
      const harness = event.tags.find((t) => t.startsWith("harness:"));
      if (harness) data.agent.name = AgentEvent.resolveAgent(harness.slice("harness:".length));
    }
    return { event, data, repository, sandboxId: data.run?.id ?? null };
  }

  /**
   * Sync a live run's state from sandboxd. A sandbox that ended without the runner
   * reporting back (lost host, crash, idle) is recorded as a failed run.
   */
  export async function refresh(eventId: string): Promise<AgentEvent.Completed.Run | null> {
    const { data, sandboxId } = await loadRun(eventId);
    if (!sandboxId || !data.run || data.run.state === "ended") return data.run ?? null;

    const run = toRun(data.run, await Sandbox.get(sandboxId));
    const unreported = run.state === "ended" && data.agent.status == null;
    await Event.update(eventId, {
      data: {
        run,
        ...(unreported ? { agent: { ...data.agent, status: "failure" } } : {}),
      },
    });
    return run;
  }

  /** Short-lived terminal URL for a run's sandbox. */
  export async function terminal(eventId: string) {
    const { sandboxId } = await loadRun(eventId);
    if (!sandboxId) {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        "Run has no sandbox yet",
      );
    }
    return Sandbox.terminal(sandboxId);
  }

  /** Stop a run's sandbox now. */
  export async function end(eventId: string) {
    const { data, sandboxId } = await loadRun(eventId);
    if (!sandboxId) return data.run ?? null;
    // sandboxd may still answer `running` while the host is told; the run is over either way.
    const ended = toRun(data.run, await Sandbox.end(sandboxId));
    const run: AgentEvent.Completed.Run = {
      ...ended,
      state: "ended",
      endedReason: ended.endedReason ?? "closed",
    };
    await Event.update(eventId, {
      data: {
        run,
        ...(data.agent.status == null ? { agent: { ...data.agent, status: "cancelled" } } : {}),
      },
    });
    return run;
  }
}
