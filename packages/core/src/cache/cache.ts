export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// Minimal interfaces to avoid a hard dep on @cloudflare/workers-types
export interface CacheStorage {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
  delete(request: Request): Promise<boolean>;
}

export interface KVNamespace {
  get(key: string, type: "text"): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

export class KvAdapter implements CacheAdapter {
  constructor(private readonly kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.kv.get(key, "text");
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: Math.max(ttlSeconds, 60),
    });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}

export class CacheApiAdapter implements CacheAdapter {
  constructor(private readonly cache: CacheStorage) {}

  private toRequest(key: string): Request {
    return new Request(
      `https://cache.internal/${encodeURIComponent(key)}`,
    );
  }

  async get<T>(key: string): Promise<T | null> {
    const response = await this.cache.match(this.toRequest(key));
    if (!response) return null;
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const response = new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
      },
    });
    await this.cache.put(this.toRequest(key), response);
  }

  async delete(key: string): Promise<void> {
    await this.cache.delete(this.toRequest(key));
  }
}

export class LayeredAdapter implements CacheAdapter {
  constructor(
    private readonly l1: CacheAdapter,
    private readonly l2: CacheAdapter,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const l1hit = await this.l1.get<T>(key);
    if (l1hit !== null) return l1hit;

    const l2hit = await this.l2.get<T>(key);
    if (l2hit !== null) {
      this.l1.set(key, l2hit, 300).catch(() => {});
    }
    return l2hit;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await Promise.all([
      this.l1.set(key, value, Math.min(ttlSeconds, 300)),
      this.l2.set(key, value, ttlSeconds),
    ]);
  }

  async delete(key: string): Promise<void> {
    await Promise.all([this.l1.delete(key), this.l2.delete(key)]);
  }
}
