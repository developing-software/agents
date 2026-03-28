import { query } from "$app/server";
import { z } from "zod";
import { GithubRepo } from "@agents/core/github/repo/index";
import { Event } from "@agents/core/events/index";

const input = z.object({
  organization: z.string(),
  repoName: z.string(),
  tags: z.array(z.string()).default([]),
  limit: z.number().default(30),
});

export const listEvents = query(input, async ({ organization, repoName, tags, limit }) => {
  const repo = await GithubRepo.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return Event.list({ source: "github_repo", sourceId: repo.id, tags, limit });
});

export const listTree = query(input, async ({ organization, repoName, tags, limit }) => {
  const repo = await GithubRepo.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return Event.listTree({ source: "github_repo", sourceId: repo.id, tags });
});
