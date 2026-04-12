import { AgentSkill } from "../../agent/skill";
import { createContext } from "../../context";
import { GithubContent } from "../../github/repo/content";
import { GithubIssue } from "../../github/repo/issue";
import { Repository } from "../../repository/index";
import { lazy } from "../../util/lazy";
import type { Plan } from "./index";

export type SectionRenderer = () => Promise<string | null>;

interface PlanContextState {
  plan: Plan.Info;
  repo: () => Promise<Repository.Info | null>;
  rootListing: () => Promise<GithubContent.DirEntry[] | null>;
  issue: (n: number) => Promise<GithubIssue.Info | null>;
}

const PlanContextStorage = createContext<PlanContextState>();

function makeState(plan: Plan.Info): PlanContextState {
  const repo = lazy(() =>
    plan.sourceId ? Repository.findByID(plan.sourceId) : Promise.resolve(null),
  );
  const rootListing = lazy(async () => {
    const r = await repo();
    return r ? GithubContent.listDir(r, "") : null;
  });
  const issueCache = new Map<number, Promise<GithubIssue.Info | null>>();
  const issue = (n: number) => {
    let p = issueCache.get(n);
    if (!p) {
      p = (async () => {
        const r = await repo();
        return r ? GithubIssue.get(r, n).catch(() => null) : null;
      })();
      issueCache.set(n, p);
    }
    return p;
  };
  return { plan, repo, rootListing, issue };
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

export function useRepoRoot(): Promise<GithubContent.DirEntry[] | null> {
  return PlanContextStorage.use().rootListing();
}

export function useIssue(n: number): Promise<GithubIssue.Info | null> {
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
  const issueNumbers = plan.tags
    .filter((t) => t.startsWith("gh:issue:"))
    .map((t) => {
      const text = t.split(":")[2];
      return text ? parseInt(text, 10) : NaN;
    })
    .filter((n) => !isNaN(n));
  if (issueNumbers.length === 0) return null;

  const issues = (await Promise.all(issueNumbers.map(useIssue))).filter(
    (i): i is GithubIssue.Info => i !== null,
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

  const all = await AgentSkill.listAgentsSkills(repo);
  if (all.length === 0) return null;

  // If the plan has any `skill:*` tags, filter to those; otherwise include all.
  const plan = usePlan();
  const wanted = new Set(
    plan.tags
      .filter((t) => t.startsWith("skill:"))
      .map((t) => t.slice("skill:".length))
      .filter(Boolean),
  );
  const skills = wanted.size > 0 ? all.filter((s) => wanted.has(s.id)) : all;
  if (skills.length === 0) return null;

  return ["## Skills", ...skills.map((s) => `### ${s.name}\n\n${s.body}`)].join("\n\n");
}

// AGENTS.md and CLAUDE.md are almost always symlinks to one another. Reading
// both would either duplicate the same content or — for the symlink side —
// depend on the GitHub raw endpoint resolving the link. We use the parent
// directory listing (cached via useRepoRoot) to detect the source file and
// read only that one. If both are real files (intentional divergence), we
// merge them in listing order.
async function renderInstructions(): Promise<string | null> {
  const repo = await useRepo();
  if (!repo) return null;

  const root = await useRepoRoot();
  if (!root) return null;

  const candidates = root.filter((e) => e.name === "AGENTS.md" || e.name === "CLAUDE.md");
  if (candidates.length === 0) return null;

  const realFiles = candidates.filter((e) => e.type === "file");
  const toRead = realFiles.length > 0 ? realFiles : candidates.slice(0, 1);

  const contents = (
    await Promise.all(toRead.map((e) => GithubContent.readFile(repo, e.path).catch(() => null)))
  ).filter((c): c is string => Boolean(c));

  if (contents.length === 0) return null;
  return `## Instructions\n\n${contents.join("\n\n")}`;
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

export interface RenderOptions {
  includeIssueDetails?: boolean;
}

function renderers(opts: RenderOptions): SectionRenderer[] {
  return [
    renderTitle,
    renderBody,
    ...(opts.includeIssueDetails !== false ? [renderLinkedIssues] : []),
    renderSkills,
    renderInstructions,
    renderFileScope,
  ];
}

export async function render(plan: Plan.Info, opts: RenderOptions = {}): Promise<string> {
  return withPlanContext(plan, async () => {
    const sections = await Promise.all(renderers(opts).map((r) => r()));
    return sections.filter((s): s is string => Boolean(s)).join("\n\n");
  });
}

// Token estimation lives next to context — same module, same input.
export function estimateTokens(markdown: string): number {
  return Math.ceil(markdown.length / 4);
}
