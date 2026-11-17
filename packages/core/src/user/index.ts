import { z } from "zod";
import { and, asc, eq, ilike, isNull, sql, type SQLWrapper } from "drizzle-orm";
import { Assert } from "../util/assert";
import { fn } from "../util/fn";
import { iso } from "../util/fmt";
import { Database } from "../drizzle";
import { Central } from "../drizzle/central";
import { Identity } from "../identity";
import { Common } from "../common";
import { ErrorCodes, VisibleError } from "../error";
import { Bus } from "../platform/bus";
import { Examples } from "../examples";
import { Identifier } from "../identifier";
import { Permission } from "../permission";
import { sortable } from "../drizzle/order";
import { Workspace } from "../workspace";
import { UserTable } from "./user.sql";
import { AccountTable } from "./account.central";
import { Account } from "./account";
import { DEFAULTS, Patch, Prefs } from "./prefs";
import { ProviderIds, ProviderTable } from "../auth/provider.central";

export namespace User {
  export const assert = Assert.create("User");

  export const Role = z.enum(Permission.roles).meta({ description: "A workspace role." });

  export const Info = z
    .object({
      id: z.string().meta({ description: Common.IdDescription, example: Examples.User.id }),
      name: z.string().min(1).meta({ description: "Display name." }),
      email: z.email().meta({ description: "Login address. Unique across accounts." }),
      emailVerified: z
        .boolean()
        .optional()
        .meta({ description: "Whether the address has been confirmed." }),
      image: z.string().nullable().meta({ description: "Avatar URL, or null for none." }),
      // Read-only through `update`, which picks its fields explicitly. `assign` is the
      // only way to change one, and it wants `user: ["assign"]`.
      role: Role.nullable().meta({
        description:
          "Decides everything the user may do in this workspace; null outside one. Only `user:assign` can change it.",
      }),
      kind: z.enum(["human", "system"]).meta({
        description:
          "A `system` user is an App: nobody logs in as it — an external system or CI acting through API keys.",
      }),
      ownerID: z
        .string()
        .nullable()
        .meta({ description: "For an App, the person answerable for it. Null for people." }),
      prefs: Prefs.meta({
        description: "Display preferences. Every key has a default, so this is always complete.",
      }),
      timeDeleted: z.iso
        .datetime()
        .nullable()
        .meta({ description: "When the user was removed. Null while they are active." }),
      timeCreated: z.iso.datetime().meta({ description: "When the user joined." }),
    })
    .meta({
      ref: "User",
      description: "A workspace's person or App. A person's id is their account id.",
      example: Examples.User,
    });
  export type Info = z.infer<typeof Info>;

  export const Event = {
    Assigned: Bus.define("user.assigned", z.object({ from: Role, to: Role })),
    // Recorded as whoever made the account: the `auth` agent on signup, an admin for an App.
    Created: Bus.define("user.created", Info.pick({ email: true, kind: true })),
    // A new way into an existing account — Google added to one made by emailed code.
    Linked: Bus.define("user.linked", z.object({ provider: z.string() })),
    Removed: Bus.define("user.removed", Info.pick({ email: true })),
    Restored: Bus.define("user.restored", Info.pick({ email: true })),
  };

  /** Sortable keys mapped to what each orders by — also the allowlist. */
  export const SortableColumns = sortable(
    {
      name: UserTable.name,
      email: UserTable.email,
      role: UserTable.role,
      timeCreated: UserTable.timeCreated,
    } satisfies Partial<Record<keyof Info, SQLWrapper>>,
    UserTable.id,
    asc(UserTable.name),
  );

  /** A login provider, connected or not. Not in the HTTP API — the dashboard reads core directly. */
  export const Provider = z.object({
    id: z.enum(ProviderIds),
    /** The identity held at the provider — an email, or its own user id. Null when not connected. */
    accountId: z.string().nullable(),
    connected: z.boolean(),
    timeCreated: z.iso.datetime().nullable(),
  });
  export type Provider = z.infer<typeof Provider>;

  /** Every provider with its connection state, so the profile can offer the unconnected ones. */
  export const providers = fn(z.void(), () =>
    Central.use(async (tx) => {
      const rows = await tx
        .select({
          providerId: ProviderTable.providerId,
          accountId: ProviderTable.accountId,
          timeCreated: ProviderTable.timeCreated,
        })
        .from(ProviderTable)
        .where(eq(ProviderTable.userID, Identity.userID()));

      return ProviderIds.map((id) => {
        const row = rows.find((row) => row.providerId === id);
        return {
          id,
          accountId: row?.accountId ?? null,
          connected: Boolean(row),
          timeCreated: iso(row?.timeCreated),
        };
      });
    }),
  );

