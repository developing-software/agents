import type { PageServerLoad } from "./$types";
import { Event } from "@agents/core/events";
import { ChecksEvent } from "@agents/core/events/checks";

export const load: PageServerLoad = async ({ parent, url }) => {
  const { repo, organization, repoName } = await parent();
  const defaultBranch = repo?.defaultBranch ?? "dev";
  const branch = url.searchParams.get("branch") || defaultBranch;

  if (!repo) {
    return { branch, defaultBranch, checks: [], timeCreated: null };
  }

  try {
    const events = await Event.list({
      type: "checks",
      source: "repository",
      sourceId: repo.id,
      tags: [`gh:branch:${branch}`],
      limit: 1,
    });

    if (!events.length) {
      return { branch, defaultBranch, checks: [], timeCreated: null };
    }

    const event = events[0]!;
    const parsed = ChecksEvent.Completed.parse(event.data);

    // Flatten checks into an array for display
    const checks: Array<{
      category: string;
      name: string;
      outcome: string;
      summary: string | null;
    }> = [];

    for (const [category, names] of Object.entries(parsed.checks)) {
      for (const [name, result] of Object.entries(names)) {
        checks.push({
          category,
          name,
          outcome: result.outcome,
          summary: result.summary,
        });
      }
    }

    return {
      branch,
      defaultBranch,
      checks,
      timeCreated: event.timeCreated,
    };
  } catch {
    return { branch, defaultBranch, checks: [], timeCreated: null };
  }
};
