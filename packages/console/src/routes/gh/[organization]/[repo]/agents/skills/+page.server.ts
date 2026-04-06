import type { PageServerLoad } from "./$types";
import { AgentSkill } from "@agents/core/agent";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { agentsSkills: [], claudeSkills: [] };

  const [agentsSkills, claudeSkills] = await Promise.all([
    AgentSkill.listAgentsSkills(repo),
    AgentSkill.listClaudeSkills(repo),
  ]);

  return { agentsSkills, claudeSkills };
};
