import { r2 } from "./console";
import { database, hyperdrive } from "./database";
import { environment } from "./secrets";

export const bus = new sst.cloudflare.Queue("Bus", {})

bus.subscribe({

  handler: "./packages/workers/src/event.ts",
  environment,
  link: [
    database,
    hyperdrive,
    r2
  ],
  transform: {
    worker: (args) => {
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
