import type { RequestHandler } from "./$types";
import { GithubEvent } from "@agents/core/github/event/index";
import type { R2Bucket } from "@cloudflare/workers-types";
import { error } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ params, platform }) => {
  const bucket = platform?.env.Artifacts as R2Bucket | undefined;
  if (!bucket) throw error(503, "Artifact storage unavailable");

  const key = `${GithubEvent.Artifact.keyPrefix(params.eventId)}${params.name}`;
  const obj = await bucket.get(key);
  if (!obj) throw error(404, "Artifact not found");

  const contentType = obj.httpMetadata?.contentType ?? "application/octet-stream";
  return new Response(obj.body, {
    headers: { "Content-Type": contentType },
  });
};
