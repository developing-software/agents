import { database } from "./database.ts";
import { environment } from "./secrets";
import { baseDomain, subdomain } from './stage.ts'


if ($app.stage === "prod") {

  const authKv = new sst.cloudflare.Kv("AuthKv", {});

  const auth = new sst.cloudflare.Worker("AuthWorker", {
    handler: "./packages/workers/src/auth.ts",
    domain: subdomain(`auth`),
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

}
export const outputs = {
  auth: `auth.${baseDomain}`,
};
