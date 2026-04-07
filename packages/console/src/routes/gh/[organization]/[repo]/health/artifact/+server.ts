import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
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

  const bucket = platform?.env?.Artifacts;
  if (!bucket) {
    return error(503, "Artifact storage unavailable");
  }

  // Try .json then .txt
  for (const ext of ["json", "txt"]) {
    const key = BranchArtifact.checkKey(organization, repo, branch, category, name, ext);
    const obj = await BranchArtifact.get(bucket as any, key);
    if (obj) {
      const contentType = ext === "json" ? "application/json" : "text/plain";
      const text = await obj.text();
      return new Response(text, {
        headers: { "Content-Type": contentType },
      });
    }
  }

  return error(404, "Artifact not found");
};
