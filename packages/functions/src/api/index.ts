// import "zod-openapi/extend";
import { app, routes } from "./routes";
// import {  } from "hono/bun";

export type Routes = typeof routes;

import auth from "../auth";

const port = parseInt(process.env.PORT!) || 3000;
console.log(`Running at http://localhost:${port}`);

export default {
  port,
  fetch: (req: Request) => {
    const url = new URL(req.url);
    url.protocol = req.headers.get("x-forwarded-proto") ?? url.protocol;
    if (url.pathname.startsWith("/api/")) {
      return auth.fetch(new Request(String(url), req));
    }
    return app.fetch(new Request(String(url), req));
  },
};
