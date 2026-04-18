export const GitHubClientId = new sst.Secret("GitHubClientId");
export const GitHubClientSecret = new sst.Secret("GitHubClientSecret");
export const GitHubWebhookSecret = new sst.Secret("GitHubWebhookSecret");
export const GitHubAppId = new sst.Secret("GitHubAppId");
export const GitHubAppPrivateKey = new sst.Secret("GitHubAppPrivateKey");
export const GitHubAppSlug = new sst.Secret("GitHubAppSlug");

export const AnthropicApiKey = new sst.Secret("AntropicApiKey");

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
  ANTHROPIC_API_KEY: AnthropicApiKey.value,
  SESSION_SECRET: SessionSecret.value,
};
