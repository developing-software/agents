import { z } from "zod";
import { and, count, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { fn } from "../../util/fn";
import { iso } from "../../util/fmt";
import { Identity } from "../../identity";
import { Common } from "../../common";
import { Database } from "../../drizzle";
import { Central } from "../../drizzle/central";
import { ProjectTable } from "../../project/project.sql";
import { JobTable } from "../../lib/queue/queue.central";
import { IssueTable } from "../../issue/issue.sql";
import { User } from "../../user";
import { UserTable } from "../../user/user.sql";
import { Workspace } from "../../workspace";

/**
 * The back office. The user directory and counts are the workspace admin's; the database and
 * queue span the whole deploy, so they are a superadmin's.
 */
export namespace Admin {
  /** Every user of the workspace, paginated. Carries the role, and can surface removed ones. */
  export const users = fn(
    Common.Query({
      sort: User.SortableColumns.schema,
      search: z.string().optional(),
      /** Include disabled accounts, which are hidden by default like every other soft delete. */
      deleted: z.boolean().optional(),
    }),
    (input) => {
      Identity.check({ admin: ["read"] });
      const { page, pageSize, limit, offset } = Common.page(input);
      const where = and(
        input.deleted ? undefined : isNull(UserTable.timeDeleted),
        input.search
          ? or(
              ilike(UserTable.name, `%${input.search}%`),
              ilike(UserTable.email, `%${input.search}%`),
            )
          : undefined,
      );
      return Database.use(async (tx) => {
        const [rows, totalRows] = await Promise.all([
          tx
            .select()
            .from(UserTable)
            .where(where)
            .orderBy(...User.SortableColumns.orderBy(input.sort))
            .limit(limit)
            .offset(offset),
          tx.select({ total: count() }).from(UserTable).where(where),
        ] as const);
        return {
          data: rows.map((row) => User.serialize(row)),
          page,
          pageSize,
          total: totalRows[0]?.total ?? 0,
        };
      });
    },
  );

  /** Catalog query the builder can't express; the union `tx` type forces the cast. */
  const raw = (query: SQL) => Database.use((tx): Promise<any[]> => (tx as any).execute(query));

  export const Table = z.object({
    name: z.string(),
    rows: z.number(),
    bytes: z.number(),
  });
  export type Table = z.infer<typeof Table>;

  /** Per-table size and row estimate (planner's `n_live_tup` — cheap), plus the db total. */
  export const tables = fn(z.void(), async () => {
    Identity.assert.superadmin("Only a superadmin can read table sizes");
    const [rows, size] = await Promise.all([
      raw(sql`
        SELECT relname AS name,
               n_live_tup AS rows,
               pg_total_relation_size(relid) AS bytes
        FROM pg_stat_user_tables
        WHERE schemaname IN (${Workspace.peek()?.schema ?? "public"}, 'central')
        ORDER BY pg_total_relation_size(relid) DESC
      `),
      raw(sql`SELECT pg_database_size(current_database()) AS bytes`),
    ] as const);
    return {
      // Postgres hands bigints back as strings over the wire; the UI wants numbers.
      tables: [...rows].map((row): Table => ({
        name: row.name,
        rows: Number(row.rows),
        bytes: Number(row.bytes),
      })),
      bytes: Number([...size][0]?.bytes ?? 0),
    };
  });

  /** Queue depth and the age of the oldest thing still waiting — the "is it stuck" number. */
  export const queue = fn(z.void(), () => {
    Identity.assert.superadmin("Only a superadmin can read the job queue");
    return Central.use(async (tx) => {
      const [pending, running, failed, oldest] = await Promise.all([
        tx
          .select({ n: count() })
          .from(JobTable)
          .where(isNull(JobTable.timeFailed))
          .then((r) => r[0]?.n ?? 0),
        tx
          .select({ n: count() })
          .from(JobTable)
          .where(isNotNull(JobTable.timeReserved))
          .then((r) => r[0]?.n ?? 0),
        tx
          .select({ n: count() })
          .from(JobTable)
          .where(isNotNull(JobTable.timeFailed))
          .then((r) => r[0]?.n ?? 0),
        tx
          .select({ at: sql<Date | null>`min(${JobTable.timeAvailable})` })
          .from(JobTable)
          .where(isNull(JobTable.timeFailed))
          .then((r) => r[0]?.at ?? null),
      ] as const);
      return {
        pending,
        running,
        failed,
        oldest: iso(oldest),
      };
    });
  });

  /** Product tallies rather than storage ones — what the instance actually holds. */
  export const counts = fn(z.void(), async () => {
    Identity.check({ admin: ["read"] });
    return Database.use(async (tx) => {
      const one = (
        table: typeof UserTable | typeof ProjectTable | typeof IssueTable,
        where?: any,
      ) =>
        tx
          .select({ n: count() })
          .from(table as any)
          .where(where)
          .then((r) => r[0]?.n ?? 0);

      const [users, disabled, projects, issues, done] = await Promise.all([
        one(UserTable, isNull(UserTable.timeDeleted)),
        one(UserTable, isNotNull(UserTable.timeDeleted)),
        one(ProjectTable, isNull(ProjectTable.timeDeleted)),
        one(IssueTable, isNull(IssueTable.timeDeleted)),
        one(IssueTable, isNotNull(IssueTable.timeDone)),
      ] as const);
      return { users, disabled, projects, issues, done };
    });
  });

  /** Version, connection headroom and uptime — what you want when the pool misbehaves. */
  export const server = fn(z.void(), async () => {
    Identity.assert.superadmin("Only a superadmin can read the database server");
    const rows = await raw(sql`
      -- server_version carries the packager's whole string; keep the leading number.
      SELECT split_part(current_setting('server_version'), ' ', 1) AS version,
             (SELECT count(*) FROM pg_stat_activity) AS connections,
             current_setting('max_connections') AS max,
             pg_postmaster_start_time() AS started
    `);
    const row = [...rows][0];
    return {
      version: row?.version ?? "unknown",
      connections: Number(row?.connections ?? 0),
      max: Number(row?.max ?? 0),
      started: iso(row?.started),
    };
  });
}
