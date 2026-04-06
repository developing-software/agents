import { ulid } from "ulid";

export const prefixes = {
  user: "usr",
  event: "evt",
  plan: "pln",
  apiPersonal: "pat",
  apiClient: "app",
  apiSecret: "sec",
  link: "lnk",
  repository: "rep",
  githubInstallation: "gin",
  githubRepo: "grp",
  githubEvent: "gev",
} as const;

export function createID(prefix: keyof typeof prefixes): string {
  return [prefixes[prefix], ulid()].join("_");
}
