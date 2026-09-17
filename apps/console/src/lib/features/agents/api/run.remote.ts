import { command } from "$app/server";
import { z } from "zod";
import { AgentDispatch } from "@agents/core/agent";
import { withRequestRepoActor } from "$lib/server/repository.server";

const RunInput = z.object({
  organization: z.string(),
  repoName: z.string(),
  eventId: z.string(),
});

/** Short-lived wss:// terminal URL for a run's sandbox. */
export const openRunTerminal = command(RunInput, async ({ organization, repoName, eventId }) =>
  withRequestRepoActor({ organization, repoName }, () => AgentDispatch.terminal(eventId)),
);

/** Sync a live run's state from sandboxd. */
export const refreshRun = command(RunInput, async ({ organization, repoName, eventId }) =>
  withRequestRepoActor({ organization, repoName }, () => AgentDispatch.refresh(eventId)),
);

/** End a run's sandbox now. */
export const stopRun = command(RunInput, async ({ organization, repoName, eventId }) =>
  withRequestRepoActor({ organization, repoName }, () => AgentDispatch.end(eventId)),
);
