import { z } from "zod";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  isNotNull,
  isNull,
  max,
  min,
  ne,
  sql,
  type SQLWrapper,
} from "drizzle-orm";
import { Assert } from "../util/assert";
import { ErrorCodes, VisibleError } from "../error";
import { fn } from "../util/fn";
import { Database } from "../drizzle";
import { Identity } from "../identity";
import { Common } from "../common";
import { Examples } from "../examples";
import { Identifier } from "../identifier";
import { sortable } from "../drizzle/order";
import { date, iso, trim } from "../util/fmt";
import { clean, Tags } from "../util/tag";
import {
  Annotate,
  Link,
  Links,
  Metadata,
  annotate as merge,
  link as append,
  relink,
  unlink as detach,
} from "../util/meta";
import { Bus } from "../platform/bus";
import { UserTable } from "../user/user.sql";
import { ProjectTable } from "../project/project.sql";
import { rank, StatusValues, IssueTable } from "./issue.sql";

export { Insights } from "./insights";

export namespace Issue {
  export const assert = Assert.create("Issue");

  export const Status = z.enum(StatusValues);
  export type Status = z.infer<typeof Status>;

  /** Joined in — every list row wants the name, and a left join is cheap. */
  export const Assignee = z
    .object({
      id: z.string(),
      name: z.string(),
      image: z.string().nullable(),
    })
    .nullable()
    .meta({
      description: "The user responsible, joined in. Null when unassigned.",
    });
  export type Assignee = z.infer<typeof Assignee>;

  export const Info = z
    .object({
      id: z.string().meta({ description: Common.IdDescription, example: Examples.Issue.id }),
      createdBy: z.string().meta({ description: "Id of the user who created it." }),
      assignee: Assignee,
      source: z
        .string()
        .max(64)
        .nullable()
        .meta({ description: "Kind of entity that owns it, like `project`." }),
      sourceID: z
        .string()
        .nullable()
        .meta({ description: "Id of the owning entity, paired with `source`." }),
      parentID: z
        .string()
        .nullable()
        .meta({ description: "The issue this is a sub-issue of. Null at the top level." }),
      position: z.number().int().meta({ description: "Order among its siblings, from 0." }),
      stage: z
        .string()
        .max(64)
        .nullable()
        .meta({ description: "Pipeline stage, a free-text label. Null when unstaged." }),
      title: z.string().min(0).max(2000).meta({ description: "One-line summary." }),
      body: z.string().max(20000).nullable().meta({ description: "The long form, markdown." }),
      status: Status.meta({ description: "Where it sits in the pipeline." }),
      reason: z
        .string()
        .max(200)
        .nullable()
        .meta({ description: "Why it last moved status. The next transition clears it." }),
      tags: Tags.meta({ description: "Free-form labels, trimmed and deduplicated on write." }),
      startDate: z.iso.datetime().nullable().meta({ description: "When work is meant to start." }),
      dueDate: z.iso.datetime().nullable().meta({ description: "When it is meant to be done." }),
      timeStarted: z.iso
        .datetime()
        .nullable()
        .meta({ description: "When it first went `active`. Stamped once." }),
      timeDone: z.iso
        .datetime()
        .nullable()
        .meta({ description: "When it went `done`. Null while it is unfinished." }),
      metadata: Metadata,
      timeCreated: z.iso.datetime().meta({ description: "When it was created." }),
    })
    .meta({
      ref: "Issue",
      description: "A unit of work, owned by whatever entity created it.",
      example: Examples.Issue,
    });
  export type Info = z.infer<typeof Info>;

  export const Stage = z
    .object({
      name: z.string(),
      total: z.number(),
      done: z.number(),
      start: z.iso.datetime().nullable(),
      end: z.iso.datetime().nullable(),
    })
    .meta({
      ref: "Stage",
      description: "A stage label, with the span and counts derived from its issues.",
    });
  export type Stage = z.infer<typeof Stage>;

  const Patch = Info.pick({
    title: true,
    body: true,
    tags: true,
    stage: true,
    status: true,
    reason: true,
    startDate: true,
    dueDate: true,
  })
    // Written as an id, read back as the joined user.
    .extend({ assignee: z.string().nullable(), links: Links })
    .partial();
  type Patch = z.infer<typeof Patch>;

