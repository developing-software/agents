import { Octokit } from "@octokit/rest";
import { App } from "@octokit/app";
import { createContext } from "../context";
import { VisibleError } from "../error";

export namespace GitHub {
  export interface AppConfig {
    appId: string;
    privateKey: string;
    webhookSecret?: string;
  }

  const Context = createContext<Octokit>();

  export function fromToken(token: string): Octokit {
    return new Octokit({ auth: token });
  }

  export function fromApp(config: AppConfig): App {
    return new App({
      appId: config.appId,
      privateKey: config.privateKey,
      webhooks: config.webhookSecret ? { secret: config.webhookSecret } : undefined,
      Octokit,
    });
  }

  export async function installationClient(app: App, installationId: number): Promise<Octokit> {
    return app.getInstallationOctokit(installationId) as unknown as Octokit;
  }

  export async function appClient(installationId: number): Promise<Octokit> {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
    if (!appId || !privateKey)
      throw new VisibleError("internal", "internal_error", "GitHub App credentials not configured");
    const app = fromApp({ appId, privateKey });
    return installationClient(app, installationId);
  }

  export function provide<R>(client: Octokit, fn: () => R): R {
    return Context.provide(client, fn);
  }

  export function use(): Octokit {
    return Context.use();
  }
}
