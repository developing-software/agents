import { Database } from "./drizzle";
import { Permission } from "./permission";

/**
 * Which schema tenant tables resolve to. `Database` sets the transaction's search_path from it;
 * `central` tables are schema-qualified, so they read the same from every workspace.
 */
export namespace Workspace {
  // A workspace user's role is the permission role: one vocabulary.
  export const roles = Permission.roles;
  export type Role = Permission.Role;

  export type Info = { schema: string; role?: Role };

  /** Throws unless `schema` is `public` or a `ws_*` name — it is interpolated into DDL. */
  export function valid(schema: string) {
    if (schema === "public" || /^ws_[a-z0-9_]{1,40}$/.test(schema)) return schema;
    throw new Error(`Invalid workspace schema: ${schema}`);
  }

  /** Runs `fn` in `info`'s schema. Opened before any transaction, which keeps its own path. */
  export function provide<R>(info: Info, fn: () => R): R {
    valid(info.schema);
    if (Database.open()) throw new Error("Workspace.provide inside an open transaction");
    return Database.Tenant.provide(info, fn);
  }

  /** Only a workspace someone provided, never the ambient one: what a job stamp should carry. */
  export function provided() {
    return Database.Tenant.peek();
  }

  /** The workspace the request runs in, else `Database.ambient`'s (scripts and tests only). */
  export function peek(): Info | undefined {
    const schema = Database.ambient();
    return Database.Tenant.peek() ?? (schema ? { schema } : undefined);
  }

  /**
   * `single` (default) caps the app at one workspace and enters it without a pick; `multi` allows
   * any number, picked per request. Every workspace is a registry row with its own schema either way.
   */
  export function mode() {
    return process.env.WORKSPACES === "multi" ? "multi" : "single";
  }
}
