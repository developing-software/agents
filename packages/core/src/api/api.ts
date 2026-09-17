import { z } from "zod";
import { fn } from "../util/fn";
import { Database, and, eq, isNull } from "../drizzle";
import { apiClientTable, apiPersonalTokenTable } from "./api.sql";
import { Identifier } from "../identifier";
import { Actor } from "../actor";
import { Common } from "../common";
import { Examples } from "../examples";
import { ErrorCodes, VisibleError } from "../error";
import { randomHex, sha256 } from "../util/crypto";

export namespace Api {
  export namespace Client {
    export const Info = z
      .object({
        id: z.string().meta({
          description: Common.IdDescription,
          example: Examples.App.id,
        }),
        name: z.string().meta({
          description: "Name of the app.",
          example: Examples.App.name,
        }),
        redirectURI: z.string().meta({
          description: "Redirect URI of the app.",
          example: Examples.App.redirectURI,
        }),
        secret: z.string().meta({
          description: "OAuth 2.0 client secret of the app (obfuscated).",
          example: Examples.App.secret,
        }),
      })
      .meta({
        ref: "App",
        description: "An OAuth 2.0 client app.",
        example: Examples.App,
      });

    export type Info = z.infer<typeof Info>;

    export const create = fn(
      Info.pick({
        name: true,
        redirectURI: true,
      }),
      async (input) => {
        const id = Identifier.create("apiClient");
        const secret = Identifier.create("apiSecret");
        await Database.use((tx) =>
          tx.insert(apiClientTable).values({
            id,
            secret,
            name: input.name,
            redirectURI: input.redirectURI,
            accountID: Actor.accountID(),
          }),
        );
        return {
          id,
          secret,
        };
      },
    );

    export const verifyRedirect = fn(
      Info.pick({
        id: true,
        redirectURI: true,
      }),
      async (input) => {
        const match = await Database.use((tx) =>
          tx
            .select({ id: apiClientTable.id })
            .from(apiClientTable)
            .where(
              and(
                eq(apiClientTable.id, input.id),
                eq(apiClientTable.redirectURI, input.redirectURI),
              ),
            ),
        );
        return match.length === 1;
      },
    );

    export async function list(): Promise<Info[]> {
      return Database.use((tx) =>
        tx
          .select()
          .from(apiClientTable)
          .where(
            and(
              eq(apiClientTable.accountID, Actor.accountID()),
              isNull(apiClientTable.timeDeleted),
            ),
          )
          .then((rows) => rows.map(serialize)),
      );
    }

