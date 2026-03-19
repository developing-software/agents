import { ulid } from "ulid";

export const prefixes = {
  user: "usr",
  apiPersonal: "pat",
  apiClient: "app",
  apiSecret: "sec",
  link: "lnk",
  githubRepo: "grp",
  githubIssue: "gis",
  githubPullRequest: "gpr",
} as const;

export function createID(prefix: keyof typeof prefixes): string {
  return [prefixes[prefix], ulid()].join("_");
}
