import type { Actor } from "@agents/core/actor";

declare global {
  namespace App {
    interface Platform {
      env: Env & {
        LLM_API_KEY?: string;
        LLM_BASE_URL?: string;
        SANDBOXD_URL?: string;
        SANDBOXD_TOKEN?: string;
        SANDBOXD_AGENT_IMAGE?: string;
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