  export const create = fn(
    z.object({
      name: Info.shape.name,
      email: Info.shape.email,
      emailVerified: Info.shape.emailVerified,
      image: Info.shape.image.optional(),
      kind: Info.shape.kind.optional(),
      ownerID: z.string().optional(),
      role: Info.shape.role.optional(),
    }),
    // A grant, not an open door: setup holds it as `internal`, an App through its admin.
    // A person gets an account too, whose id their user row shares; an App gets none.
    async (input) => {
      Identity.check({ user: ["create"] });
      const kind = input.kind ?? "human";
      const account = kind === "human" ? await Account.create(input) : undefined;
      const user = await Database.use((tx) =>
        tx
          .insert(UserTable)
          .values({
            id: account?.id ?? Identifier.create("user"),
            name: input.name,
            email: input.email,
            image: input.image ?? null,
            role: input.role ?? "member",
            kind,
            ownerID: input.ownerID ?? null,
          })
          .returning()
          .then((rows) => serialize(rows[0]!, account)),
      );
      await Event.Created.publish({ email: user.email, kind: user.kind }, { subject: user.id });
      return user;
    },
  );

  /**
   * The user in the current workspace, or the bare account when multi mode has none picked.
   * Removed users and disabled accounts are invisible here, which is what locks them out.
   */
  export const fromID = fn(Info.shape.id, async (id) => {
    if (!Workspace.peek()) {
      const account = await Account.fromID(id);
      return account ? bare(account) : null;
    }
    const row = await Database.use((tx) =>
      tx
        .select()
        .from(UserTable)
        .where(and(eq(UserTable.id, id), isNull(UserTable.timeDeleted)))
        .then((rows) => rows.at(0)),
    );
    if (!row) return null;
    if (row.kind === "system") return serialize(row);
    const account = await Account.fromID(id);
    return account ? serialize(row, account) : null;
  });

  export const Summary = Info.pick({ id: true, name: true, email: true, image: true }).meta({
    ref: "UserSummary",
    description: "A user as the directory lists them.",
  });

  /** Directory behind assignee pickers. */
  export const list = fn(
    z.object({ search: z.string().optional().meta({ description: "Part of a name." }) }),
    (input) => {
      Identity.check({ user: ["read"] });
      return Database.use((tx) =>
        tx
          .select({
            id: UserTable.id,
            name: UserTable.name,
            email: UserTable.email,
            image: UserTable.image,
          })
          .from(UserTable)
          .where(input.search ? ilike(UserTable.name, `%${input.search}%`) : undefined)
          .orderBy(asc(UserTable.name))
          .limit(100),
      );
    },
    {
      title: "List users",
      description: "The user directory by name, at most 100, optionally narrowed by a name search.",
    },
  );

  /**
   * Another account as a teammate sees it: no prefs, and no address for an App — its email is a
   * placeholder. Any signed-in reader holds `user:read`, the same grant the assignee picker uses.
   */
  export const Profile = Info.pick({
    id: true,
    name: true,
    image: true,
    kind: true,
    role: true,
    timeCreated: true,
  })
    .extend({
      email: Info.shape.email.nullable(),
      owner: z.object({ id: z.string(), name: z.string() }).nullable(),
    })
    .meta({ ref: "Profile", description: "An account as other signed-in users see it." });
  export type Profile = z.infer<typeof Profile>;

  export const profile = fn(
    Info.shape.id,
    async (id): Promise<Profile | null> => {
      Identity.check({ user: ["read"] });
      const row = await fromID(id);
      if (!row) return null;
      const owner = row.ownerID ? await fromID(row.ownerID) : null;
      return {
        id: row.id,
        name: row.name,
        image: row.image,
        kind: row.kind,
        role: row.role,
        timeCreated: row.timeCreated,
        email: row.kind === "system" ? null : row.email,
        owner: owner ? { id: owner.id, name: owner.name } : null,
      };
    },
    {
      title: "Get profile",
      description: "Fetch an account as a teammate sees it: no prefs, and no email for an App.",
    },
  );

