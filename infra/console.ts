import { database } from "./database.ts";
import { environment } from "./secrets";
import { domain } from './stage.ts'

export const r2 = new sst.cloudflare.Bucket("Artifacts");

const console = new sst.cloudflare.Worker("Console", {
  handler: "./apps/console/.svelte-kit/cloudflare/_worker.js",
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
    r2
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
        {
          type: "hyperdrive",
          name: "HYPERDRIVE",
          id: "ebb41070546a4f5baf5bf1a37877f13c",
        },
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
});


export const outputs = {
  console: console.url,
};
