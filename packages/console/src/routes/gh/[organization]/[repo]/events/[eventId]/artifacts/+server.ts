import type { RequestHandler } from "./$types";
import { Event } from "@agents/core/events/index";
import type { R2Bucket } from "@cloudflare/workers-types";
import { json, error } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ params, platform }) => {
  const bucket = platform?.env.Artifacts as R2Bucket | undefined;
  if (!bucket) throw error(503, "Artifact storage unavailable");

  const artifacts = await Event.Artifact.listByEvent(bucket, params.eventId);
  return json(artifacts);
};
