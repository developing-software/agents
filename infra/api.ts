import { database, hyperdrive } from "./database.ts";
import { environment } from "./secrets.ts";
import { r2 } from "./console.ts";
import { subdomain } from './stage.ts'


const api = new sst.cloudflare.Worker("Api", {
  handler: "./packages/workers/src/api.ts",
  domain: subdomain(`api`),
  url: true,
  placement: {
    region: "aws:sa-east-1",
  },
  link: [
    database,
    r2,
    hyperdrive
  ],
  environment,
  build: {
    loader: {
      ".css": "text",
    },
  },
  transform: {
    worker: (args) => {
      args.compatibilityFlags = ["nodejs_compat"];
      args.bindings = $resolve(args.bindings ?? []).apply((bindings) => [
        ...bindings,
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
  api: api.url,
};
