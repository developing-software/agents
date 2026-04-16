import { VisibleError } from "../../error";
import { forjeroProvider } from "./forjero";
import { githubProvider } from "./github";
import type { GitProvider, ProviderType } from "./interface";

const providers: Partial<Record<ProviderType, GitProvider>> = {
  github: githubProvider,
  forjero: forjeroProvider,
};

export function getProvider(type: ProviderType | string): GitProvider {
  const p = providers[type as ProviderType];
  if (!p) {
    throw new VisibleError(
      "validation",
      "unsupported_provider",
      `Provider "${type}" is not configured`,
    );
  }
  return p;
}

export function hasProvider(type: string): type is ProviderType {
  return !!providers[type as ProviderType];
}
