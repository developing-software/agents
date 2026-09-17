import { AgentSkill } from "../../agent/skill";
import { getProvider } from "../../git";
import type { NormalizedIssue } from "../../git/provider/interface";
import { Repository } from "../../repository/index";
import { lazy } from "../../util/lazy";
import { Tags } from "../tag";
import { renderCaveman } from "./extensions/caveman";
import { renderKarpathy } from "./extensions/karpathy";
import type { Plan } from "./index";

export interface PlanCtx {
  plan: Plan.Info;
  repo: () => Promise<Repository.Info | null>;
  issue: (n: number) => Promise<NormalizedIssue | null>;
}

export type SectionRenderer = (ctx: PlanCtx) => Promise<string | null>;

function makeCtx(plan: Plan.Info): PlanCtx {
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

// --- Section renderers ---

async function renderTitle(ctx: PlanCtx): Promise<string | null> {
  return `# Plan: ${ctx.plan.title}`;
}

async function renderBody(ctx: PlanCtx): Promise<string | null> {
  return ctx.plan.body || null;
}

async function renderLinkedIssues(ctx: PlanCtx): Promise<string | null> {
  const issueNumbers = Tags.Git.collect(ctx.plan.tags, "issue").map((tag) => tag.number);
  if (issueNumbers.length === 0) return null;

  const issues = (await Promise.all(issueNumbers.map(ctx.issue))).filter(
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

async function renderSkills(ctx: PlanCtx): Promise<string | null> {
  const wanted = new Set(
    ctx.plan.tags
      .filter((t) => t.startsWith("skill:"))
      .map((t) => t.slice("skill:".length))
      .filter(Boolean),
  );

  const repo = await ctx.repo();
  if (!repo) return null;

  const all = await AgentSkill.listAgentsSkills({ source: repo.source, fullName: repo.fullName });
  const skills = wanted.size > 0 ? all.filter((s) => wanted.has(s.id)) : all;
  if (skills.length === 0) return null;

  const sections = ["## Skills"];
  for (const s of skills) {
    sections.push(`### \`${s.id}\`${s.description ? ` — ${s.description}` : ""}`);
    if (s.body.trim()) sections.push(s.body.trim());
  }
  return sections.join("\n\n");
}

async function renderFileScope(ctx: PlanCtx): Promise<string | null> {
  const files = ctx.plan.tags
    .filter((t) => t.startsWith("file:"))
    .map((t) => t.slice("file:".length))
    .filter(Boolean);
  if (files.length === 0) return null;
  return ["## Files in scope", ...files.map((f) => `- \`${f}\``)].join("\n");
}

// --- Pipeline ---

function renderers(opts: Plan.ToPromptOptions): SectionRenderer[] {
  return [
    ...(opts.caveman ? [renderCaveman(opts.caveman)] : []),
    ...(opts.karpathy ? [renderKarpathy()] : []),
    renderTitle,
    renderBody,
    ...(opts.includeIssueDetails ? [renderLinkedIssues] : []),
    ...(opts.includeSkillSummary ? [renderSkills] : []),
    ...(opts.includeFileScope ? [renderFileScope] : []),
  ];
}

export async function render(plan: Plan.Info, opts: Plan.ToPromptOptions = {}): Promise<string> {
  const ctx = makeCtx(plan);
  const sections = await Promise.all(renderers(opts).map((r) => r(ctx)));
  return sections.filter((s): s is string => Boolean(s)).join("\n\n");
}

// Token estimation lives next to context — same module, same input.
export function estimateTokens(markdown: string): number {
  return Math.ceil(markdown.length / 4);
}
