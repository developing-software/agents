import { createClient } from "@hey-api/openapi-ts";

createClient({
  input: {
    path: "https://codeberg.org/swagger.v1.json",
  },
  output: import.meta.dir + "/src",
  plugins: [
    {
      name: "@hey-api/sdk",
      paramsStructure: "flat",
      exportFromIndex: true,
      operations: {
        containerName: "ForjeroSdk",
        strategy: "single",
      },
    },
  ],
});
