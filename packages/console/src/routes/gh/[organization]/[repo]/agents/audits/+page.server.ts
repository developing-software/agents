import type { PageServerLoad } from "./$types";
import { AgentAudit } from "@agents/core/agent/audit";
import { Event } from "@agents/core/events/index";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { audits: [], runs: [] };

  const [audits, runs] = await Promise.all([
    AgentAudit.list(repo),
    Event.list({
      source: "repository",
      sourceId: repo.id,
      type: "audit.completed",
      limit: 30,
    }),
  ]);

  return { audits, runs };
};
