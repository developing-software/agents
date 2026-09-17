import { Hono } from "hono";
import { health } from "../health";
import { app, routes } from "./routes";

export { app, routes };
export type Routes = typeof routes;

/** What every target serves: probes at the root, the API under `/api`. */
export const server = new Hono().route("/", health).route("/api", routes);
