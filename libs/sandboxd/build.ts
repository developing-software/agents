import { createClient } from "@hey-api/openapi-ts";

createClient({
  input: {
    path: "https://raw.githubusercontent.com/developing-software/sandboxd/dev/api/client.yaml",
  },
  // GET on the terminal path is a WebSocket upgrade; a fetch against it can only fail.
  parser: {
    filters: { operations: { exclude: ["GET /sandboxes/{id}/terminal"] } },
  },
  output: import.meta.dir + "/src",
  plugins: [
    {
      name: "@hey-api/sdk",
      paramsStructure: "flat",
      exportFromIndex: true,
      operations: {
        containerName: "SandboxdSdk",
        strategy: "single",
      },
    },
  ],
});
