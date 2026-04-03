import { query } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository/index";
import { Event } from "@agents/core/events/index";

const input = z.object({
  organization: z.string(),
  repoName: z.string(),
  tags: z.array(z.string()).default([]),
  limit: z.number().default(30),
});

export const listEvents = query(input, async ({ organization, repoName, tags, limit }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return Event.list({ source: "repository", sourceId: repo.id, tags, limit });
});

export const listTree = query(input, async ({ organization, repoName, tags }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return Event.listTree({ source: "repository", sourceId: repo.id, tags });
});

export const getEventDetail = query(
  z.object({ eventId: z.string() }),
  async ({ eventId }) => {
    return Event.fromID(eventId);
  },
);