  /** Status and assignee moves stay internal; `Updated` is the public one and reports them too. */
  export const Event = {
    Created: Bus.define("issue.created", Info),
    Updated: Bus.define(
      "issue.updated",
      z.object({
        issue: Info,
        changes: z.record(z.string(), z.object({ before: z.unknown(), after: z.unknown() })),
      }),
    ),
    Removed: Bus.define("issue.removed", Info),
    Status: Bus.define(
      "issue.status",
      z.object({ from: Status, to: Status, reason: z.string().nullable() }),
    ),
    Assigned: Bus.define(
      "issue.assigned",
      z.object({ from: z.string().nullable(), to: z.string().nullable() }),
    ),
  };

  /** The assignee columns worth joining — never the whole user row. */
  const AssigneeColumns = { id: UserTable.id, name: UserTable.name, image: UserTable.image };

  /** Sortable keys mapped to what each orders by — also the allowlist. */
  export const SortableColumns = sortable(
    {
      title: IssueTable.title,
      status: rank,
      stage: IssueTable.stage,
      assignee: AssigneeColumns.name,
      startDate: IssueTable.startDate,
      dueDate: IssueTable.dueDate,
      timeCreated: IssueTable.timeCreated,
      position: IssueTable.position,
    } satisfies Partial<Record<keyof Info, SQLWrapper>>,
    IssueTable.id,
    desc(IssueTable.timeCreated),
  );

  export const create = fn(
    z.object({
      title: Info.shape.title,
      body: Info.shape.body.optional(),
      tags: Info.shape.tags.optional(),
      stage: Info.shape.stage.optional(),
      links: Links.optional(),
      assignee: Patch.shape.assignee,
      source: Info.shape.source.optional(),
      sourceID: Info.shape.sourceID.optional(),
      parentID: Info.shape.parentID.optional(),
      status: Status.optional(),
      startDate: Info.shape.startDate.optional(),
      dueDate: Info.shape.dueDate.optional(),
    }),
    async (input) => {
      Identity.check({ issue: ["create"] });
      const id = Identifier.create("issue");
      const tags = clean(input.tags);
      const status = input.status ?? "backlog";
      const stage = trim(input.stage);
      // A sub-issue lives with its parent's owner, whatever the caller passed.
      const parent = input.parentID ? await assert.exists(fromID.force(input.parentID)) : null;
      const owner = parent ?? {
        source: input.source ?? null,
        sourceID: input.sourceID ?? null,
      };
      return Database.transaction(async (tx) => {
        const [last] = await tx
          .select({ n: count() })
          .from(IssueTable)
          .where(siblings(parent?.id ?? null, owner));
        await tx.insert(IssueTable).values({
          id,
          createdBy: Identity.userID(),
          assignee: input.assignee ?? null,
          source: owner.source,
          sourceID: owner.sourceID,
          parentID: parent?.id ?? null,
          position: last?.n ?? 0,
          stage,
          title: input.title,
          body: input.body ?? null,
          status,
          tags,
          metadata: { annotations: {}, links: input.links ?? [] },
          startDate: date(input.startDate),
          dueDate: date(input.dueDate),
          ...times(status, null),
        });
        const issue = await assert.exists(fromID.force(id));
        await Event.Created.publish(issue, { subject: id, tags });
        return issue;
      });
    },
    {
      title: "Create issue",
      description:
        'Create an issue. Attach it to an entity with source/sourceID (e.g. source "project"), and give it a stage, assignee and planned dates to place it on the timeline. Pass parentID to make it a sub-issue; it joins the parent\'s owner, last among its siblings.',
    },
  );

