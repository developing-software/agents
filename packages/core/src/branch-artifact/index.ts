import { z } from "zod";
import type { R2Bucket } from "@cloudflare/workers-types";

export namespace BranchArtifact {
  export const Info = z.object({
    key: z.string(),
    size: z.number().int(),
    uploaded: z.string(),
  });
  export type Info = z.infer<typeof Info>;

  /** Deterministic key for branch check artifacts — overwrites on each upload. */
  export function checkKey(
    owner: string,
    repo: string,
    branch: string,
    category: string,
    name: string,
    ext: string,
  ): string {
    return `${owner}/${repo}/branches/${branch}/checks/${category}/${name}.${ext}`;
  }

  /** R2 prefix for all checks on a branch. */
  export function branchPrefix(owner: string, repo: string, branch: string): string {
    return `${owner}/${repo}/branches/${branch}/checks/`;
  }

  export async function upload(
    bucket: R2Bucket,
    key: string,
    body:
      | string
      | ArrayBuffer
      | ArrayBufferView<ArrayBufferLike>
      | ReadableStream<any>
      | Blob
      | null,
    contentType: string,
  ): Promise<Info> {
    // @ts-expect-error Blob type mismatch between Cloudflare and Node
    const obj = await bucket.put(key, body, {
      httpMetadata: { contentType },
    });
    return {
      key,
      size: obj!.size,
      uploaded: obj!.uploaded.toISOString(),
    };
  }

  export async function get(bucket: R2Bucket, key: string) {
    return bucket.get(key);
  }

  export async function listChecks(
    bucket: R2Bucket,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<Info[]> {
    const prefix = branchPrefix(owner, repo, branch);
    const listed = await bucket.list({ prefix });
    return listed.objects.map((o: { key: string; size: number; uploaded: Date }) => ({
      key: o.key,
      size: o.size,
      uploaded: o.uploaded.toISOString(),
    }));
  }
}
