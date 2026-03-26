import { database } from "./database.ts";
import { environment } from "./secrets";
import { domain } from './stage.ts'


const console = new sst.cloudflare.Worker("Console", {
  handler: "./packages/console/.svelte-kit/cloudflare/_worker.js",
  url: true,
  domain,
  assets: {
    directory: "./packages/console/.svelte-kit/cloudflare",
  },
  build: {

  },
  environment,
  link: [
    database
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
