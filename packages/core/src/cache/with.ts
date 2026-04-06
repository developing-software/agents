import { useCache } from "./context";

export interface CacheOptions {
  key: string;
  params?: (string | number)[];
  ttl?: number;
}

export async function withCache<T>(options: CacheOptions, fetcher: () => Promise<T>): Promise<T> {
  const cache = useCache();
  if (!cache) return fetcher();

  const cacheKey = buildCacheKey(options);

  const cached = await cache.get<T>(cacheKey);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  cache.set(cacheKey, fresh, options.ttl).catch(() => {});
  return fresh;
}

function buildCacheKey(options: CacheOptions): string {
  const parts = [options.key];
  if (options.params?.length) {
    parts.push(...options.params.map(String));
  }
  return parts.join(":");
}