  export const update = fn(
    z.object({ name: Info.shape.name.optional(), image: Info.shape.image.optional() }),
    async (input) => {
      const id = Identity.self({ user: ["update"] });
      const set = { ...input, timeUpdated: new Date() };
      // The account is the default every new workspace copies; this one changes alongside it.
      await Central.use((tx) => tx.update(AccountTable).set(set).where(eq(AccountTable.id, id)));
      if (Workspace.peek())
        await Database.use((tx) => tx.update(UserTable).set(set).where(eq(UserTable.id, id)));
    },
  );

  /** Patch-merges prefs with a jsonb `||` in one statement — no read-modify-write race. */
  export const prefs = fn(Patch, (input) => {
    const id = Identity.self({ user: ["update"] });
    return Central.use((tx) =>
      tx
        .update(AccountTable)
        .set({
          prefs: sql`${AccountTable.prefs} || ${JSON.stringify(input)}::jsonb`,
          timeUpdated: new Date(),
        })
        .where(eq(AccountTable.id, id)),
    );
  });

  /** Reads past the disabled filter `fromID` applies — the admin screens act on those rows. */
  const target = (id: string) =>
    Database.use((tx) =>
      tx
        .select()
        .from(UserTable)
        .where(eq(UserTable.id, id))
        .then((rows) => rows.at(0) ?? null),
    );

  /** Both ways an admin could lock themselves out: demoting or disabling their own account. */
  function other(id: string) {
    if (Identity.known() && Identity.userID() === id)
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        "You cannot change your own account here",
      );
  }

  export const assign = fn(z.object({ id: Info.shape.id, role: Role }), async (input) => {
    Identity.check({ user: ["assign"] });
    other(input.id);
    const before = await assert.exists(target(input.id));
    if (before.role === input.role) return;

    return Database.transaction(async (tx) => {
      const owners = await tx
        .select({ id: UserTable.id })
        .from(UserTable)
        .where(and(eq(UserTable.role, "owner"), isNull(UserTable.timeDeleted)));
      if (before.role === "owner" && owners.length === 1)
        throw new VisibleError(
          "conflict",
          ErrorCodes.Conflict.LAST_OWNER,
          "A workspace needs at least one owner",
        );
      await tx
        .update(UserTable)
        .set({ role: input.role, timeUpdated: new Date() })
        .where(eq(UserTable.id, input.id));
      await Event.Assigned.publish({ from: before.role, to: input.role }, { subject: input.id });
    });
  });

  /** Removes a user from the workspace. Their rows stay put — one `restore` away, nothing orphaned. */
  export const remove = fn(Info.shape.id, async (id) => {
    Identity.check({ user: ["delete"] });
    other(id);
    const before = await assert.exists(target(id));
    if (before.timeDeleted) return;

    return Database.transaction(async (tx) => {
      await tx.update(UserTable).set({ timeDeleted: new Date() }).where(eq(UserTable.id, id));
      await Event.Removed.publish({ email: before.email }, { subject: id });
    });
  });

  export const restore = fn(Info.shape.id, async (id) => {
    Identity.check({ user: ["delete"] });
    const before = await assert.exists(target(id));
    if (!before.timeDeleted) return;

    return Database.transaction(async (tx) => {
      await tx
        .update(UserTable)
        .set({ timeDeleted: null, timeUpdated: new Date() })
        .where(eq(UserTable.id, id));
      await Event.Restored.publish({ email: before.email }, { subject: id });
    });
  });

  /** A workspace row; `account` supplies the login-wide fields, which an App has none of. */
  export function serialize(row: typeof UserTable.$inferSelect, account?: Account.Row): Info {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: account?.emailVerified ?? false,
      image: row.image,
      role: row.role,
      kind: row.kind,
      ownerID: row.ownerID,
      // Parsed, not passed through: a row written before a preference existed is missing
      // that key, and the column's `$type` would claim otherwise.
      prefs: account ? Prefs.parse(account.prefs) : DEFAULTS,
      timeDeleted: iso(row.timeDeleted),
      timeCreated: row.timeCreated.toISOString(),
    };
  }

  // === UTILS ===

  // No workspace picked yet: the account alone, which holds no role.
  function bare(account: Account.Row): Info {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      emailVerified: account.emailVerified,
      image: account.image,
      role: null,
      kind: "human",
      ownerID: null,
      prefs: Prefs.parse(account.prefs),
      timeDeleted: null,
      timeCreated: account.timeCreated.toISOString(),
    };
  }
}
