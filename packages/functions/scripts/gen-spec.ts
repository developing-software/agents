import { generateSpecs } from "hono-openapi";
import { routes } from "../src/api/routes";
import packageJson from "../package.json";

const spec = await generateSpecs(routes, {
  documentation: {
    info: {
      title: "API",
      description: "",
      version: packageJson.version ?? "1.0.0",
    },
    components: {
      securitySchemes: {
        Bearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ Bearer: [] }],
    servers: [
      { description: "Local", url: process.env.API_URL ?? "https://agents-dev.developing.company/api" },
      { description: "Production", url: process.env.API_URL ?? "https://agents.developing.company/api" },
    ],
  },
});

await Bun.write(import.meta.dir + "/../../sdk/openapi.json", JSON.stringify(spec, null, 2));
console.log("Wrote openapi.json");
