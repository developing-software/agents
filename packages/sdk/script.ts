import { createClient } from "@hey-api/openapi-ts";

createClient({
  input: {
    path: "http://localhost:5173/api/openapi.json",
  },
  output: "src/agents",
  plugins: [
    // ...other plugins
    {
      name: "@hey-api/sdk",
      operations: {
        containerName: "DevAgentSdk",
        strategy: "single",
      },
    },
  ],
});
