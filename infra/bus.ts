import { database } from "./database";
import { environment } from "./secrets";

export const bus = new sst.cloudflare.Queue("Bus", {})

bus.subscribe({

  handler: "./packages/workers/src/event.ts",
  environment,
  link: [
    database,
  ],
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
})
