import * as child_process from "node:child_process";

// SVELTE_ADAPTER=cloudflare builds the worker SST deploys (set by `infra/sst/cloudflare/console.ts`);
// anything else builds the standalone node server `dev-agents serve console` and Docker run.
const { default: adapter } =
  process.env.SVELTE_ADAPTER === "cloudflare"
    ? await import("@sveltejs/adapter-cloudflare")
    : await import("@sveltejs/adapter-node");

const gitRevision = (() => {
  try {
    return child_process.execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
  } catch {
    return process.env.GIT_COMMIT ?? "dev";
  }
})();

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    experimental: {
      remoteFunctions: true,
    },
    version: {
      name: gitRevision,
    },
  },
  compilerOptions: {
    experimental: {
      async: true,
    },
  },
  vitePlugin: {
    dynamicCompileOptions: ({ filename }) =>
      filename.includes("node_modules") ? undefined : { runes: true },
    inspector: {
      toggleKeyCombo: "control-shift",
      holdMode: true,
      showToggleButton: "always",
      toggleButtonPos: "bottom-right",
    },
  },
};

export default config;
