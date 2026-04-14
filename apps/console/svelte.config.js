import adapter from "@sveltejs/adapter-cloudflare";
import * as child_process from 'node:child_process';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    experimental: {
      remoteFunctions: true,
    },
    version: {
      name: child_process.execSync('git rev-parse HEAD').toString().trim()
    }
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
