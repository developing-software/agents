import { database } from "./database.ts";
import {
  ResendApiKey,
  SenderEmailDomain,
  GitHubClientId,
  GitHubClientSecret,
  GitHubWebhookSecret,
  GitHubAppId,
  GitHubAppPrivateKey,
} from "./secrets";
import { domain } from './stage.ts'

const environment = {
  RESEND_API_KEY: ResendApiKey.value,
  SENDER_EMAIL_DOMAIN: SenderEmailDomain.value,
  GITHUB_CLIENT_ID: GitHubClientId.value,
  GITHUB_CLIENT_SECRET: GitHubClientSecret.value,
  GITHUB_WEBHOOK_SECRET: GitHubWebhookSecret.value,
  GITHUB_APP_ID: GitHubAppId.value,
  GITHUB_APP_PRIVATE_KEY: GitHubAppPrivateKey.value,
  DATABASE_URL: database.properties.url,
};
const authKv = new sst.cloudflare.Kv("AuthKv", {});

new sst.cloudflare.Worker("MyAuthWorker", {
  handler: "./packages/workers/src/auth.ts",
  domain: $interpolate`auth.${domain}`,
  url: true,
  placement: {
    mode: "smart",
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

new sst.cloudflare.Worker("console", {
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
