import devtoolsJson from "vite-plugin-devtools-json";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type PluginOption } from "vite";


export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    devtoolsJson(),
    cloudflaredPg()
  ],
});

function cloudflaredPg(): PluginOption {
  return {
    // Bundle postgres's CF Workers build instead of the Node.js build.
    // The CF build (postgres/cf/src/index.js) uses cloudflare:sockets via a
    // dynamic import inside Socket.connect(), so net/tls are never imported —
    // unenv-sst has nothing to stub.
    name: "postgres-cloudflare",
    enforce: "pre",
    async resolveId(id, importer, options) {
      if (id === "postgres" && options?.ssr) {
        const resolved = await this.resolve(id, importer, {
          ...options,
          skipSelf: true,
        });
        if (resolved && !resolved.external) {
          const cfPath = resolved.id.replace(/\/src\/index\.js$/, "/cf/src/index.js");
          if (cfPath !== resolved.id) return cfPath;
        }
      }
      // Leave cloudflare:* imports as external — resolved at CF Workers runtime.
      // The dynamic import('cloudflare:sockets') in postgres/cf/polyfills.js is
      // only called at runtime inside Socket.connect(), never during the build.
      if (id.startsWith("cloudflare:")) {
        return { id, external: true };
      }
    },
  };
}
