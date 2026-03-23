import { database } from "./database";
import { environment } from "./secrets";

export const bus = new sst.cloudflare.Queue("Bus", {})

bus.subscribe({

  handler: "./packages/workers/src/event.ts",
  environment,
  link: [
    database,
  ],
})
