import type { Handle, HandleServerError } from "@sveltejs/kit";
import { authClient, getTokens, setTokens } from "$lib/auth";
import { subjects } from "@agents/functions/src/auth/subject";
import { Log } from "@agents/core/util/log";
import { VisibleError } from "@agents/core/error";
import { dev } from "$app/environment";
import { Actor } from "@agents/core/actor";
import { sequence } from "@sveltejs/kit/hooks";
import { withDatabase } from "@agents/core/drizzle/index";

const log = Log.create({ namespace: "console.hooks.server" })
const handleAuth: Handle = async ({ event, resolve }) => {

  if (!event.url.pathname.startsWith("/api")) {
    const { access, refresh } = getTokens(event);
    if (access) {
      try {
        const verified = await authClient.verify(subjects, access, {
          refresh: refresh ?? undefined,
        });

        if (!verified.err) {
          if (verified.tokens) {
            setTokens(event, verified.tokens.access, verified.tokens.refresh);
          }

          if (verified.subject.type === "user") {
            event.locals.userID = verified.subject.properties.userID;
            return await Actor.provide("user", {
              userID: verified.subject.properties.userID,
              clientID: "console"
            }, () =>
              resolve(event)
            )
          }
        }
      } catch (err) {
        log.warn("auth verification failed in hook", { error: String(err) });
      }
    }
  }
  return resolve(event);
};
const handleDb: Handle = async ({ event, resolve }) => {
  const url = event.platform?.env?.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL ?? "";
  return await withDatabase(url, async () => await resolve(event));
};
export const handle = sequence(handleDb, handleAuth);


export const handleError: HandleServerError = async ({
  error,
  event,
  status,
  message,
}) => {
  // const errorId = crypto.randomUUID()
  // // example integration with https://sentry.io/
  // Sentry.captureException(error, {
  //   extra: { event, errorId, status },
  // })
  if (status === 404) {
    return { message: 'Not found' };
  }

  log.info(
    `Error occurred during request to ${event.url.pathname}: ${message}`,
    {
      status,
      message,
    },
  );
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
    log.warn('unhandled error instance', {
      status,
      message: error.message,
      event: event.url.pathname,
    });
    if (dev) {
      return { message: error.message };
    }
    return { message: 'An unexpected error occurred.' };
  }

  log.warn('unhandled error type', {
    status,
    message,
    event: event.url.pathname,
  });
  if (dev) {
    return { message: String(error) };
  }
  return { message: 'An unexpected error occurred.' };
};
