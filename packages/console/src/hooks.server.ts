import type { Handle } from "@sveltejs/kit";
import { authClient } from "@agents/functions/src/api/auth";
import { subjects } from "@agents/functions/src/auth/subject";
import { User } from "@agents/core/user/index";

export const handle: Handle = async ({ event, resolve }) => {
  const access = event.cookies.get("access_token");
  const refresh = event.cookies.get("refresh_token");

  if (access) {
    const verified = await authClient.verify(subjects, access, {
      refresh: refresh ?? undefined,
    });

    if (!verified.err) {
      if (verified.tokens) {
        const opts = { httpOnly: true, sameSite: "lax", path: "/", maxAge: 34560000 } as const;
        event.cookies.set("access_token", verified.tokens.access, opts);
        event.cookies.set("refresh_token", verified.tokens.refresh, opts);
      }

      if (verified.subject.type === "user") {
        const user = await User.fromID(verified.subject.properties.userID);
        event.locals.user = user ?? null;
      }
    }
  }

  return resolve(event);
};
