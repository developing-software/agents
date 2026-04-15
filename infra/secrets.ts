export const ResendApiKey = new sst.Secret("ResendApiKey");
export const SenderEmailDomain = new sst.Secret("SenderEmailDomain");

export const GitHubClientId = new sst.Secret("GitHubClientId");
export const GitHubClientSecret = new sst.Secret("GitHubClientSecret");
export const GitHubWebhookSecret = new sst.Secret("GitHubWebhookSecret");
export const GitHubAppId = new sst.Secret("GitHubAppId");
export const GitHubAppPrivateKey = new sst.Secret("GitHubAppPrivateKey");

export const AnthropicApiKey = new sst.Secret("AntropicApiKey");


export const environment = {
  AUTH_URL: $interpolate`https://auth.agents.developing.company`,
  NO_COLOR: $app.stage === "prod" ? "1" : "",
  RESEND_API_KEY: ResendApiKey.value,
  SENDER_EMAIL_DOMAIN: SenderEmailDomain.value,
  GITHUB_CLIENT_ID: GitHubClientId.value,
  GITHUB_CLIENT_SECRET: GitHubClientSecret.value,
  GITHUB_WEBHOOK_SECRET: GitHubWebhookSecret.value,
  GITHUB_APP_ID: GitHubAppId.value,
  GITHUB_APP_PRIVATE_KEY: GitHubAppPrivateKey.value,
  ANTHROPIC_API_KEY: AnthropicApiKey.value
};
