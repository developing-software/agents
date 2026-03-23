import { database } from "./database.ts";
import { environment } from "./secrets";
import { domain } from './stage.ts'


const authKv = new sst.cloudflare.Kv("AuthKv", {});

const auth = new sst.cloudflare.Worker("AuthWorker", {
  handler: "./packages/workers/src/auth.ts",
  domain: $interpolate`auth.${domain}`,
  url: true,
  placement: {
    region: "aws:sa-east-1",
  },
  link: [
    authKv,
    database
  ],
  environment,
  build: {
    loader: {
      ".css": "text",
    },
  },
  transform: {
    worker: (args) => {
      // args.bindings = $resolve(args.bindings ?? []).apply((bindings) => [
      //   ...bindings,
      //   {
      //     type: "hyperdrive",
      //     name: "HYPERDRIVE",
      //     id: hyperdrive.id,
      //   },
      // ]);
      args.observability = {
        enabled: true,
        headSamplingRate: 1,
        logs: {
          enabled: true,
          invocationLogs: true,
          headSamplingRate: 1,
        },
      };
    },
  },
});

const console = new sst.cloudflare.Worker("Console", {
  handler: "./packages/console/.svelte-kit/cloudflare/_worker.js",
  url: true,
  domain,
  assets: {
    directory: "./packages/console/.svelte-kit/cloudflare",
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
      args.compatibilityFlags = ["nodejs_compat"];
      args.observability = {
        enabled: true,
        headSamplingRate: 1,
        logs: {
          enabled: true,
          invocationLogs: true,
          headSamplingRate: 1,
        },
      };
    },
  },
});

export const outputs = {
  auth: auth.url,
  console: console.url,
};


// if ($dev) {
//   new sst.x.DevCommand("Console", {
//     dev: {
//       title: "Console",
//       command: "bun run dev",
//       directory: "packages/console",
//     },
//     environment
//   });

//   new sst.x.DevCommand("Auth", {
//     dev: {
//       title: "Auth",
//       command: "bun run dev:auth",
//       directory: "packages/functions",
//     },
//     environment
//   });
// }