    export const remove = fn(Info.shape.id, (input) =>
      Database.use(async (tx) => {
        const response = await tx
          .delete(apiClientTable)
          .where(and(eq(apiClientTable.id, input), eq(apiClientTable.accountID, Actor.accountID())))
          .returning({ id: apiClientTable.id });
        if (response.length === 0) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            "App not found",
          );
        }
      }),
    );

    function obfuscate(secret: string) {
      const [prefix, id] = secret.split("_");
      const last4 = id?.slice(-4);
      return `${prefix}_******${last4}`;
    }

    function serialize(input: typeof apiClientTable.$inferSelect): z.infer<typeof Info> {
      return {
        id: input.id,
        name: input.name,
        redirectURI: input.redirectURI,
        secret: obfuscate(input.secret),
      };
    }

    export const fromID = fn(Info.shape.id, (id) =>
      Database.use(async (tx) => {
        const rows = await tx
          .select()
          .from(apiClientTable)
          .where(and(eq(apiClientTable.id, id), eq(apiClientTable.accountID, Actor.accountID())))
          .limit(1);
        return rows.map(serialize).at(0);
      }),
    );
  }

  export namespace Personal {
    const CreateInput = z
      .object({
        name: z.string().min(1).default("Personal access token"),
        expiresAt: z.string().datetime().optional(),
      })
      .default({ name: "Personal access token" });

    export const Info = z
      .object({
        id: z.string().meta({
          description: Common.IdDescription,
          example: Examples.Token.id,
        }),
        name: z.string().meta({
          description: "The display name for the token.",
          example: "CI token",
        }),
        created: z.string().datetime().meta({
          description: "The created time for the token.",
          example: Examples.Token.created,
        }),
        token: z.string().meta({
          description: "Personal access token (obfuscated).",
          example: Examples.Token.token,
        }),
        lastUsedAt: z.string().datetime().nullable(),
        expiresAt: z.string().datetime().nullable(),
      })
      .meta({
        ref: "Token",
        description: "A personal access token used to access the API.",
        example: Examples.Token,
      });

    export type Info = z.infer<typeof Info>;

    export const create = fn(CreateInput, async (input) => {
      const id = Identifier.create("apiPersonal");
      const env = process.env.NODE_ENV === "production" ? "live" : "test";
      const body = randomHex(20);
      const token = `tok_${env}_${body}`;
      const prefix = `tok_${env}_${body.slice(0, 4)}_${body.slice(-4)}`;
      const tokenHash = await sha256(token);

      await Database.use((tx) =>
        tx.insert(apiPersonalTokenTable).values({
          id,
          userID: Actor.userID(),
          name: input.name,
          token: tokenHash,
          prefix,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        }),
      );

      return {
        id,
        token,
      };
    });

    export const remove = fn(Info.shape.id, (input) =>
      Database.use(async (tx) => {
        const response = await tx
          .delete(apiPersonalTokenTable)
          .where(
            and(
              eq(apiPersonalTokenTable.id, input),
              eq(apiPersonalTokenTable.userID, Actor.userID()),
            ),
          )
          .returning({ id: apiPersonalTokenTable.id });
        if (response.length === 0) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            "Token not found",
          );
        }
      }),
    );

    export async function list(): Promise<Info[]> {
      return Database.use((tx) =>
        tx
          .select()
          .from(apiPersonalTokenTable)
          .where(
            and(
              eq(apiPersonalTokenTable.userID, Actor.userID()),
              isNull(apiPersonalTokenTable.timeDeleted),
            ),
          )
          .then((rows) => rows.map(serialize)),
      );
    }

    function obfuscate(prefix: string) {
      const parts = prefix.split("_");
      if (parts.length < 4) return `${prefix}_******`;
      const [tokenPrefix, stage, first4, last4] = parts;
      return `${tokenPrefix}_${stage}_${first4}_******${last4}`;
    }

    function serialize(input: typeof apiPersonalTokenTable.$inferSelect): z.infer<typeof Info> {
      return {
        id: input.id,
        name: input.name,
        created: input.timeCreated.toISOString(),
        token: obfuscate(input.prefix),
        lastUsedAt: input.lastUsedAt?.toISOString() ?? null,
        expiresAt: input.expiresAt?.toISOString() ?? null,
      };
    }

    export const fromID = fn(Info.shape.id, (id) =>
      Database.use(async (tx) => {
        const rows = await tx
          .select()
          .from(apiPersonalTokenTable)
          .where(
            and(eq(apiPersonalTokenTable.id, id), eq(apiPersonalTokenTable.userID, Actor.userID())),
          )
          .limit(1);
        return rows.map(serialize).at(0);
      }),
    );

    export async function fromTokenHash(token: string) {
      return Database.use((tx) =>
        tx
          .select({
            id: apiPersonalTokenTable.id,
            userID: apiPersonalTokenTable.userID,
            expiresAt: apiPersonalTokenTable.expiresAt,
          })
          .from(apiPersonalTokenTable)
          .where(
            and(eq(apiPersonalTokenTable.token, token), isNull(apiPersonalTokenTable.timeDeleted)),
          )
          .then((rows) => rows.at(0)),
      );
    }

    export async function touchLastUsed(id: string) {
      return Database.use((tx) =>
        tx
          .update(apiPersonalTokenTable)
          .set({ lastUsedAt: new Date(), timeUpdated: new Date() })
          .where(eq(apiPersonalTokenTable.id, id)),
      );
    }
  }
}
