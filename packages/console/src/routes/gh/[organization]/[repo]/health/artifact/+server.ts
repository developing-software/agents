import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { R2Bucket } from "@cloudflare/workers-types";
import { BranchArtifact } from "@agents/core/branch-artifact/index";

export const GET: RequestHandler = async ({ url, params, locals, platform }) => {
  if (!locals.userID) {
    return error(401, "Unauthorized");
  }

  const { organization, repo } = params;
  const branch = url.searchParams.get("branch");
  const category = url.searchParams.get("category");
  const name = url.searchParams.get("name");

  if (!branch || !category || !name) {
    return error(400, "Missing required params: branch, category, name");
  }

  const bucket = platform?.env?.Artifacts as R2Bucket | undefined;
  if (!bucket) {
    return error(503, "Artifact storage unavailable");
  }

  // First try the canonical key shape for both common extensions.
  const candidates: string[] = [];
  for (const ext of ["json", "txt"]) {
    candidates.push(BranchArtifact.checkKey(organization, repo, branch, category, name, ext));
  }

  for (const key of candidates) {
    const obj = await bucket.get(key);
    if (obj) {
      const contentType =
        obj.httpMetadata?.contentType ??
        (key.endsWith(".json") ? "application/json" : "text/plain");
      const text = await obj.text();
      return new Response(text, { headers: { "Content-Type": contentType } });
    }
  }

  // Fallback: scan the branch prefix and pick the first object whose key
  // contains both the category and the name — this is robust to future key
  // shape changes in the uploader without requiring a console redeploy.
  const prefix = BranchArtifact.branchPrefix(organization, repo, branch);
  const listed = await bucket.list({ prefix });
  const match = listed.objects.find((o) => {
    const k = o.key.toLowerCase();
    return k.includes(`/${category.toLowerCase()}/`) && k.includes(name.toLowerCase());
  });

  if (match) {
    const obj = await bucket.get(match.key);
    if (obj) {
      const contentType =
        obj.httpMetadata?.contentType ??
        (match.key.endsWith(".json") ? "application/json" : "text/plain");
      const text = await obj.text();
      return new Response(text, { headers: { "Content-Type": contentType } });
    }
  }

  // Nothing matched. Return a diagnostic body so the UI can show the user
  // which keys we tried and which keys actually exist under the branch.
  const diagnostic = {
    error: "Artifact not found",
    tried: candidates,
    available: listed.objects.slice(0, 20).map((o) => o.key),
    truncated: listed.objects.length > 20,
  };
  return new Response(JSON.stringify(diagnostic, null, 2), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
};
