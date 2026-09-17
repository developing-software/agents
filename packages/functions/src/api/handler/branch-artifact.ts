import { Hono } from "hono";
import { z } from "zod";
import type { R2Bucket } from "@cloudflare/workers-types";
import { ErrorCodes, VisibleError } from "@agents/core/error";
import { BranchArtifact } from "@agents/core/git/branch-artifact";
import { authRequired, validator } from "../common";

export namespace BranchArtifactApi {
  export const route = new Hono<{ Bindings: { Artifacts: R2Bucket } }>()
    // Upload a branch artifact
    .post(
      "/:owner/:repo/:branch",
      authRequired,
      validator(
        "param",
        z.object({
          owner: z.string(),
          repo: z.string(),
          branch: z.string(),
        }),
      ),
      async (c) => {
        const { owner, repo, branch } = c.req.valid("param");

        const body = await c.req.parseBody();
        const file = body["file"];
        const name = body["name"];

        if (!file || !(file instanceof File)) {
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
            "Missing required `file` field",
          );
        }
        if (!name || typeof name !== "string") {
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
            "Missing required `name` field",
          );
        }

        const key = `${owner}/${repo}/branches/${branch}/${name}`;
        const artifact = await BranchArtifact.upload(
          c.env.Artifacts,
          key,
          file.stream(),
          file.type || "application/octet-stream",
        );
        return c.json(artifact, 200);
      },
    )
    // Read a branch artifact
    .get("/:owner/:repo/:branch/*", authRequired, async (c) => {
      const { owner, repo, branch } = c.req.param();
      const rest = c.req.path.split(`/${branch}/`).slice(1).join(`/${branch}/`);
      if (!rest) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
          "Missing artifact path",
        );
      }

      const key = `${owner}/${repo}/branches/${branch}/${rest}`;
      const obj = await BranchArtifact.get(c.env.Artifacts, key);
      if (!obj) {
        throw new VisibleError(
          "not_found",
          ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
          `Artifact not found: ${rest}`,
        );
      }

      const contentType = obj.httpMetadata?.contentType || "application/octet-stream";
      return new Response(obj.body as unknown as ReadableStream, {
        headers: { "Content-Type": contentType },
      });
    });
}
