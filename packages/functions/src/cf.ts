import type { Hyperdrive, KVNamespace, R2Bucket } from "@cloudflare/workers-types";
import type { createCloudflareSender } from "@agents/core/email/cloudflare";

/** Bindings shared by every Cloudflare worker target. */
export interface Env {
  HYPERDRIVE: Hyperdrive;
}

/** Workers that send mail themselves. */
export interface EmailEnv extends Env {
  SEND_EMAIL: Parameters<typeof createCloudflareSender>[0];
}

/** Api worker extra: the artifacts bucket. */
export interface ApiEnv extends EmailEnv {
  Artifacts: R2Bucket;
}

/** Auth worker extra: OpenAuth's storage KV. */
export interface AuthEnv extends EmailEnv {
  AuthKv: KVNamespace;
}
