import type { CacheAdapter } from "./cache";

export interface CacheClientOptions {
  prefix?: string;
  defaultTtl?: number;
}

export class CacheClient {
  constructor(
    private readonly adapter: CacheAdapter,
    private readonly options: CacheClientOptions = {},
  ) {}

  private key(key: string) {
    return this.options.prefix ? `${this.options.prefix}:${key}` : key;
  }

  get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(this.key(key));
  }

  set<T>(key: string, value: T, ttl?: number): Promise<void> {
    return this.adapter.set(this.key(key), value, ttl ?? this.options.defaultTtl ?? 300);
  }

  delete(key: string): Promise<void> {
    return this.adapter.delete(this.key(key));
  }
}
