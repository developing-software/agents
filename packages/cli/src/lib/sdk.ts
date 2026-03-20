import { DevAgentSdk } from "@agents/sdk";
import { createClient } from "@agents/sdk/client";
import { type Config, readConfig } from "./config";
import { log } from "./colors";

export function makeSdk(config: Config) {
  return new DevAgentSdk({
    client: createClient({ auth: () => config.token, baseUrl: config.baseUrl }),
  });
}

export async function getSdk() {
  const config = await readConfig();
  if (!config) {
    log.error("Not logged in. Run: dev-agents login");
    process.exit(1);
  }
  return { sdk: makeSdk(config), config };
}
