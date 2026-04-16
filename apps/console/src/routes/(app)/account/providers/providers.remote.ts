import { form, getRequestEvent } from "$app/server";
import { z } from "zod";
import { invalid, redirect } from "@sveltejs/kit";
import { Auth } from "@agents/core/auth";

export const unlinkProvider = form(
  z.object({
    id: z.string().min(1, "Missing id"),
  }),
  async ({ id }) => {
    const { locals } = getRequestEvent();
    if (locals.actor.type === "public") redirect(302, "/login");

    try {
      await Auth.remove({ id, accountID: locals.actor.properties.accountID });
    } catch (err) {
      invalid(err instanceof Error ? err.message : "Failed to unlink.");
    }

    return { ok: true as const };
  },
);
