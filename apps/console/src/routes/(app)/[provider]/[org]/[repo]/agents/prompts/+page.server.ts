import type { PageServerLoad } from "./$types";
import { AgentPrompt } from "@agents/core/agent";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { prompts: [] };
  const prompts = await AgentPrompt.list(repo);
  return { prompts };
};
