import type { RequestHandler } from "./$types";
import { Event } from "@agents/core/events/index";
import type { R2Bucket } from "@cloudflare/workers-types";
import { error } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ params, platform }) => {
  const bucket = platform?.env.Artifacts as R2Bucket | undefined;
  if (!bucket) throw error(503, "Artifact storage unavailable");

  const key = `${Event.Artifact.keyPrefix(params.eventId)}${params.name}`;
  const obj = await bucket.get(key);
  if (!obj) throw error(404, "Artifact not found");

  const contentType = obj.httpMetadata?.contentType ?? "application/octet-stream";
  // @ts-ignore — CF Workers ReadableStream type conflicts with DOM types
  return new Response(obj.body, {
    headers: { "Content-Type": contentType },
  });
};
