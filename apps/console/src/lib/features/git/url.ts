import type { ProviderType } from "@agents/core/git";

const BASE_URLS: Record<ProviderType, string> = {
  github: "https://github.com",
  gitlab: "https://gitlab.com",
  bitbucket: "https://bitbucket.org",
  gitea: "",
  forjero: "https://codeberg.org",
};

export function providerBaseUrl(provider: ProviderType): string {
  return BASE_URLS[provider] ?? "";
}

export function repoUrl(provider: ProviderType, owner: string, repo: string): string {
  const base = BASE_URLS[provider];
  if (!base) return "";
  return `${base}/${owner}/${repo}`;
}

export function branchUrl(
  provider: ProviderType,
  owner: string,
  repo: string,
  branch: string,
): string {
  const base = BASE_URLS[provider];
  if (!base) return "";
  const encoded = encodeURIComponent(branch);
  switch (provider) {
    case "github":
      return `${base}/${owner}/${repo}/tree/${encoded}`;
    case "gitlab":
      return `${base}/${owner}/${repo}/-/tree/${encoded}`;
    case "bitbucket":
      return `${base}/${owner}/${repo}/src/${encoded}`;
    case "forjero":
    case "gitea":
      return `${base}/${owner}/${repo}/src/branch/${encoded}`;
    default:
      return "";
  }
}

export function providerLabel(provider: ProviderType): string {
  switch (provider) {
    case "github":
      return "GitHub";
    case "gitlab":
      return "GitLab";
    case "bitbucket":
      return "Bitbucket";
    case "gitea":
      return "Gitea";
    case "forjero":
      return "Forgejo";
  }
}
