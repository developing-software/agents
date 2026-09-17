import { createHash } from "crypto"
import { readdirSync, statSync } from "fs"
import { database, hyperdrive } from "./database.ts";
import { environment } from "./secrets";
import { domain } from './stage.ts'

export const r2 = new sst.cloudflare.Bucket("Artifacts");

const dir = `${process.cwd()}/apps/console`

const hash = readdirSync(`${dir}/src`, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .reduce((h, e) => {
    const p = `${e.parentPath}/${e.name}`
    const s = statSync(p)
    return h.update(`${p}:${s.size}:${s.mtimeMs}`)
  }, createHash("sha1"))
  .digest("hex")

const build = new command.local.Command("ConsoleBuild", {
  dir,
  create: "bun run build",
  update: "bun run build",
  environment: {
    SVELTE_ADAPTER: "cloudflare",
  },
  triggers: [hash],
})

// Threading `build.stdout` makes `handler` an Output resolved only after ConsoleBuild,
// so `_worker.js` exists on disk before esbuild reads it (`dependsOn` can't order that).
const console = new sst.cloudflare.Worker("Console", {
  handler: build.stdout.apply(() => "./apps/console/.svelte-kit/cloudflare/_worker.js"),
  url: true,
  domain,
  assets: {
    directory: "./apps/console/.svelte-kit/cloudflare",
  },
  build: {

  },
  environment,
  link: [
    database,
    r2,
    hyperdrive
  ],
  placement: {
    region: "aws:sa-east-1"
  },
  transform: {
    worker: (args) => {
      args.compatibilityDate = "2026-03-19";
      args.compatibilityFlags = ["nodejs_compat"];
      args.bindings = $resolve(args.bindings ?? []).apply((bindings) => [
        ...bindings,

        // ["ai" "analytics_engine" "assets" "browser" "d1" "data_blob" "dispatch_namespace" "durable_object_namespace" "hyperdrive" "inherit" "images" "json" "kv_namespace" "mtls_certificate" "plain_text" "pipelines" "queue" "r2_bucket" "secret_text" "send_email" "service" "tail_consumer" "text_blob" "vectorize" "version_metadata" "secrets_store_secret" "secret_key" "workflow" "wasm_module"]
        {
          type: "send_email",
          name: "SEND_EMAIL",
        }
      ]);
      args.observability = {
        enabled: true,
        headSamplingRate: 1,
        logs: {
          enabled: true,
          invocationLogs: false,
          headSamplingRate: 1,
        },
      };
    },
  },
}, {
  dependsOn: [build],
});


export const outputs = {
  console: console.url,
};
