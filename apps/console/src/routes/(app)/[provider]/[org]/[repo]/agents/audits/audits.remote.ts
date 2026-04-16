import { command, query } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository";
import { AgentAudit } from "@agents/core/agent/audit";
import { getProvider } from "@agents/core/git";
import { Event } from "@agents/core/events";
import { Plan } from "@agents/core/events/plan";
import { error } from "@sveltejs/kit";

const repoInput = z.object({ organization: z.string(), repoName: z.string() });

export const listAudits = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) error(404, `Repository ${organization}/${repoName} not found`);
  return AgentAudit.list(repo);
});

export const listAuditRuns = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) error(404, `Repository ${organization}/${repoName} not found`);
  return Event.list({
    source: "repository",
    sourceId: repo.id,
    type: "audit",
    limit: 30,
  });
});

export const updateAudit = command(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    name: z.string(),
    title: z.string(),
    description: z.string().optional(),
    body: z.string(),
    mode: z.enum(["direct", "pr"]),
  }),
  async ({ organization, repoName, name, title, description, body, mode }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, `Repository ${organization}/${repoName} not found`);

    const frontmatter = [
      "---",
      `title: ${title}`,
      ...(description ? [`description: ${description}`] : []),
      "---",
    ].join("\n");
    const content = `${frontmatter}\n\n${body}`;

    return getProvider(repo.source).content.commitFiles({
      fullName: repo.fullName,
      files: [{ path: `.agents/audits/${name}.md`, content }],
      message: `Update audit: ${name}`,
      mode,
    });
  },
);

export const createPlanFromAudit = command(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    auditName: z.string(),
    auditTitle: z.string(),
    auditBody: z.string(),
  }),
  async ({ organization, repoName, auditName, auditTitle, auditBody }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, `Repository ${organization}/${repoName} not found`);

    const tags = [`gh:repo:${organization}/${repoName}`, `type:audit-${auditName}`];

    const body = [
      `## Audit: ${auditTitle}`,
      ``,
      auditBody,
      ``,
      `---`,
      `Run the audit described above. Report findings with pass/fail outcome.`,
    ].join("\n");

    const id = await Plan.create({
      title: `Audit: ${auditTitle}`,
      body,
      authorType: "human",
      status: "approved",
      tags,
      source: "repository",
      sourceId: repo.id,
    });

    return { id };
  },
);
