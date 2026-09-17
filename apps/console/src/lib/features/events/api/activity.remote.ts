import { z } from "zod";
import { Event } from "@agents/core/events";
import { query } from "$app/server";
import { repoQuery } from "$lib/remote";

export const listEvents = repoQuery(
  {
    tags: z.array(z.string()).default([]),
    limit: z.number().default(30),
  },
  async ({ repo, tags, limit }) =>
    Event.list({ source: "repository", sourceId: repo.id, tags, limit }),
);

export const listTree = repoQuery(
  {
    tags: z.array(z.string()).default([]),
    rootEventId: z.string().optional(),
  },
  async ({ repo, tags, rootEventId }) =>
    Event.listTree({ source: "repository", sourceId: repo.id, tags, rootEventId }),
);

export const getEventDetail = query(z.object({ eventId: z.string() }), async ({ eventId }) => {
  return Event.fromID(eventId);
});
