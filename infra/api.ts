import { database } from "./database.ts";
import { environment } from "./secrets.ts";
import { domain } from './stage.ts'


const api = new sst.cloudflare.Worker("Api", {
  handler: "./packages/workers/src/api.ts",
  domain: $interpolate`api.${domain}`,
  url: true,
  placement: {
    region: "aws:sa-east-1",
  },
  link: [
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
  api: api.url,
};
