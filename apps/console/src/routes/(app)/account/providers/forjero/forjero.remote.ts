import { command, getRequestEvent } from "$app/server";
import { z } from "zod";
import { error } from "@sveltejs/kit";
import { Installation } from "@agents/core/git/installation";
import { Repository } from "@agents/core/repository";
import { forjeroProvider, sdkForToken } from "@agents/core/git/provider/forjero";

const DEFAULT_BASE_URL = "https://codeberg.org";

export const connectForjero = command(
  z.object({
    baseUrl: z.string().trim().optional(),
    personalAccessToken: z.string().trim().min(1, "Personal Access Token is required"),
    webhookSecret: z.string().trim().optional(),
  }),
  async ({ baseUrl, personalAccessToken, webhookSecret }) => {
    const { locals } = getRequestEvent();
    if (locals.actor.type !== "account") error(401, "Sign in required");
    const accountId = locals.actor.properties.accountID;

    const resolvedBaseUrl = baseUrl && baseUrl.length > 0 ? baseUrl : DEFAULT_BASE_URL;

    let user: { id?: number; login?: string };
    try {
      const sdk = sdkForToken(personalAccessToken, resolvedBaseUrl);
      const result = await sdk.userGetCurrent();
      if (!result.response?.ok || !result.data) {
        error(401, "Token rejected by Forjero. Check the PAT and base URL.");
      }
      user = result.data as { id?: number; login?: string };
    } catch (err) {
      if (err instanceof Error && "status" in err) throw err;
      error(400, err instanceof Error ? err.message : "Failed to verify token");
    }

    if (!user.id || !user.login) {
      error(400, "Forjero returned an unexpected user payload");
    }

    const installationId = await Installation.upsert({
      accountId,
      provider: "forjero",
      providerAccountId: String(user.id),
      providerAccountLogin: user.login,
      installationRef: personalAccessToken,
      accountType: "User",
      meta: {
        baseUrl: resolvedBaseUrl,
        ...(webhookSecret ? { webhookSecret } : {}),
      },
    });

    let synced = 0;
    try {
      const repos = await forjeroProvider.repos.list(personalAccessToken);
      for (const r of repos) {
        await Repository.upsert({
          accountId,
          source: "forjero",
          sourceId: r.providerId,
          installationId,
          owner: r.owner,
          repo: r.repo,
          fullName: r.fullName,
          defaultBranch: r.defaultBranch,
        });
        synced++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Repo sync failed";
      error(500, `Installed, but repo sync failed: ${message}`);
    }

    return { ok: true as const, login: user.login, synced };
  },
);
