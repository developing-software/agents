import { createContext } from "../context";
import type { CacheAdapter } from "./cache";
import { CacheClient, type CacheClientOptions } from "./client";

const CacheContext = createContext<CacheClient>();

export function withCacheContext<R>(
  adapter: CacheAdapter,
  options: CacheClientOptions,
  fn: () => R,
): R {
  return CacheContext.provide(new CacheClient(adapter, options), fn);
}

export function useCache(): CacheClient | undefined {
  try {
    return CacheContext.use();
  } catch {
    return undefined;
  }
}
