import config from "@agents/core/config";
import { MemoryBus } from "@agents/core/bus/memory";
import { createRedisBus } from "@agents/core/bus/redis";
import type { IBus } from "@agents/core/bus/index";

function createBus(): IBus {
  if (config!.bus.type === "redis") {
    return createRedisBus(config!.redis.url);
  }
  return MemoryBus;
}

export const Bus = createBus();
