import { Models } from "../models/client";
import { AgentWorkflow } from "./workflow";

export namespace AgentCompat {
  export interface AgentConfig {
    /** Human-readable label */
    label: string;
    /** Compatible provider IDs from models.dev */
    providers: string[];
    /** Curated model family prefixes shown by default */
    featured: string[];
    /** Default model ID (formatted for the agent's workflow) */
    defaultModel: string;
    /** Transform a models.dev model ID to the format this agent's workflow expects */
    formatModelId: (modelId: string, providerId: string) => string;
  }

  export const config: Record<AgentWorkflow.Agent, AgentConfig> = {
    claude: {
      label: "Claude",
      providers: ["anthropic"],
      featured: ["claude-sonnet", "claude-opus", "claude-haiku"],
      defaultModel: "claude-sonnet-4-6",
      formatModelId: (modelId) => modelId,
    },
    opencode: {
      label: "OpenCode",
      providers: ["openai", "anthropic", "google"],
      featured: [
        "gpt",
        "gpt-pro",
        "o",
        "o-mini",
        "o-pro",
        "claude-sonnet",
        "claude-opus",
        "gemini-pro",
        "gemini-flash",
      ],
      defaultModel: "openai/gpt-5.4-pro",
      formatModelId: (modelId, providerId) => `${providerId}/${modelId}`,
    },
    codex: {
      label: "Codex",
      providers: ["openai"],
      featured: ["o", "o-mini", "gpt", "gpt-pro", "gpt-codex"],
      defaultModel: "o3",
      formatModelId: (modelId) => modelId,
    },
  };

  export interface AgentModelInfo {
    /** Model ID formatted for dispatch (e.g., "openai/gpt-5.4-pro") */
    id: string;
    /** Raw models.dev model ID */
    modelId: string;
    /** Display name from models.dev */
    label: string;
    /** Model family */
    family: string | null;
    /** Provider ID */
    providerId: string;
    /** Provider display name */
    providerName: string;
    /** Provider logo URL */
    providerLogo: string;
    /** Pricing info */
    cost: Models.Cost | null;
    /** Token limits */
    limit: Models.Limit | null;
    /** Whether the model supports reasoning */
    reasoning: boolean;
    /** Whether this is the agent's default model */
    isDefault: boolean;
  }

  function toModelInfo(
    model: Models.Info & { providerId: string; providerName: string },
    agentConfig: AgentConfig,
  ): AgentModelInfo {
    const id = agentConfig.formatModelId(model.id, model.providerId);
    return {
      id,
      modelId: model.id,
      label: model.name,
      family: model.family ?? null,
      providerId: model.providerId,
      providerName: model.providerName,
      providerLogo: Models.logoUrl(model.providerId),
      cost: model.cost ?? null,
      limit: model.limit ?? null,
      reasoning: model.reasoning ?? false,
      isDefault: id === agentConfig.defaultModel,
    };
  }

  function compatibleModels(
    allModels: (Models.Info & { providerId: string; providerName: string })[],
    agentConfig: AgentConfig,
  ) {
    return allModels.filter(
      (m) => agentConfig.providers.includes(m.providerId) && m.tool_call !== false,
    );
  }

  /** Returns curated models matching the agent's featured family prefixes. */
  export async function featuredModels(agent: AgentWorkflow.Agent): Promise<AgentModelInfo[]> {
    const agentConfig = config[agent];
    const all = await Models.allModels();
    const compatible = compatibleModels(all, agentConfig);

    return compatible
      .filter((m) => {
        const family = (m.family ?? m.id).toLowerCase();
        return agentConfig.featured.some((prefix) => family.startsWith(prefix.toLowerCase()));
      })
      .map((m) => toModelInfo(m, agentConfig));
  }

  /** Returns all compatible models for the agent (filtered by provider + tool_call support). */
  export async function allModels(agent: AgentWorkflow.Agent): Promise<AgentModelInfo[]> {
    const agentConfig = config[agent];
    const all = await Models.allModels();
    return compatibleModels(all, agentConfig).map((m) => toModelInfo(m, agentConfig));
  }
}
