import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { fn } from "../../util/fn";
import { Context } from "../../context";
import { Database } from "../../drizzle";
import { Central } from "../../drizzle/central";
import { Migrations } from "../../drizzle/migrate";
import { ErrorCodes, VisibleError } from "../../error";
import { Identifier } from "../../identifier";
import { Identity } from "../../identity";
import { Queue } from "../../lib/queue";
import { Template } from "../../lib/email/template";
import { User } from "../../user";
import { Account } from "../../user/account";
import { AccountTable } from "../../user/account.central";
import { UserTable } from "../../user/user.sql";
import { Workspace } from "../../workspace";
import { AccessTable, InviteTable, WorkspaceTable } from "./workspace.central";

/**
 * The registry: which workspaces exist and who can see each. Plural so it reads apart from
 * the kernel `Workspace`, which is only the one a request runs in.
 */
export namespace Workspaces {
  export type Row = typeof WorkspaceTable.$inferSelect;

  export const Info = z
    .object({
      id: z
        .string()
        .meta({ description: "Workspace id.", example: "wsp_01JZ8Q4N2V7T5X3M9K6R1B0C2D" }),
      slug: z.string().meta({ description: "URL handle, unique.", example: "acme" }),
      name: z.string().meta({ description: "Display name.", example: "Acme" }),
      status: z
        .enum(["pending", "ready"])
        .meta({ description: "`pending` until its schema is migrated; only `ready` opens." }),
      timeCreated: z.iso.datetime().meta({ description: "When it was created." }),
    })
    .meta({ ref: "Workspace", description: "A tenant with its own schema." });
  export type Info = z.infer<typeof Info>;

  export const Invite = z
    .object({
      id: z.string().meta({ description: "Invite id.", example: "inv_01JZ8Q4N2V7T5X3M9K6R1B0C2D" }),
      email: z.email().meta({ description: "Who it was sent to.", example: "ada@example.com" }),
      role: z
        .enum(Workspace.roles)
        .meta({ description: "The role they join as.", example: "member" }),
      timeCreated: z.iso.datetime().meta({ description: "When it was sent." }),
    })
    .meta({
      ref: "WorkspaceInvite",
      description: "A seat offered to an address, claimed on sign-in.",
    });
  export type Invite = z.infer<typeof Invite>;

  /**
   * Which client a workspace's tables live on; `undefined` is the shared pool. An app with a
   * database per workspace provides one that maps the row to its client.
   */
  export const connect = Context.port<(row: Row) => Database.Client | undefined>(
    () => () => undefined,
  );

  /** Migrates the schema, seats the owner, then opens it. Idempotent, so a retry is safe. */
  export const job = Queue.define(
    "workspace.setup",
    z.object({ id: z.string(), owner: z.string().optional() }),
    async (input) => {
      const row = await Central.use((tx) =>
        tx
          .select()
          .from(WorkspaceTable)
          .where(eq(WorkspaceTable.id, input.id))
          .then((rows) => rows.at(0)),
      );
      if (!row) throw new Error(`No workspace ${input.id}`);
      const owner = input.owner ? await Account.fromID(input.owner) : undefined;
      await inside(at(row), async () => {
        await Migrations.tenant(row.schema);
        if (owner) await seat(owner, "owner");
      });
      await Central.use((tx) =>
        tx.update(WorkspaceTable).set({ status: "ready" }).where(eq(WorkspaceTable.id, row.id)),
      );
    },
  );

