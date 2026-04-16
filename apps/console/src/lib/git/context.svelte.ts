import { Context } from "runed";
import type { ProviderType } from "@agents/core/git";

export type RepoContextValue = {
  provider: ProviderType;
  organization: string;
  repoName: string;
};

export const repoContext = new Context<RepoContextValue>("repo");
