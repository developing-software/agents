import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { VisibleError, ErrorCodes, type ErrorResponseType } from "@agents/core/error";
import { Log } from "@agents/core/util/log";
import packageJson from "../../package.json";
import { LinkApi } from "./handler/link";
import { ProfileApi } from "./handler/profile";
import { getRuntimeKey } from "hono/adapter";
import { AppApi } from "./handler/app";
import { TokenApi } from "./handler/token";
import { AuthApi } from "./handler/auth";
import { auth } from "./middleware";

import { Homepage } from "../ui/homepage";
import { OpenApiUI } from "../ui/openapi";

const log = Log.create({ namespace: "api" });

export const app = new Hono();

app
  .use(logger())
  .use(async (c, next) => {
    c.header("Cache-Control", "no-store");
    return next();
  })
  .use(auth);

export const routes = app
  .route("/", AuthApi.route)
  .route("/link", LinkApi.routes)
  .route("/profile", ProfileApi.route)
  .route("/app", AppApi.route)
  .route("/token", TokenApi.route)
  .onError((error, c) => {
    if (error instanceof VisibleError) {
      return c.json<ErrorResponseType>(error.toResponse(), error.statusCode());
    }

    if (error instanceof HTTPException) {
      console.error("http error:", error);
      return c.json(
        {
          type: "validation",
          code: ErrorCodes.Validation.INVALID_PARAMETER,
          message: "Invalid request",
        },
        400,
      );
    }

    log.error(error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        type: "internal",
        code: ErrorCodes.Server.INTERNAL_ERROR,
        message: "Internal server error",
      },
      500,
    );
  });

app.get(
  "/openapi.json",
  openAPIRouteHandler(routes, {
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
        { description: "Local", url: "http://localhost:3000" },
        { description: "Production", url: process.env.API_URL ?? "http://localhost:3000" },
      ],
    },
  }),
);

app.get("/openapi", (_c) => OpenApiUI.Default());

app.get("/", Homepage).get("/healthz", async (c) => {
  const runtime = getRuntimeKey();
  const { healthcheck } = await import("@agents/core/drizzle/index");
  const dbCheck = await healthcheck();
  return c.json(
    { status: dbCheck.status, runtime, db: dbCheck.message },
    dbCheck.status === "ok" ? 200 : 503,
  );
});
