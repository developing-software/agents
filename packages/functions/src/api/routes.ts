import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { VisibleError, ErrorCodes, type ErrorResponseType } from "@agents/core/error";
import { Log } from "@agents/core/util/log";
import { ProfileApi } from "./handler/profile";
import { getRuntimeKey } from "hono/adapter";
import { AppApi } from "./handler/app";
import { TokenApi } from "./handler/token";
import { AuthApi } from "./handler/auth";
import { EventApi } from "./handler/event";
import { GitHubApi } from "./handler/github";
import { ModelsApi } from "./handler/models";
import { auth } from "./middleware";


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
  .route("/profile", ProfileApi.route)
  .route("/app", AppApi.route)
  .route("/token", TokenApi.route)
  .route("/events", EventApi.route)
  .route("/github", GitHubApi.route)
  .route("/models", ModelsApi.route)
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

app.get("/healthz", async (c) => {
  const runtime = getRuntimeKey();
  const { healthcheck } = await import("@agents/core/drizzle/index");
  const dbCheck = await healthcheck();
  return c.json(
    { status: dbCheck.status, runtime, db: dbCheck.message },
    dbCheck.status === "ok" ? 200 : 503,
  );
});