  /**
   * Registers the row as `pending` and queues `job` to build it. Central is written first; with
   * separate databases the tenant half is not in that transaction, which the idempotent job covers.
   */
  export const create = fn(
    z.object({
      slug: z
        .string()
        .regex(/^[a-z0-9_]{1,40}$/)
        .meta({
          description: "URL handle: lowercase letters, digits and underscores.",
          example: "acme",
        }),
      name: z.string().min(1).max(120).meta({ description: "Display name.", example: "Acme" }),
    }),
    async (input) => {
      // Single mode is a cap, not another path: the first workspace is made here too.
      if (Workspace.mode() === "single" && (await only())) throw single();
      const id = Identifier.create("workspace");
      const schema = Workspace.valid(`ws_${input.slug}`);
      const owner = Identity.peek() && Identity.known() ? Identity.userID() : undefined;
      await Central.transaction(async (tx) => {
        await tx.insert(WorkspaceTable).values({ id, slug: input.slug, name: input.name, schema });
        if (owner) await tx.insert(AccessTable).values({ userID: owner, workspaceID: id });
      });
      // Outside the transaction: the `sync` driver runs the job inline, which opens the workspace.
      await job.push({ id, owner });
      return { id, slug: input.slug, schema };
    },
  );

  /** The current user's workspaces, read off central access alone. */
  export const list = fn(z.void(), async () =>
    Central.use((tx) =>
      tx
        .select({ row: WorkspaceTable })
        .from(AccessTable)
        .innerJoin(WorkspaceTable, eq(WorkspaceTable.id, AccessTable.workspaceID))
        .where(and(eq(AccessTable.userID, Identity.userID()), isNull(WorkspaceTable.timeDeleted)))
        .then((rows) => rows.map((item) => serialize(item.row))),
    ),
  );

  /** Whether a workspace can still be started: always in multi mode, only the first in single. */
  export const vacant = fn(z.void(), async () => Workspace.mode() === "multi" || !(await only()));

  /** The request's workspace with the caller's role, or `undefined` before one is entered. */
  export const current = fn(z.void(), async () => {
    const row = await here();
    if (!row) return;
    return { ...serialize(row), role: Workspace.peek()?.role };
  });

