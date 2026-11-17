import { and, eq, isNull } from "drizzle-orm";
import { Central } from "../drizzle/central";
import { Identifier } from "../identifier";
import { AccountTable } from "./account.central";

/**
 * Logins, shared by every workspace. Unchecked: `Auth` and `User` hold the grants and call in.
 * An account's id is also its `user` id in each workspace it joins.
 */
export namespace Account {
  export type Row = typeof AccountTable.$inferSelect;

  export function create(input: {
    id?: string;
    name: string;
    email: string;
    emailVerified?: boolean;
    image?: string | null;
  }) {
    return Central.use((tx) =>
      tx
        .insert(AccountTable)
        .values({
          id: input.id ?? Identifier.create("user"),
          name: input.name,
          email: input.email,
          emailVerified: input.emailVerified ?? false,
          image: input.image ?? null,
        })
        .returning()
        .then((rows) => rows[0]!),
    );
  }

  /** Disabled accounts are invisible here, which is what locks them out of every workspace. */
  export function fromID(id: string) {
    return Central.use((tx) =>
      tx
        .select()
        .from(AccountTable)
        .where(and(eq(AccountTable.id, id), isNull(AccountTable.timeDeleted)))
        .then((rows) => rows.at(0)),
    );
  }
}