  export const list = fn(
    Common.Query({
      sort: SortableColumns.schema,
      status: Status.optional(),
      assignee: z.string().optional().meta({ description: 'A user id, or "none" for unassigned.' }),
      stage: Info.shape.stage
        .unwrap()
        .optional()
        .meta({ description: 'A stage name, or "none" for issues without one.' }),
      source: Info.shape.source
        .unwrap()
        .optional()
        .meta({ description: 'The owning entity type, e.g. "project".' }),
      sourceID: Info.shape.sourceID.unwrap().optional(),
      createdBy: Info.shape.createdBy.optional(),
      parentID: z
        .string()
        .optional()
        .meta({ description: 'An issue id for its sub-issues, or "none" for top-level issues.' }),
      search: z.string().optional(),
      from: z.iso.datetime().optional().meta({
        description: "Window start (inclusive). Keeps issues whose start-to-due span reaches it.",
        example: "2026-06-01T00:00:00.000Z",
      }),
      to: z.iso.datetime().optional().meta({
        description: "Window end (inclusive). Keeps issues whose start-to-due span begins by it.",
        example: "2026-06-30T23:59:59.999Z",
      }),
      unscheduled: z.boolean().optional().meta({
        description: "Only issues with neither a start nor a due date; a window skips those.",
      }),
    }),
    (input) => {
      Identity.check({ issue: ["read"] });
      const { page, pageSize, limit, offset } = Common.page(input);
      const conditions = [isNull(IssueTable.timeDeleted)];
      if (input.source) conditions.push(eq(IssueTable.source, input.source));
      if (input.sourceID) conditions.push(eq(IssueTable.sourceID, input.sourceID));
      if (input.status) conditions.push(eq(IssueTable.status, input.status));
      if (input.createdBy) conditions.push(eq(IssueTable.createdBy, input.createdBy));
      if (input.assignee)
        conditions.push(
          input.assignee === "none"
            ? isNull(IssueTable.assignee)
            : eq(IssueTable.assignee, input.assignee),
        );
      if (input.stage)
        conditions.push(
          input.stage === "none" ? isNull(IssueTable.stage) : eq(IssueTable.stage, input.stage),
        );
      if (input.parentID)
        conditions.push(
          input.parentID === "none"
            ? isNull(IssueTable.parentID)
            : eq(IssueTable.parentID, input.parentID),
        );
      if (input.search) conditions.push(ilike(IssueTable.title, `%${input.search}%`));
      const where = and(...conditions, ...window(input));
      return Database.use(async (tx) => {
        const [rows, total] = await Promise.all([
          tx
            .select({ issue: IssueTable, user: AssigneeColumns })
            .from(IssueTable)
            .leftJoin(UserTable, eq(IssueTable.assignee, UserTable.id))
            .where(where)
            .orderBy(...SortableColumns.orderBy(input.sort))
            .limit(limit)
            .offset(offset),
          tx.$count(IssueTable, where),
        ] as const);
        return { data: rows.map(serialize), page, pageSize, total };
      });
    },
    {
      title: "List issues",
      description:
        "List issues, optionally narrowed by status, assignee, stage, owning entity, parent, search, or a from/to window their planned span overlaps (`unscheduled` for undated ones). Paginated.",
    },
  );

  /** Stage list aggregated from the issues wearing each label — no second table to drift. */
  export const stages = fn(
    z.object({
      source: Info.shape.source.unwrap().optional(),
      sourceID: Info.shape.sourceID.unwrap().optional(),
    }),
    (input) => {
      Identity.check({ issue: ["read"] });
      return Database.use((tx) =>
        tx
          .select({
            name: IssueTable.stage,
            total: count(),
            done: sql<number>`cast(count(*) filter (where ${IssueTable.status} = 'done') as int)`,
            start: min(IssueTable.startDate),
            end: max(IssueTable.dueDate),
          })
          .from(IssueTable)
          .where(staged(input))
          .groupBy(IssueTable.stage)
          .orderBy(sql`min(${IssueTable.startDate}) asc nulls last`, asc(IssueTable.stage))
          .then((rows) =>
            rows.map((row) => ({
              name: row.name ?? "",
              total: row.total,
              done: row.done,
              start: iso(row.start),
              end: iso(row.end),
            })),
          ),
      );
    },
    {
      title: "List stages",
      description:
        "The stage labels in use, with the span and counts derived from the issues in each. Call before staging an issue so labels stay consistent.",
    },
  );

