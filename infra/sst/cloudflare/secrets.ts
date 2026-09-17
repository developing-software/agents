export const GitHubClientId = new sst.Secret("GitHubClientId");
export const GitHubClientSecret = new sst.Secret("GitHubClientSecret");
export const GitHubWebhookSecret = new sst.Secret("GitHubWebhookSecret");
export const GitHubAppId = new sst.Secret("GitHubAppId");
export const GitHubAppPrivateKey = new sst.Secret("GitHubAppPrivateKey");
export const GitHubAppSlug = new sst.Secret("GitHubAppSlug");

export const LlmApiKey = new sst.Secret("LlmApiKey");
export const SandboxdToken = new sst.Secret("SandboxdToken");

export const SessionSecret = new sst.Secret("SessionSecret");


export const environment = {
  AUTH_URL: $interpolate`https://auth.agents.developing.company`,
  NO_COLOR: $app.stage === "prod" ? "1" : "",
  GITHUB_CLIENT_ID: GitHubClientId.value,
  GITHUB_CLIENT_SECRET: GitHubClientSecret.value,
  GITHUB_WEBHOOK_SECRET: GitHubWebhookSecret.value,
  GITHUB_APP_ID: GitHubAppId.value,
  GITHUB_APP_PRIVATE_KEY: GitHubAppPrivateKey.value,
  GITHUB_APP_SLUG: GitHubAppSlug.value,
  LLM_API_KEY: LlmApiKey.value,
  LLM_BASE_URL: "https://llm.developing.company/v1",
  SANDBOXD_URL: "https://sandboxd.developing.company",
  SANDBOXD_TOKEN: SandboxdToken.value,
  SANDBOXD_AGENT_IMAGE: "ghcr.io/developing-software/agents-runner:latest",
  AGENTS_API_URL: "https://api.agents.developing.company/api",
  SESSION_SECRET: SessionSecret.value,
};
