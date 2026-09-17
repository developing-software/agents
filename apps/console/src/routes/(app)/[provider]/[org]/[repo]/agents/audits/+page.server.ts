import type { PageServerLoad } from "./$types";
import { AgentAudit } from "@agents/core/agent/audit";
import { Event } from "@agents/core/events";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { audits: [], runs: [], repoId: null };

  const [audits, runs] = await Promise.all([
    AgentAudit.list(repo),
    Event.list({
      source: "repository",
      sourceId: repo.id,
      type: "audit",
      limit: 50,
    }),
  ]);

  return { audits, runs, repoId: repo.id };
};
