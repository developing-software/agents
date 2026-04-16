import { command, query } from "$app/server";
import { z } from "zod";
import { AgentAudit } from "@agents/core/agent/audit";
import { getProvider } from "@agents/core/git";
import { Event } from "@agents/core/events";
import { Plan } from "@agents/core/events/plan";
import { Tags } from "@agents/core/events/tag";
import { repoCommand, repoQuery } from "$lib/repo-remote";

export const listAudits = repoQuery({}, async ({ repo }) => AgentAudit.list(repo));

export const listAuditRuns = repoQuery({}, async ({ repo }) =>
  Event.list({
    source: "repository",
    sourceId: repo.id,
    type: "audit",
    limit: 30,
  }),
);

export const updateAudit = repoCommand(
  {
    name: z.string(),
    title: z.string(),
    description: z.string().optional(),
    body: z.string(),
    mode: z.enum(["direct", "pr"]),
  },
  async ({ repo, name, title, description, body, mode }) => {
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

export const createPlanFromAudit = repoCommand(
  {
    auditName: z.string(),
    auditTitle: z.string(),
    auditBody: z.string(),
  },
  async ({ organization, repoName, repo, auditName, auditTitle, auditBody }) => {
    const tags = [
      Tags.Git.provider(repo.source),
      Tags.Git.repo(repo.source, `${organization}/${repoName}`),
      `type:audit-${auditName}`,
    ];

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
