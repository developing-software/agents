import type { Handle, HandleServerError } from "@sveltejs/kit";
import { Log } from "@agents/core/util/log";
import { VisibleError } from "@agents/core/error";
import { dev } from "$app/environment";
import { Actor } from "@agents/core/actor";
import { sequence } from "@sveltejs/kit/hooks";
import { Database } from "@agents/core/drizzle";
import { withCacheContext, CacheApiAdapter } from "@agents/core/cache";
import { Email } from "@agents/core/email";
import { createCloudflareSender } from "@agents/core/email/cloudflare";
import { readSession } from "$lib/server/session";

const log = Log.create({ namespace: "console.hooks.server" });

const handleAuth: Handle = async ({ event, resolve }) => {
  if (event.isSubRequest) return resolve(event);
  event.locals.workspaceActors = new Map();

  const session = await readSession(event).catch(() => null);
  const current = session?.current;
  const account = current ? session!.accounts[current] : undefined;

  if (account && current) {
    event.locals.actor = {
      type: "account",
      properties: { accountID: current, email: account.email },
    };
  } else {
    event.locals.actor = { type: "public", properties: {} };
  }

  return await Actor.provide(event.locals.actor.type, event.locals.actor.properties, () =>
    resolve(event),
  );
};

const handleDb: Handle = async ({ event, resolve }) => {
  const url = event.platform?.env?.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL;
  if (!url) return resolve(event);
  return await Database.provide(url, async () => await resolve(event));
};
const handleCache: Handle = async ({ event, resolve }) => {
  if (!event.platform?.caches) return resolve(event);
  const cache = await event.platform.caches.open("agents:v1");
  const adapter = new CacheApiAdapter(cache);
  return withCacheContext(adapter, { prefix: "console" }, () => resolve(event));
};
const handleEmail: Handle = async ({ event, resolve }) => {
  const binding = event.platform?.env?.SEND_EMAIL;
  if (!binding) return resolve(event);
  return Email.provide(createCloudflareSender(binding), () => resolve(event));
};

export const handle = sequence(handleDb, handleCache, handleEmail, handleAuth);

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
