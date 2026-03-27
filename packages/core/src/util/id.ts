import { ulid } from "ulid";

export const prefixes = {
  user: "usr",
  event: "evt",
  apiPersonal: "pat",
  apiClient: "app",
  apiSecret: "sec",
  link: "lnk",
  githubRepo: "grp",
  githubEvent: "gev",
} as const;

export function createID(prefix: keyof typeof prefixes): string {
  return [prefixes[prefix], ulid()].join("_");
}