  /** The stage picker's options: each label with the live projects whose issues wear it. */
  export const labels = fn(stages.schema, (input) => {
    Identity.check({ issue: ["read"] });
    return Database.use((tx) =>
      tx
        .select({
          name: sql<string>`${IssueTable.stage}`,
          count: count(),
          projects: sql<
            { id: string; name: string }[]
          >`coalesce(jsonb_agg(distinct jsonb_build_object('id', ${ProjectTable.id}, 'name', ${ProjectTable.name})) filter (where ${ProjectTable.id} is not null), '[]'::jsonb)`,
          // Some of its issues sit outside any live project.
          unplaced: sql<boolean>`bool_or(${ProjectTable.id} is null)`,
        })
        .from(IssueTable)
        .leftJoin(
          ProjectTable,
          and(
            eq(IssueTable.source, "project"),
            eq(ProjectTable.id, IssueTable.sourceID),
            isNull(ProjectTable.timeDeleted),
          ),
        )
        .where(staged(input))
        .groupBy(IssueTable.stage)
        .orderBy(sql`min(${IssueTable.startDate}) asc nulls last`, asc(IssueTable.stage)),
    );
  });

  /** Renames a stage across every issue wearing it — the only stage edit there is. */
  export const rename = fn(
    z.object({
      from: Info.shape.stage.unwrap().min(1),
      to: Info.shape.stage.unwrap().min(1),
      source: Info.shape.source.unwrap().optional(),
      sourceID: Info.shape.sourceID.unwrap().optional(),
    }),
    (input) => {
      Identity.check({ issue: ["update"] });
      return Database.use((tx) =>
        tx
          .update(IssueTable)
          .set({ stage: input.to.trim(), timeUpdated: new Date() })
          .where(
            and(
              isNull(IssueTable.timeDeleted),
              input.source ? eq(IssueTable.source, input.source) : undefined,
              input.sourceID ? eq(IssueTable.sourceID, input.sourceID) : undefined,
              eq(IssueTable.stage, input.from),
            ),
          ),
      );
    },
    { title: "Rename stage", description: "Rename a stage across every issue wearing it." },
  );

  export const fromID = fn(
    Info.shape.id,
    (id) => {
      Identity.check({ issue: ["read"] });
      return Database.use((tx) =>
        tx
          .select({ issue: IssueTable, user: AssigneeColumns })
          .from(IssueTable)
          .leftJoin(UserTable, eq(IssueTable.assignee, UserTable.id))
          .where(and(eq(IssueTable.id, id), isNull(IssueTable.timeDeleted)))
          .then((rows) => (rows[0] ? serialize(rows[0]) : null)),
      );
    },
    { title: "Get issue", description: "Fetch a single issue by id." },
  );

  export const update = fn(
    Patch.extend({ id: Info.shape.id }),
    async ({ id, ...patch }) => {
      const before = await assert.exists(fromID.force(id));
      Identity.check({ issue: ["update"] }, before.createdBy);
      const next = {
        ...patch,
        ...(patch.tags !== undefined ? { tags: clean(patch.tags) } : {}),
        ...(patch.stage !== undefined ? { stage: trim(patch.stage) } : {}),
      };

      return Database.transaction(async (tx) => {
        await tx.update(IssueTable).set(fields(next, before)).where(eq(IssueTable.id, id));
        await emit(id, before, next);
      });
    },
    {
      title: "Update issue",
      description:
        "Update an issue's title, body, tags, stage, assignee, planned dates or status. Moving to `active` stamps the real start; `done` stamps the end.",
    },
  );

