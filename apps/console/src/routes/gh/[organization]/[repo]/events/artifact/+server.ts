import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { R2Bucket } from "@cloudflare/workers-types";
import { Event } from "@agents/core/events/index";

export const GET: RequestHandler = async ({ url, locals, platform }) => {
  if (!locals.userID) {
    return error(401, "Unauthorized");
  }

  const bucket = platform?.env?.Artifacts as R2Bucket | undefined;
  if (!bucket) {
    return error(503, "Artifact storage unavailable");
  }

  const key = url.searchParams.get("key");
  if (key) {
    if (!key.startsWith("events/")) {
      return error(400, "Invalid artifact key");
    }
    const obj = await Event.Artifact.get(bucket, key);
    if (!obj) {
      return error(404, "Artifact not found");
    }
    const contentType = obj.httpMetadata?.contentType ?? "application/octet-stream";
    return new Response(obj.body as unknown as ReadableStream, {
      headers: { "Content-Type": contentType },
    });
  }

  const eventId = url.searchParams.get("eventId");
  if (!eventId) {
    return error(400, "Missing required param: eventId or key");
  }

  const artifacts = await Event.Artifact.listByEvent(bucket, eventId);
  return Response.json(artifacts);
};
