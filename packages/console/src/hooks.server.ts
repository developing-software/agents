import type { Handle, HandleServerError } from "@sveltejs/kit";
import { verifyUser } from "$lib/auth";
import { Log } from "@agents/core/util/log";
import { VisibleError } from "@agents/core/error";
import { dev } from "$app/environment";
import { Actor } from "@agents/core/actor";
import { sequence } from "@sveltejs/kit/hooks";
import { withDatabase } from "@agents/core/drizzle/index";
import { withCacheContext, CacheApiAdapter } from "@agents/core/cache/index";

const log = Log.create({ namespace: "console.hooks.server" });

const handleAuth: Handle = async ({ event, resolve }) => {
  try {
    const user = await verifyUser(event);
    if (user) {
      event.locals.userID = user.userID;
    }
  } catch (err) {
    log.warn("auth verification failed", { error: String(err) });
  }

  if (event.locals.userID) {
    return await Actor.provide(
      "user",
      {
        userID: event.locals.userID,
        clientID: "console",
      },
      () => resolve(event),
    );
  }

  return await Actor.provide("public", {}, () => resolve(event));
};

const handleDb: Handle = async ({ event, resolve }) => {
  const url = event.platform?.env?.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL;
  if (!url) return resolve(event);
  return await withDatabase(url, async () => await resolve(event));
};
const handleCache: Handle = async ({ event, resolve }) => {
  if (!event.platform?.caches) return resolve(event);
  const cache = await event.platform.caches.open("agents:v1");
  const adapter = new CacheApiAdapter(cache);
  return withCacheContext(adapter, { prefix: "console" }, () => resolve(event));
};

export const handle = sequence(handleDb, handleCache, handleAuth);

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
  if (status === 404) {
    return { message: "Not found" };
  }

  log.info(`Error occurred during request to ${event.url.pathname}: ${message}`, {
    status,
    message,
  });
  if (error instanceof VisibleError) {
    log.warn(error.message, {
      status,
      code: error.code,
      path: event.url.pathname,
    });
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    log.warn("unhandled error instance", {
      status,
      message: error.message,
      event: event.url.pathname,
    });
    if (dev) {
      return { message: error.message };
    }
    return { message: "An unexpected error occurred." };
  }

  log.warn("unhandled error type", {
    status,
    message,
    event: event.url.pathname,
  });
  if (dev) {
    return { message: String(error) };
  }
  return { message: "An unexpected error occurred." };
};
