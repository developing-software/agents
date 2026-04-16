import { and, eq } from "drizzle-orm";
import { Context } from "./context";
import { useTransaction } from "./drizzle/transaction";
import { UserFlags, userTable } from "./user/user.sql";
import { ErrorCodes, VisibleError } from "./error";
import { Log } from "./util/log";

export namespace Actor {
  export interface Account {
    type: "account";
    properties: {
      accountID: string;
      email: string;
    };
  }

  export interface User {
    type: "user";
    properties: {
      accountID: string;
      workspaceID: string;
      userID: string;
      role: "admin" | "member";
    };
  }

  export interface System {
    type: "system";
    properties: {
      workspaceID: string;
    };
  }

  export interface Token {
    type: "token";
    properties: {
      accountID: string;
      tokenID: string;
    };
  }

  export interface Public {
    type: "public";
    properties: Record<string, never>;
  }

  export type Info = Account | User | Public | Token | System;

  export const ctx = Context.create<Info>();

  export function accountID() {
    const actor = ctx.use();
    if ("accountID" in actor.properties) return actor.properties.accountID;
    throw new VisibleError(
      "authentication",
      ErrorCodes.Authentication.UNAUTHORIZED,
      `You don't have permission to access this resource.`,
    );
  }

  export function userID() {
    const actor = ctx.use();
    if (actor.type === "user") return actor.properties.userID;
    throw new VisibleError(
      "authentication",
      ErrorCodes.Authentication.UNAUTHORIZED,
      `You don't have permission to access this resource.`,
    );
  }

  export function workspaceID() {
    const actor = ctx.use();
    if ("workspaceID" in actor.properties) return actor.properties.workspaceID;
    throw new VisibleError(
      "authentication",
      ErrorCodes.Authentication.UNAUTHORIZED,
      `No workspace in actor.`,
    );
  }

  export async function assertFlag(flag: keyof UserFlags) {
    return useTransaction((tx) =>
      tx
        .select({ flags: userTable.flags })
        .from(userTable)
        .where(and(eq(userTable.id, userID()), eq(userTable.workspaceID, workspaceID())))
        .then((rows) => {
          const flags = rows[0]?.flags;
          if (!flags || !flags[flag])
            throw new VisibleError(
              "forbidden",
              ErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
              "Actor does not have " + flag + " flag",
            );
        }),
    );
  }

  export async function getFlag<F extends keyof UserFlags>(flag: F): Promise<UserFlags[F]> {
    return useTransaction(async (tx) => {
      const flags = await tx
        .select({ flags: userTable.flags })
        .from(userTable)
        .where(and(eq(userTable.id, userID()), eq(userTable.workspaceID, workspaceID())))
        .then((rows) => rows[0]?.flags);

      if (!flags) {
        throw new VisibleError(
          "forbidden",
          ErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
          "Actor does not have " + flag + " flag",
        );
      }
      return flags[flag];
    });
  }

  export function use() {
    try {
      return ctx.use();
    } catch {
      return { type: "public", properties: {} } as Public;
    }
  }

  export function assert<T extends Info["type"]>(type: T) {
    const actor = use();
    if (actor.type !== type)
      throw new VisibleError(
        "authentication",
        ErrorCodes.Authentication.UNAUTHORIZED,
        `Actor is not "${type}"`,
      );
    return actor as Extract<Info, { type: T }>;
  }

  export function provide<T extends Info["type"], Next extends (...args: any) => any>(
    type: T,
    properties: Extract<Info, { type: T }>["properties"],
    fn: Next,
  ): ReturnType<Next> {
    return ctx.provide({ type, properties } as any, () => {
      const logProps = { ...properties } as Record<string, unknown>;
      delete logProps.email;
      return Log.provide({ actor: type, ...logProps }, fn);
    });
  }
}
