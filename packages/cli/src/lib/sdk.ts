import { DevAgentSdk } from "@agents/sdk";
import { createClient } from "@agents/sdk/client";
import { createClient as createAuthClient } from "@openauthjs/openauth/client";
import { type Config, readConfig, writeConfig, AUTH_ISSUER } from "./config";
import { log } from "./colors";

export function makeSdk(config: Config) {
  return new DevAgentSdk({
    client: createClient({ auth: () => config.access, baseUrl: config.baseUrl }),
  });
}

export async function getSdk() {
  const config = await readConfig();
  if (!config) {
    log.error("Not logged in. Run: dev-agents login");
    process.exit(1);
  }

  const authClient = createAuthClient({ clientID: "cli", issuer: AUTH_ISSUER });
  const refreshed = await authClient.refresh(config.refresh, { access: config.access });

  if (refreshed.err) {
    log.error("Session expired. Run: dev-agents login");
    process.exit(1);
  }

  if (refreshed.tokens) {
    config.access = refreshed.tokens.access;
    config.refresh = refreshed.tokens.refresh;
    await writeConfig(config);
  }

  return { sdk: makeSdk(config), config };
}
