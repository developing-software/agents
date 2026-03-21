export const CONFIG_PATH = `${process.env.HOME}/.config/dev-agents/config.json`;
export const API_BASE = process.env.API_URL ?? "https://agents.developing.company/api";
export const AUTH_ISSUER = process.env.AUTH_URL ?? "https://auth.agents.developing.company";

export type Config = { token: string; baseUrl: string };

export async function readConfig(): Promise<Config | null> {
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) return null;
  try {
    return await file.json();
  } catch {
    return null;
  }
}

export async function writeConfig(config: Config): Promise<void> {
  await Bun.$`mkdir -p ${CONFIG_PATH.split("/").slice(0, -1).join("/")}`.quiet();
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function deleteConfig(): Promise<void> {
  await Bun.$`rm -f ${CONFIG_PATH}`.quiet().nothrow();
}