  export const move = fn(
    z.object({
      id: Info.shape.id,
      parentID: Info.shape.parentID,
      position: z
        .number()
        .int()
        .min(0)
        .optional()
        .meta({ description: "Slot among the new siblings, from 0. Last when omitted." }),
    }),
    async (input) => {
      const before = await assert.exists(fromID.force(input.id));
      Identity.check({ issue: ["update"] }, before.createdBy);
      if (input.parentID) await parent(input.parentID, before);

      return Database.transaction(async (tx) => {
        await close(tx, before);
        const ids = await tx
          .select({ id: IssueTable.id })
          .from(IssueTable)
          .where(and(siblings(input.parentID, before), ne(IssueTable.id, input.id)))
          .orderBy(asc(IssueTable.position))
          .then((rows) => rows.map((row) => row.id));
        ids.splice(Math.min(input.position ?? ids.length, ids.length), 0, input.id);
        for (const [position, id] of ids.entries())
          await tx
            .update(IssueTable)
            .set(
              id === input.id
                ? { parentID: input.parentID, position, timeUpdated: new Date() }
                : { position },
            )
            .where(eq(IssueTable.id, id));
        if (input.parentID === before.parentID) return;
        await Event.Updated.publish(
          {
            issue: await assert.exists(fromID.force(input.id)),
            changes: { parentID: { before: before.parentID, after: input.parentID } },
          },
          { subject: input.id, tags: before.tags },
        );
      });
    },
    {
      title: "Move issue",
      description:
        "Nest an issue under another (a sub-issue) or back to the top level with parentID null, at a position among its new siblings. The parent must share its owner and can't sit beneath it.",
    },
  );

