/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "agents",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "local",
      providers: { railway: "0.4.4" },
    };
  },
  console: {
    autodeploy: {
      async workflow({ $, event }) {
        await $`bun install`;
        if (event.action === "removed") {
          await $`bun sst remove`;
          return;
        }
        await $`bun run build`
          .cwd("./apps/console");

        await $`bun sst deploy`;
        // if (event.type === "branch" && event.branch === "dev")
        //   await $`bun run test`.cwd("./packages/functions");
      },
    },
  },
  async run() {
    const outputs = {};
    const { readdirSync } = await import("fs");
    for (const value of readdirSync("./infra/")) {
      const result = await import("./infra/" + value);
      if (result.outputs) Object.assign(outputs, result.outputs);
    }
    return outputs;
  },
});