  /** Renames a workspace; the slug moves only in multi mode, the schema never does. */
  export const update = fn(
    z.object({
      id: Info.shape.id,
      name: z.string().min(1).max(120).meta({ description: "Display name.", example: "Acme" }),
      slug: z
        .string()
        .regex(/^[a-z0-9_]{1,40}$/)
        .optional()
        .meta({ description: "New URL handle, multi mode only.", example: "acme" }),
    }),
    async (input) => {
      const row = await Central.use((tx) =>
        tx
          .select()
          .from(WorkspaceTable)
          .where(and(eq(WorkspaceTable.id, input.id), isNull(WorkspaceTable.timeDeleted)))
          .then((rows) => rows.at(0)),
      );
      if (!row) throw forbidden();
      await manage(row);
      const slug = input.slug ?? row.slug;
      if (slug !== row.slug && Workspace.mode() === "single") throw single();
      if (slug !== row.slug) {
        const taken = await Central.use((tx) =>
          tx
            .select({ id: WorkspaceTable.id })
            .from(WorkspaceTable)
            .where(eq(WorkspaceTable.slug, slug))
            .then((rows) => rows.length > 0),
        );
        if (taken)
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.INVALID_PARAMETER,
            "That slug is taken",
            "slug",
          );
      }
      const next = await Central.use((tx) =>
        tx
          .update(WorkspaceTable)
          .set({ name: input.name, slug, timeUpdated: new Date() })
          .where(eq(WorkspaceTable.id, row.id))
          .returning(),
      );
      return serialize(next[0] ?? row);
    },
  );

  /** The request workspace's people, from its own `user` table. */
  export const members = fn(z.void(), async () => {
    if (!(await current())) throw forbidden();
    return roster();
  });

  /** Changes a member's role: `User.assign`, which holds the last owner and self-change rules. */
  export const role = fn(
    z.object({
      userID: z
        .string()
        .meta({ description: "The member.", example: "usr_01JZ8Q4N2V7T5X3M9K6R1B0C2D" }),
      role: z.enum(Workspace.roles).meta({ description: "Their new role.", example: "admin" }),
    }),
    async (input) => {
      if (!(await here())) throw forbidden();
      await User.assign({ id: input.userID, role: input.role });
    },
  );

  /**
   * Offers the request's workspace to `email` and mails them; signing in with it claims the seat.
   * Whoever may add users may invite, but only an owner offers ownership. Sending again resends.
   */
  export const invite = fn(
    z.object({
      email: Invite.shape.email,
      role: Invite.shape.role
        .optional()
        .meta({ description: "The role they join as; member by default." }),
    }),
    async (input) => {
      const row = await here();
      if (!row) throw forbidden();
      Identity.check({ user: ["create"] });
      const role = input.role ?? "member";
      if (role === "owner" && Workspace.peek()?.role !== "owner")
        throw new VisibleError(
          "forbidden",
          ErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
          "Only an owner can invite an owner",
        );
      const email = input.email.trim().toLowerCase();
      const seated = await Database.use((tx) =>
        tx
          .select({ id: UserTable.id })
          .from(UserTable)
          .where(and(eq(UserTable.email, email), isNull(UserTable.timeDeleted)))
          .then((rows) => rows.length > 0),
      );
      if (seated)
        throw new VisibleError(
          "conflict",
          ErrorCodes.Conflict.ALREADY_MEMBER,
          "That address is already in this workspace",
          "email",
        );
      const by = Identity.userID();
      const saved = await Central.use((tx) =>
        tx
          .insert(InviteTable)
          .values({
            id: Identifier.create("invite"),
            workspaceID: row.id,
            email,
            role,
            invitedBy: by,
          })
          .onConflictDoUpdate({
            target: [InviteTable.workspaceID, InviteTable.email],
            set: { role, invitedBy: by, timeUpdated: new Date() },
          })
          .returning()
          .then((rows) => rows[0]!),
      );
      await Template.Send.invite(email, role);
      return pending(saved);
    },
  );

  /** The request workspace's invites nobody has claimed yet, newest first. */
  export const invites = fn(z.void(), async () => {
    const row = await here();
    if (!row) throw forbidden();
    Identity.check({ user: ["create"] });
    return Central.use((tx) =>
      tx
        .select()
        .from(InviteTable)
        .where(eq(InviteTable.workspaceID, row.id))
        .orderBy(sql`${InviteTable.timeCreated} desc`)
        .then((rows) => rows.map(pending)),
    );
  });

  /** Withdraws an invite before it is claimed. */
  export const uninvite = fn(z.object({ id: Invite.shape.id }), async (input) => {
    const row = await here();
    if (!row) throw forbidden();
    Identity.check({ user: ["create"] });
    await Central.use((tx) =>
      tx
        .delete(InviteTable)
        .where(and(eq(InviteTable.id, input.id), eq(InviteTable.workspaceID, row.id))),
    );
  });

  /** Invites waiting for the caller's address, each with the workspace it opens. */
  export const offers = fn(z.void(), async () => {
    const account = await Account.fromID(Identity.self({ user: ["read"] }));
    if (!account) return [];
    return Central.use((tx) =>
      tx
        .select({ invite: InviteTable, row: WorkspaceTable })
        .from(InviteTable)
        .innerJoin(WorkspaceTable, eq(WorkspaceTable.id, InviteTable.workspaceID))
        .where(
          and(
            eq(InviteTable.email, account.email.toLowerCase()),
            isNull(WorkspaceTable.timeDeleted),
          ),
        )
        .orderBy(sql`${InviteTable.timeCreated} desc`)
        .then((rows) =>
          rows.map((one) => ({ ...pending(one.invite), workspace: serialize(one.row) })),
        ),
    );
  });

  /** Takes an invite meant for the caller's address: seats them at its role and spends it. */
  export const accept = fn(z.object({ id: Invite.shape.id }), async (input) => {
    const account = await Account.fromID(Identity.self({ user: ["update"] }));
    const offer = account ? await mine(input.id, account.email) : undefined;
    if (!account || !offer)
      throw new VisibleError("not_found", ErrorCodes.NotFound.RESOURCE_NOT_FOUND, "No such invite");
    if (offer.row.status !== "ready")
      throw new VisibleError(
        "conflict",
        ErrorCodes.Conflict.NOT_READY,
        "Workspace is still being set up",
      );
    // An invite brings back someone removed earlier, at the role it offers.
    await inside(at(offer.row), () =>
      Database.use((tx) =>
        tx
          .insert(UserTable)
          .values({
            id: account.id,
            name: account.name,
            email: account.email,
            image: account.image,
            role: offer.invite.role,
          })
          .onConflictDoUpdate({
            target: UserTable.email,
            set: { role: offer.invite.role, timeDeleted: null, timeUpdated: new Date() },
          }),
      ),
    );
    await Central.transaction(async (tx) => {
      await tx
        .insert(AccessTable)
        .values({ userID: account.id, workspaceID: offer.row.id })
        .onConflictDoNothing();
      await tx.delete(InviteTable).where(eq(InviteTable.id, offer.invite.id));
    });
    return serialize(offer.row);
  });

  /** Turns an invite down; the workspace can send another. */
  export const decline = fn(z.object({ id: Invite.shape.id }), async (input) => {
    const account = await Account.fromID(Identity.self({ user: ["update"] }));
    if (!account) return;
    await Central.use((tx) =>
      tx
        .delete(InviteTable)
        .where(
          and(eq(InviteTable.id, input.id), eq(InviteTable.email, account.email.toLowerCase())),
        ),
    );
  });

  /** Every workspace for the back office, member counts read off central access in one query. */
  export const registry = fn(z.void(), async () => {
    Identity.assert.superadmin("Only a superadmin can list every workspace");
    return Central.use((tx) =>
      tx
        .select({
          row: WorkspaceTable,
          members: tx.$count(AccessTable, eq(AccessTable.workspaceID, WorkspaceTable.id)),
        })
        .from(WorkspaceTable)
        .where(isNull(WorkspaceTable.timeDeleted))
        .orderBy(WorkspaceTable.slug)
        .then((rows) =>
          rows.map((item) => ({
            ...serialize(item.row),
            schema: item.row.schema,
            members: item.members,
          })),
        ),
    );
  });

  /** One workspace opened up for an operator: who can see it and its members. */
  export const inspect = fn(z.object({ slug: Info.shape.slug }), async (input) => {
    Identity.assert.superadmin("Only a superadmin can inspect a workspace");
    const row = await find(input.slug);
    const access = await Central.use((tx) =>
      tx
        .select({
          userID: AccessTable.userID,
          name: AccountTable.name,
          email: AccountTable.email,
          timeCreated: AccessTable.timeCreated,
        })
        .from(AccessTable)
        .innerJoin(AccountTable, eq(AccountTable.id, AccessTable.userID))
        .where(eq(AccessTable.workspaceID, row.id))
        .orderBy(AccessTable.timeCreated)
        .then((rows) =>
          rows.map((one) => ({ ...one, timeCreated: one.timeCreated.toISOString() })),
        ),
    );
    // A pending schema may not exist yet. Disk use is `usage`, which reads the catalogs in one go.
    const open = row.status === "ready";
    const members = open ? await inside(at(row), roster) : [];
    return {
      workspace: { ...serialize(row), schema: row.schema },
      access,
      members,
    };
  });

  /** Queues the setup job again for a workspace stuck `pending`; the job is idempotent. */
  export const retry = fn(z.object({ slug: Info.shape.slug }), async (input) => {
    Identity.assert.superadmin("Only a superadmin can retry a workspace's setup");
    const row = await find(input.slug);
    if (row.status !== "pending")
      throw new VisibleError(
        "conflict",
        ErrorCodes.Validation.INVALID_STATE,
        "Workspace is already set up",
      );
    // The first to get access is who `create` seated as owner.
    const owner = await Central.use((tx) =>
      tx
        .select({ userID: AccessTable.userID })
        .from(AccessTable)
        .where(eq(AccessTable.workspaceID, row.id))
        .orderBy(AccessTable.timeCreated)
        .limit(1)
        .then((rows) => rows.at(0)?.userID),
    );
    await job.push({ id: row.id, owner });
  });

  /**
   * Disk use per workspace schema, plus `central` for comparison, from the catalogs in one
   * query. `slug` narrows it to that workspace. With a database per workspace this would run
   * once per client `connect` picks; here every schema shares the one pool.
   */
  export const usage = fn(z.object({ slug: Info.shape.slug.optional() }), async (input) => {
    Identity.assert.superadmin("Only a superadmin can read workspace usage");
    const only = input.slug ? (await find(input.slug)).schema : undefined;
    const rows = await Central.use((tx) =>
      tx.execute<{
        schema: string;
        name: string;
        rows: string;
        data: string;
        indexes: string;
        total: string;
      }>(
        sql`
            SELECT n.nspname AS schema,
                   c.relname AS name,
                   -- reltuples is -1 until the first analyze; the live count covers that gap.
                   coalesce(s.n_live_tup, greatest(c.reltuples, 0))::bigint AS rows,
                   pg_relation_size(c.oid) AS data,
                   pg_indexes_size(c.oid) AS indexes,
                   pg_total_relation_size(c.oid) AS total
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
            WHERE c.relkind IN ('r', 'p')
              AND ${
                only
                  ? sql`n.nspname = ${only}`
                  : sql`(n.nspname = 'central' OR n.nspname IN (
                      SELECT ${WorkspaceTable.schema} FROM ${WorkspaceTable}
                      WHERE ${WorkspaceTable.timeDeleted} IS NULL))`
              }
            ORDER BY pg_total_relation_size(c.oid) DESC
          `,
        "objects",
      ),
    );
    // Postgres hands bigints back as strings; group the one result per schema.
    const tables = [...rows].map((row) => ({
      schema: row.schema,
      name: row.name,
      rows: Number(row.rows),
      data: Number(row.data),
      indexes: Number(row.indexes),
      total: Number(row.total),
    }));
    return [...new Set(tables.map((one) => one.schema))].map((schema) => {
      const own = tables.filter((one) => one.schema === schema);
      return {
        schema,
        bytes: own.reduce((sum, one) => sum + one.total, 0),
        tables: own.length,
        rows: own.reduce((sum, one) => sum + one.rows, 0),
        breakdown: own,
      };
    });
  });

  /** Every workspace, for operators (the CLI); no identity needed, so never route it. */
  export function all() {
    return Central.use((tx) =>
      tx
        .select({
          slug: WorkspaceTable.slug,
          name: WorkspaceTable.name,
          schema: WorkspaceTable.schema,
          status: WorkspaceTable.status,
        })
        .from(WorkspaceTable)
        .where(isNull(WorkspaceTable.timeDeleted))
        .orderBy(WorkspaceTable.slug),
    );
  }

  /** What a request runs in, which is also the switch check. Single mode has only the one. */
  export async function resolve(slug: string) {
    if (Workspace.mode() === "single") throw single();
    const found = await locate(slug);
    if (!found) throw forbidden();
    return found.info;
  }

  /** Where a request runs: the registry row (none for the ambient schema) and the caller's place in it. */
  export type Target = { row?: Row; info: Workspace.Info };

  /**
   * Decides where the request runs, before anything runs there. An App gets its own workspace;
   * otherwise a pick (`slug`, multi mode only), else the caller's first workspace, so a single
   * deploy switched to multi keeps working. Nothing for an unknown caller or one in no workspace.
   * `strict` refuses a pick that doesn't open; off, it answers nothing so the caller can ask again.
   */
  export async function target(slug?: string, strict = true): Promise<Target | undefined> {
    const info = Identity.peek();
    if (info?.type === "system") return own(info.properties.workspace);
    if (!info || !Identity.known()) return;
    const pick = Workspace.mode() === "multi" ? slug : undefined;
    return pick ? locate(pick, strict) : first();
  }

  /** Runs `fn` in `target`, or in no workspace when there is none: the first-access screen. */
  export function enter<R>(target: Target | undefined, fn: () => Promise<R>) {
    return target ? inside(target, fn) : fn();
  }

  /** Runs `fn` in the ready workspace on `schema`, unchecked: for an App's own key or replay. */
  export async function open<R>(schema: string, fn: () => Promise<R>) {
    return inside(await own(schema), fn);
  }

  export function serialize(row: Row): Info {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      timeCreated: row.timeCreated.toISOString(),
    };
  }

  function pending(row: typeof InviteTable.$inferSelect): Invite {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      timeCreated: row.timeCreated.toISOString(),
    };
  }

  // === UTILS ===

  // Unknown slugs and outsiders both get a 403, so slugs don't leak. `strict` off answers nothing instead.
  async function locate(slug: string, strict = true) {
    const user = Identity.userID();
    const row = await Central.use((tx) =>
      tx
        .select({ row: WorkspaceTable })
        .from(WorkspaceTable)
        .innerJoin(
          AccessTable,
          and(eq(AccessTable.workspaceID, WorkspaceTable.id), eq(AccessTable.userID, user)),
        )
        .where(and(eq(WorkspaceTable.slug, slug), isNull(WorkspaceTable.timeDeleted)))
        .then((rows) => rows.at(0)?.row),
    );
    if (!row && !strict) return;
    if (!row) throw forbidden();
    if (row.status !== "ready" && !strict) return;
    if (row.status !== "ready")
      throw new VisibleError(
        "conflict",
        ErrorCodes.Conflict.NOT_READY,
        "Workspace is still being set up",
      );
    const member = await inside(at(row), () => held(user));
    if (!member && !strict) return;
    if (!member) throw forbidden();
    return { row, info: { schema: row.schema, role: member.role } satisfies Workspace.Info };
  }

  function forbidden() {
    return new VisibleError(
      "forbidden",
      ErrorCodes.Permission.FORBIDDEN,
      "Not a member of this workspace",
    );
  }

  /** `fn` in the target's schema, on the client `connect` picks for its row. */
  function inside<R>(target: Target, fn: () => R): R {
    const client = target.row ? connect.use()(target.row) : undefined;
    const run = () => Workspace.provide(target.info, fn);
    return client ? Database.provide(client, run) : run();
  }

  /** A registry row as a target, with no role read yet. */
  function at(row: Row): Target {
    return { row, info: { schema: row.schema } };
  }

  /** The ready workspace on `schema`; scripts and tests read an ambient one with no row behind it. */
  async function own(schema: string): Promise<Target> {
    if (schema === Database.ambient()) return { info: { schema } };
    const row = await Central.use((tx) =>
      tx
        .select()
        .from(WorkspaceTable)
        .where(and(eq(WorkspaceTable.schema, schema), isNull(WorkspaceTable.timeDeleted)))
        .then((rows) => rows.at(0)),
    );
    if (!row || row.status !== "ready") throw forbidden();
    return at(row);
  }

  function single() {
    return new VisibleError(
      "conflict",
      ErrorCodes.Conflict.SINGLE_WORKSPACE,
      "This app runs a single workspace: it can't create another or switch",
    );
  }

  /** Throws unless the caller is the workspace's owner or admin, or a superadmin. */
  async function manage(row: Row) {
    if (Identity.superadmin()) return;
    const user = Identity.userID();
    const member = await inside(at(row), () => held(user));
    if (member?.role === "owner" || member?.role === "admin") return;
    throw new VisibleError(
      "forbidden",
      ErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
      "Only a workspace owner or admin can change it",
    );
  }

  /** The row of the workspace `enter` provided. */
  async function here() {
    const info = Workspace.peek();
    if (!info) return;
    return Central.use((tx) =>
      tx
        .select()
        .from(WorkspaceTable)
        .where(and(eq(WorkspaceTable.schema, info.schema), isNull(WorkspaceTable.timeDeleted)))
        .then((rows) => rows.at(0)),
    );
  }

  /** Single mode's one workspace: the first ever made, if any. */
  function only() {
    return Central.use((tx) =>
      tx
        .select()
        .from(WorkspaceTable)
        .where(isNull(WorkspaceTable.timeDeleted))
        .orderBy(WorkspaceTable.timeCreated)
        .limit(1)
        .then((rows) => rows.at(0)),
    );
  }

  /** The caller's earliest ready workspace they still belong to, or nothing. */
  async function first() {
    const rows = await Central.use((tx) =>
      tx
        .select({ slug: WorkspaceTable.slug })
        .from(AccessTable)
        .innerJoin(WorkspaceTable, eq(WorkspaceTable.id, AccessTable.workspaceID))
        .where(
          and(
            eq(AccessTable.userID, Identity.userID()),
            eq(WorkspaceTable.status, "ready"),
            isNull(WorkspaceTable.timeDeleted),
          ),
        )
        .orderBy(AccessTable.timeCreated),
    );
    // Access outlives a removal, so the first row may hold no seat; try the next.
    for (const row of rows) {
      const found = await locate(row.slug, false);
      if (found) return found;
    }
  }

  /** An invite by id, only if it is addressed to `email`. */
  function mine(id: string, email: string) {
    return Central.use((tx) =>
      tx
        .select({ invite: InviteTable, row: WorkspaceTable })
        .from(InviteTable)
        .innerJoin(WorkspaceTable, eq(WorkspaceTable.id, InviteTable.workspaceID))
        .where(and(eq(InviteTable.id, id), eq(InviteTable.email, email.toLowerCase())))
        .then((rows) => rows.at(0)),
    );
  }

  /** The caller's live row in whichever schema is provided. */
  function held(user: string) {
    return Database.use((tx) =>
      tx
        .select({ role: UserTable.role })
        .from(UserTable)
        .where(and(eq(UserTable.id, user), isNull(UserTable.timeDeleted)))
        .then((rows) => rows.at(0)),
    );
  }

  /** Adds `account` as a user of whichever schema is provided; a returning one keeps their row. */
  function seat(account: Account.Row, role: Workspace.Role) {
    return Database.use((tx) =>
      tx
        .insert(UserTable)
        .values({
          id: account.id,
          name: account.name,
          email: account.email,
          image: account.image,
          role,
        })
        .onConflictDoNothing(),
    );
  }

  /** The people of whichever schema is provided; Apps are listed under Developers. */
  function roster() {
    return Database.use((tx) =>
      tx
        .select({
          userID: UserTable.id,
          name: UserTable.name,
          email: UserTable.email,
          role: UserTable.role,
          timeCreated: UserTable.timeCreated,
        })
        .from(UserTable)
        .where(and(eq(UserTable.kind, "human"), isNull(UserTable.timeDeleted)))
        .orderBy(UserTable.timeCreated)
        .then((rows) =>
          rows.map((one) => ({ ...one, timeCreated: one.timeCreated.toISOString() })),
        ),
    );
  }

  // For operators only, so a missing slug can say so.
  async function find(slug: string) {
    const row = await Central.use((tx) =>
      tx
        .select()
        .from(WorkspaceTable)
        .where(and(eq(WorkspaceTable.slug, slug), isNull(WorkspaceTable.timeDeleted)))
        .then((rows) => rows.at(0)),
    );
    if (!row)
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "No such workspace",
      );
    return row;
  }
}
