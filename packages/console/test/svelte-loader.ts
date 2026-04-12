import { plugin } from "bun";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, compileModule } from "svelte/compiler";
import { mock } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Register happy-dom globally at load time so that `screen` from
// @testing-library / dom can bind to document.body on import.
GlobalRegistrator.register();

// beforeEach(async () => {
//   await GlobalRegistrator.register();
// });

// afterEach(async () => {
//   await GlobalRegistrator.unregister();
// });
// Redirect svelte imports to browser/client entries so tests can use
// `import { mount } from "svelte"` without --conditions browser.
const svelteRoot = dirname(dirname(fileURLToPath(import.meta.resolve("svelte"))));
const browserExports: Record<string, string> = {
  svelte: "src/index-client.js",
  "svelte/legacy": "src/legacy/legacy-client.js",
  "svelte/reactivity": "src/reactivity/index-client.js",
  "svelte/store": "src/store/index-client.js",
};
for (const [specifier, clientPath] of Object.entries(browserExports)) {
  mock.module(specifier, () => import(join(svelteRoot, clientPath)));
}

plugin({
  name: "test-svelte-loader",
  setup(builder) {
    builder.onLoad({ filter: /\.svelte(?:\.[cm]?[jt]s)?(?:\?.*)?$/ }, ({ path }) => {
      const filename = path.includes("?") ? path.slice(0, path.indexOf("?")) : path;
      const source = readFileSync(filename, "utf8");
      const isModule = /\.svelte\.[cm]?[jt]s$/.test(filename);
      const isLocalFile = !filename.includes("/node_modules/");
      const result = isModule
        ? compileModule(source, {
            filename,
            dev: false,
            generate: "client",
          })
        : compile(source, {
            filename,
            generate: "client",
            css: "injected",
            dev: false,
            runes: isLocalFile ? true : undefined,
          });

      return {
        contents: result.js.code,
        loader: "js",
      };
    });
  },
});