  /** Adds a link, retitling one already at that url. One statement, so concurrent edits all land. */
  export const link = fn(
    Link.extend({ id: Info.shape.id }),
    async (input) => {
      const before = await assert.exists(fromID.force(input.id));
      Identity.check({ issue: ["update"] }, before.createdBy);
      const links = before.metadata.links;
      if (links.length >= 50 && !links.some((item) => item.url === input.url))
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_PARAMETER,
          "An issue holds at most 50 links",
          "url",
        );
      await Database.use((tx) =>
        tx
          .update(IssueTable)
          .set({
            metadata: append(IssueTable.metadata, {
              url: input.url,
              title: input.title,
              type: input.type,
            }),
            timeUpdated: new Date(),
          })
          .where(eq(IssueTable.id, input.id)),
      );
      return assert.exists(fromID.force(input.id));
    },
    {
      title: "Link issue",
      description: "Attach an outside link to an issue, or retitle the one at that url.",
    },
  );

  export const unlink = fn(
    z.object({ id: Info.shape.id, url: z.string().meta({ description: "The link to drop." }) }),
    async (input) => {
      const before = await assert.exists(fromID.force(input.id));
      Identity.check({ issue: ["update"] }, before.createdBy);
      await Database.use((tx) =>
        tx
          .update(IssueTable)
          .set({ metadata: detach(IssueTable.metadata, input.url), timeUpdated: new Date() })
          .where(eq(IssueTable.id, input.id)),
      );
      return assert.exists(fromID.force(input.id));
    },
    { title: "Unlink issue", description: "Drop the link at a url from an issue." },
  );

  /** Annotations stay out of `update` and its events: a sync engine writing one isn't an edit. */
  export const annotate = fn(
    Annotate.extend({ id: Info.shape.id }),
    async (input) => {
      const before = await assert.exists(fromID.force(input.id));
      Identity.check({ issue: ["update"] }, before.createdBy);
      await Database.use((tx) =>
        tx
          .update(IssueTable)
          .set({ metadata: merge(IssueTable.metadata, input), timeUpdated: new Date() })
          .where(eq(IssueTable.id, input.id)),
      );
      return assert.exists(fromID.force(input.id));
    },
    {
      title: "Annotate issue",
      description:
        "Set or drop namespaced annotation keys on an issue. Keys under `github.com/` belong to the GitHub sync and are read-only.",
    },
  );

  /** Its sub-issues move up to take its place, so nothing goes missing with it. */
  export const remove = fn(
    Info.shape.id,
    async (id) => {
      const before = await assert.exists(fromID.force(id));
      Identity.check({ issue: ["delete"] }, before.createdBy);

      return Database.transaction(async (tx) => {
        await tx.update(IssueTable).set({ timeDeleted: new Date() }).where(eq(IssueTable.id, id));
        await close(tx, before);
        const [last] = await tx
          .select({ n: count() })
          .from(IssueTable)
          .where(siblings(before.parentID, before));
        const kids = await tx
          .select({ id: IssueTable.id })
          .from(IssueTable)
          .where(siblings(id, before))
          .orderBy(asc(IssueTable.position));
        for (const [at, kid] of kids.entries())
          await tx
            .update(IssueTable)
            .set({ parentID: before.parentID, position: (last?.n ?? 0) + at })
            .where(eq(IssueTable.id, kid.id));
        await Event.Removed.publish(before, { subject: id, tags: before.tags });
      });
    },
    {
      title: "Delete issue",
      description: "Soft-delete an issue. Its sub-issues move up to its parent.",
    },
  );

  /** A one-dated issue is a point; a null coalesce fails the compare, so undated rows drop. */
  function window(input: { from?: string; to?: string; unscheduled?: boolean }) {
    const from = input.from
      ? [sql`coalesce(${IssueTable.dueDate}, ${IssueTable.startDate}) >= ${input.from}::timestamptz`]
      : [];
    const to = input.to
      ? [sql`coalesce(${IssueTable.startDate}, ${IssueTable.dueDate}) <= ${input.to}::timestamptz`]
      : [];
    const none = input.unscheduled ? [isNull(IssueTable.startDate), isNull(IssueTable.dueDate)] : [];
    return [...from, ...to, ...none];
  }

  function serialize(row: { issue: typeof IssueTable.$inferSelect; user: Assignee }): Info {
    return {
      id: row.issue.id,
      createdBy: row.issue.createdBy,
      assignee: row.user,
      source: row.issue.source,
      sourceID: row.issue.sourceID,
      parentID: row.issue.parentID,
      position: row.issue.position,
      stage: row.issue.stage,
      title: row.issue.title,
      body: row.issue.body,
      status: row.issue.status,
      reason: row.issue.reason,
      tags: row.issue.tags,
      startDate: iso(row.issue.startDate),
      dueDate: iso(row.issue.dueDate),
      timeStarted: iso(row.issue.timeStarted),
      timeDone: iso(row.issue.timeDone),
      metadata: row.issue.metadata,
      timeCreated: row.issue.timeCreated.toISOString(),
    };
  }

  // === UTILS ===

  type Owner = Pick<Info, "source" | "sourceID">;

  /** Live issues with a stage, narrowed to an owner when one is given. */
  function staged(input: { source?: string; sourceID?: string }) {
    return and(
      isNull(IssueTable.timeDeleted),
      input.source ? eq(IssueTable.source, input.source) : undefined,
      input.sourceID ? eq(IssueTable.sourceID, input.sourceID) : undefined,
      isNotNull(IssueTable.stage),
    );
  }

  /** Live issues sharing a parent; top-level ones share the owner instead. */
  function siblings(parentID: string | null, owner: Owner) {
    if (parentID) return and(isNull(IssueTable.timeDeleted), eq(IssueTable.parentID, parentID));
    return and(
      isNull(IssueTable.timeDeleted),
      isNull(IssueTable.parentID),
      owner.source ? eq(IssueTable.source, owner.source) : isNull(IssueTable.source),
      owner.sourceID ? eq(IssueTable.sourceID, owner.sourceID) : isNull(IssueTable.sourceID),
    );
  }

  /** Shifts the later siblings down over the slot `issue` leaves. */
  function close(tx: Database.TxOrDb, issue: Info) {
    return tx
      .update(IssueTable)
      .set({ position: sql`${IssueTable.position} - 1` })
      .where(and(siblings(issue.parentID, issue), gt(IssueTable.position, issue.position)));
  }

  /** The chain from `id` up to the top, `id` first. */
  async function ancestors(id: string | null): Promise<string[]> {
    if (!id) return [];
    const [row] = await Database.use((tx) =>
      tx.select({ parent: IssueTable.parentID }).from(IssueTable).where(eq(IssueTable.id, id)),
    );
    return [id, ...(await ancestors(row?.parent ?? null))];
  }

  /** A parent must share the issue's owner and can't be the issue or sit beneath it. */
  async function parent(id: string, issue: Info) {
    const found = await assert.exists(fromID.force(id));
    const invalid = (message: string) =>
      new VisibleError("validation", ErrorCodes.Validation.INVALID_PARAMETER, message, "parentID");
    if (found.source !== issue.source || found.sourceID !== issue.sourceID)
      throw invalid("A sub-issue must belong to the same owner as its parent");
    if ((await ancestors(id)).includes(issue.id))
      throw invalid("An issue can't be nested under itself or its own sub-issues");
  }

  /**
   * Span moves with status: `active` stamps the start (once), `done` stamps the end,
   * falling back to backlog/planned clears both.
   */
  function times(status: Status, started: string | null) {
    const now = new Date();
    if (status === "active") return { timeStarted: date(started) ?? now, timeDone: null };
    if (status === "done") return { timeDone: now };
    if (status === "blocked") return { timeDone: null };
    return { timeStarted: null, timeDone: null };
  }

  /** The columns a patch copies through untouched. */
  function plain(patch: Patch) {
    return {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(patch.links !== undefined ? { metadata: relink(IssueTable.metadata, patch.links) } : {}),
      ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
      ...(patch.assignee !== undefined ? { assignee: patch.assignee } : {}),
      ...(patch.reason !== undefined ? { reason: patch.reason } : {}),
    };
  }

  function fields(patch: Patch, before: Info) {
    return {
      ...plain(patch),
      ...(patch.startDate !== undefined ? { startDate: date(patch.startDate) } : {}),
      ...(patch.dueDate !== undefined ? { dueDate: date(patch.dueDate) } : {}),
      // A transition drops the old reason unless this patch carries a new one.
      ...(patch.status !== undefined
        ? {
            status: patch.status,
            reason: patch.reason ?? null,
            ...times(patch.status, before.timeStarted),
          }
        : {}),
      timeUpdated: new Date(),
    };
  }

  /** The fields the activity log reports when they change. */
  const LOGGED = ["title", "body", "tags", "stage", "startDate", "dueDate"] as const;

  /** Tags compare by content; everything else by value. */
  function same(key: (typeof LOGGED)[number], before: Info, patch: Patch) {
    if (key === "tags") return patch.tags!.join(" ") === before.tags.join(" ");
    return patch[key] === before[key];
  }

  function diff(before: Info, patch: Patch) {
    const changed: Record<string, { before: unknown; after: unknown }> = {};
    for (const key of LOGGED) {
      if (patch[key] === undefined || same(key, before, patch)) continue;
      changed[key] = { before: before[key], after: patch[key] };
    }
    return changed;
  }

  async function moved(id: string, before: Info, next: Patch, tags: string[]) {
    if (next.status === undefined || next.status === before.status) return;
    await Event.Status.publish(
      { from: before.status, to: next.status, reason: next.reason ?? null },
      { subject: id, tags },
    );
  }

  async function assigned(id: string, before: Info, next: Patch, tags: string[]) {
    const prev = before.assignee?.id ?? null;
    if (next.assignee === undefined || next.assignee === prev) return;
    await Event.Assigned.publish({ from: prev, to: next.assignee }, { subject: id, tags });
  }

  /** Status and assignee moves, shaped like `diff` so the public update carries them too. */
  function moves(before: Info, next: Patch) {
    const prev = before.assignee?.id ?? null;
    return {
      ...(next.status !== undefined && next.status !== before.status
        ? { status: { before: before.status, after: next.status } }
        : {}),
      ...(next.assignee !== undefined && next.assignee !== prev
        ? { assignee: { before: prev, after: next.assignee } }
        : {}),
    };
  }

  /**
   * Emits the status/assignee/field events a patch implies. The status and assignee rows
   * stay internal; `issue.updated` is the one public event, so it reports those moves too.
   */
  async function emit(id: string, before: Info, next: Patch) {
    const tags = next.tags ?? before.tags;
    await moved(id, before, next, tags);
    await assigned(id, before, next, tags);

    const changed = { ...diff(before, next), ...moves(before, next) };
    if (!Object.keys(changed).length) return;
    await Event.Updated.publish(
      { issue: await assert.exists(fromID.force(id)), changes: changed },
      { subject: id, tags },
    );
  }
}
