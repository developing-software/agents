import { database, hyperdrive } from "./database.ts";
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
      database,
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
