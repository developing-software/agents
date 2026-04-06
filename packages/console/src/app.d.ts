// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Platform {
      env: Env & { ANTHROPIC_API_KEY?: string };
      ctx: ExecutionContext;
      caches: CacheStorage;
      cf?: IncomingRequestCfProperties;
    }

    // interface Error {}
    interface Locals {
      userID: string | null;
    }
    // interface PageData {}
    // interface PageState {}
  }
}

export {};
