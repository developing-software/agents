import { query } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository";
import { Event } from "@agents/core/events";

const input = z.object({
  organization: z.string(),
  repoName: z.string(),
  tags: z.array(z.string()).default([]),
  limit: z.number().default(30),
});

const treeInput = input.extend({
  rootEventId: z.string().optional(),
});

export const listEvents = query(input, async ({ organization, repoName, tags, limit }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return Event.list({ source: "repository", sourceId: repo.id, tags, limit });
});

export const listTree = query(treeInput, async ({ organization, repoName, tags, rootEventId }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return Event.listTree({ source: "repository", sourceId: repo.id, tags, rootEventId });
});

export const getEventDetail = query(z.object({ eventId: z.string() }), async ({ eventId }) => {
  return Event.fromID(eventId);
});
