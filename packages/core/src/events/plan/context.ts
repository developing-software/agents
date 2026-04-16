import { AgentSkill } from "../../agent/skill";
import { Context } from "../../context";
import { getProvider } from "../../git";
import type { NormalizedIssue } from "../../git/provider/interface";
import { Repository } from "../../repository/index";
import { lazy } from "../../util/lazy";
import { Tags } from "../tag";
import type { Plan } from "./index";

export type SectionRenderer = () => Promise<string | null>;

interface PlanContextState {
  plan: Plan.Info;
  repo: () => Promise<Repository.Info | null>;
  issue: (n: number) => Promise<NormalizedIssue | null>;
}

const PlanContextStorage = Context.create<PlanContextState>();

function makeState(plan: Plan.Info): PlanContextState {
  const repo = lazy(() =>
    plan.sourceId ? Repository.fromID(plan.sourceId) : Promise.resolve(null),
  );
  const issueCache = new Map<number, Promise<NormalizedIssue | null>>();
  const issue = (n: number) => {
    let p = issueCache.get(n);
    if (!p) {
      p = (async () => {
        const r = await repo();
        return r
          ? getProvider(r.source)
              .issues.get(r.fullName, n)
              .catch(() => null)
          : null;
      })();
      issueCache.set(n, p);
    }
    return p;
  };
  return { plan, repo, issue };
}

export function withPlanContext<R>(plan: Plan.Info, fn: () => R): R {
  return PlanContextStorage.provide(makeState(plan), fn);
}

export function usePlan(): Plan.Info {
  return PlanContextStorage.use().plan;
}

export function useRepo(): Promise<Repository.Info | null> {
  return PlanContextStorage.use().repo();
}

export function useIssue(n: number): Promise<NormalizedIssue | null> {
  return PlanContextStorage.use().issue(n);
}

// --- Section renderers ---

async function renderTitle(): Promise<string | null> {
  const plan = usePlan();
  return `# Plan: ${plan.title}`;
}

async function renderBody(): Promise<string | null> {
  const plan = usePlan();
  return plan.body || null;
}

async function renderLinkedIssues(): Promise<string | null> {
  const plan = usePlan();
  const issueNumbers = Tags.Git.collect(plan.tags, "issue").map((tag) => tag.number);
  if (issueNumbers.length === 0) return null;

  const issues = (await Promise.all(issueNumbers.map(useIssue))).filter(
    (i): i is NormalizedIssue => i !== null,
  );
  if (issues.length === 0) return null;

  const sections: string[] = ["## Linked Issues"];
  for (const issue of issues) {
    sections.push(`### Issue #${issue.number}: ${issue.title}`);
    if (issue.body) sections.push(issue.body);
  }
  return sections.join("\n\n");
}

async function renderSkills(): Promise<string | null> {
  const repo = await useRepo();
  if (!repo) return null;

  const all = await AgentSkill.listAgentsSkills({ source: repo.source, fullName: repo.fullName });
  if (all.length === 0) return null;

  const plan = usePlan();
  const wanted = new Set(
    plan.tags
      .filter((t) => t.startsWith("skill:"))
      .map((t) => t.slice("skill:".length))
      .filter(Boolean),
  );
  const skills = wanted.size > 0 ? all.filter((s) => wanted.has(s.id)) : all;
  if (skills.length === 0) return null;

  const lines = skills.map((s) => {
    const desc = s.description ? ` — ${s.description}` : "";
    return `- \`${s.id}\`${desc}`;
  });
  return ["## Skills", ...lines].join("\n");
}

async function renderFileScope(): Promise<string | null> {
  const plan = usePlan();
  const files = plan.tags
    .filter((t) => t.startsWith("file:"))
    .map((t) => t.slice("file:".length))
    .filter(Boolean);
  if (files.length === 0) return null;
  return ["## Files in scope", ...files.map((f) => `- \`${f}\``)].join("\n");
}

// --- Pipeline ---

function renderers(opts: Plan.ToPromptOptions): SectionRenderer[] {
  return [
    renderTitle,
    renderBody,
    ...(opts.includeIssueDetails ? [renderLinkedIssues] : []),
    renderSkills,
    renderFileScope,
  ];
}

export async function render(plan: Plan.Info, opts: Plan.ToPromptOptions = {}): Promise<string> {
  return withPlanContext(plan, async () => {
    const sections = await Promise.all(renderers(opts).map((r) => r()));
    return sections.filter((s): s is string => Boolean(s)).join("\n\n");
  });
}

// Token estimation lives next to context — same module, same input.
export function estimateTokens(markdown: string): number {
  return Math.ceil(markdown.length / 4);
}
