import { command, query } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository/index";
import { AgentAudit } from "@agents/core/agent/audit";
import { GithubContent } from "@agents/core/github/repo/content";
import { Event } from "@agents/core/events/index";
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

    return GithubContent.commitFiles({
      repo,
      files: [{ path: `.agents/audits/${name}.md`, content }],
      message: `Update audit: ${name}`,
      mode,
    });
  },
);
