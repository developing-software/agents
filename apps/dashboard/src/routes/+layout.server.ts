import { detectPlatform } from "@tanstack/svelte-hotkeys";
import { Identity } from "@agents/core/identity";
import { Feedback } from "@agents/core/feedback";
import { User } from "@agents/core/user";
import { DEFAULTS } from "@agents/core/user/prefs";
import { Agent } from "#lib/features/agent/api/core.ts";
import * as theme from "#lib/server/theme.ts";
import * as zone from "#lib/server/zone.ts";
import type { LayoutServerLoad } from "./$types";

/** Feeds the session context in `+layout.svelte`. Never reads the URL, so navigations skip it. */
export const load: LayoutServerLoad = async (event) => {
  // A preference save invalidates this key rather than every load on the page.
  event.depends("app:prefs");
  const base = {
    user: null,
    prefs: DEFAULTS,
    feedback: Feedback.enabled(),
    // A cookie, not localStorage, so the first painted HTML is already the right width.
    rail: event.cookies.get("rail") === "tight",
    // Hotkey labels render on the server too, so they need the reader's OS up front.
    platform: detectPlatform(event.request.headers.get("user-agent")),
  };

  // The actor, not the cookie: a stale or revoked token leaves a `public` actor.
  const actor = Identity.use();
  if (actor.type !== "user") return base;
  const user = await User.fromID(actor.properties.userID);
  if (!user) return base;

  // Realign the cookie, so a new browser paints the stored theme on its first visit.
  theme.write(event, user.prefs.theme);
  // The browser seeds an empty zone once; after that it is the user's choice.
  const seed = await zone.seed(event, user.prefs.zone);

  return {
    ...base,
    user,
    prefs: { ...user.prefs, zone: seed },
    agent: Agent.ready(),
  };
};
