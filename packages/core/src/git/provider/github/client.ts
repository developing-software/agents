import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import { VisibleError } from "../../../error";
import { Repository } from "../../../repository";

function readConfig() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!appId || !privateKey) {
    throw new VisibleError("internal", "internal_error", "GitHub App credentials not configured");
  }
  return { appId, privateKey, webhookSecret };
}

export function createApp(): App {
  const { appId, privateKey, webhookSecret } = readConfig();
  return new App({
    appId,
    privateKey,
    webhooks: webhookSecret ? { secret: webhookSecret } : undefined,
    Octokit,
  });
}

export async function appClient(installationRef: string | number): Promise<Octokit> {
  const app = createApp();
  const id = typeof installationRef === "number" ? installationRef : Number(installationRef);
  if (!Number.isFinite(id)) {
    throw new VisibleError("validation", "invalid_installation", "Invalid GitHub installation ref");
  }
  return (await app.getInstallationOctokit(id)) as unknown as Octokit;
}

export function tokenClient(token: string): Octokit {
  return new Octokit({ auth: token });
}

export async function createInstallationToken(
  installationRef: string,
): Promise<{ token: string; expiresAt: Date }> {
  const app = createApp();
  const id = Number(installationRef);
  const { data } = await app.octokit.request(
    "POST /app/installations/{installation_id}/access_tokens",
    {
      installation_id: id,
    },
  );
  return { token: data.token, expiresAt: new Date(data.expires_at) };
}

export async function resolveInstallationRef(fullName: string): Promise<string> {
  const repo = await Repository.findByFullNameForWebhook(fullName);
  if (!repo?.installationRef) {
    throw new VisibleError(
      "not_found",
      "installation_not_found",
      `No GitHub installation registered for ${fullName}`,
    );
  }
  return repo.installationRef;
}

export async function clientFor(fullName: string): Promise<Octokit> {
  const ref = await resolveInstallationRef(fullName);
  return appClient(ref);
}

export function splitFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new VisibleError("validation", "invalid_repo", `Invalid fullName "${fullName}"`);
  }
  return { owner, repo };
}
