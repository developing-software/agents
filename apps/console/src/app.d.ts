import type { Actor } from "@agents/core/actor";

declare global {
  namespace App {
    interface Platform {
      env: Env & {
        ANTHROPIC_API_KEY?: string;
        SEND_EMAIL?: { send(message: Record<string, unknown>): Promise<unknown> };
      };
      ctx: ExecutionContext;
      caches: CacheStorage;
      cf?: IncomingRequestCfProperties;
    }

    interface Locals {
      actor: Actor.Account | Actor.User | Actor.Public;
      workspaceActors: Map<string, Actor.User>;
    }
  }
}

export {};
