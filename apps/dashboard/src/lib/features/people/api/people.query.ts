import { getUserByIdHistoryOptions, getUserByIdOptions } from "@agents/sdk/query";
import type { Ctx } from "#lib/query.ts";

export const get = (id: string, ctx?: Ctx) => getUserByIdOptions({ ...ctx, path: { id } });

export const history = (id: string, ctx?: Ctx) =>
  getUserByIdHistoryOptions({ ...ctx, path: { id } });
