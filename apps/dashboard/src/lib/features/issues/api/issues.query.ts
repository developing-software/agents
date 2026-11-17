import { createMutation, keepPreviousData, type QueryClient } from "@tanstack/svelte-query";
import {
  deleteIssueByIdLinkMutation,
  deleteIssueByIdMutation,
  getIssueByIdOptions,
  getIssueByIdQueryKey,
  getInsightsActivityOptions,
  getInsightsCalendarOptions,
  getInsightsDueOptions,
  getInsightsLoadOptions,
  getInsightsStatsOptions,
  getInsightsStatusOptions,
  getIssueOptions,
  getIssueQueryKey,
  getIssueStageOptions,
  getIssueStageQueryKey,
  getUserOptions,
  patchIssueByIdMutation,
  patchIssueStageMutation,
  postIssueByIdLinkMutation,
  postIssueByIdMoveMutation,
  postIssueMutation,
  type GetIssueData,
  type Issue,
} from "@agents/sdk/query";
import { zone, type Prefs } from "@agents/core/user/prefs";
import { today } from "@agents/ui/day";
import { read, type Ctx } from "#lib/query.ts";
import { parse } from "#lib/utils/params.ts";
import { period, schema, span, where } from "../filter";
import { getLabels } from "./issues.remote";

type Scope = { source?: string; sourceID?: string };
type Range = Scope & { start: string; end: string };

// Rows, lists and stages carry the Issue tag; insights and project pages count issues, so they refresh too.
// Picker options sit under the plain `issues` root.
const issue = [
  [{ tags: ["Issue"] }],
  [{ tags: ["Insights"] }],
  [{ tags: ["Project"] }],
  ["issues"],
];

// Everything but rows: a removed issue's own query would refetch straight into a 404.
const views = () => [
  getIssueQueryKey(),
  getIssueStageQueryKey(),
  [{ tags: ["Insights"] }],
  [{ tags: ["Project"] }],
  ["issues"],
];

// Every board view groups this one page client-side; the last page stays up while the next loads.
export const list = (q: Omit<NonNullable<GetIssueData["query"]>, "pageSize">, ctx?: Ctx) => ({
  ...getIssueOptions({ ...ctx, query: { ...q, pageSize: 100 } }),
  placeholderData: keepPreviousData,
});

type Filters = Omit<NonNullable<GetIssueData["query"]>, "pageSize" | "from" | "to" | "unscheduled">;

// The calendar's visible window; `from`/`to` are inclusive instants.
export const between = (q: Filters & { from: string; to: string }) => list(q);

// The calendar tray: issues with neither a start nor a due date.
export const undated = (q: Filters) => list({ ...q, unscheduled: true });

export const get = (id: string, ctx?: Ctx) => getIssueByIdOptions({ ...ctx, path: { id } });

export const stages = (scope: Scope, ctx?: Ctx) => getIssueStageOptions({ ...ctx, query: scope });

export const users = () => getUserOptions();

// The stage picker's labels, each with the projects its issues sit in, grouped in SQL.
export const labels = (scope: Scope) => ({
  queryKey: ["issues", "labels", scope],
  queryFn: read(() => getLabels(scope)),
});

// Insights keep the last range on screen while the next one loads.
export const stats = (range: Range, ctx?: Ctx) => ({
  ...getInsightsStatsOptions({ ...ctx, query: range }),
  placeholderData: keepPreviousData,
});

export const statuses = (range: Range, ctx?: Ctx) => ({
  ...getInsightsStatusOptions({ ...ctx, query: range }),
  placeholderData: keepPreviousData,
});

export const load = (range: Range, ctx?: Ctx) => ({
  ...getInsightsLoadOptions({ ...ctx, query: range }),
  placeholderData: keepPreviousData,
});

export const due = (scope: Scope, ctx?: Ctx) => ({
  ...getInsightsDueOptions({ ...ctx, query: scope }),
  placeholderData: keepPreviousData,
});

export const calendar = (range: Range, ctx?: Ctx) => ({
  ...getInsightsCalendarOptions({ ...ctx, query: range }),
  placeholderData: keepPreviousData,
});

export const activity = (range: Range, ctx?: Ctx) => ({
  ...getInsightsActivityOptions({ ...ctx, query: range }),
  placeholderData: keepPreviousData,
});

// What a page asks for first, for its load to warm: built from the same URL, so the keys match.

/** The issues page's one list; the calendar asks for its own window, so it waits for that. */
export const board = (url: URL, scope: Scope, ctx?: Ctx) => {
  const params = parse(schema, url);
  return params.view === "calendar" ? [] : [list(where(params, scope), ctx)];
};

/** Every insights section, for the range in `url`, defaulting to the month to today in the reader's zone. */
export const insights = (url: URL, prefs: Prefs, scope: Scope, ctx?: Ctx) => {
  const now = today(zone(prefs));
  const range = { ...span(parse(period(now), url), now), ...scope };
  return [
    stats(range, ctx),
    activity(range, ctx),
    statuses(range, ctx),
    calendar(range, ctx),
    due(scope, ctx),
    load(range, ctx),
  ];
};

/** An issue and its sub-issues. */
export const detail = (id: string, ctx?: Ctx) => [
  get(id, ctx),
  list({ parentID: id, sort: ["position"] }, ctx),
];

export const create = (opts?: Pick<ReturnType<typeof postIssueMutation>, "onSuccess">) =>
  createMutation(() => ({
    ...postIssueMutation(),
    meta: { invalidates: issue },
    ...opts,
  }));

export const update = (opts?: Pick<ReturnType<typeof patchIssueByIdMutation>, "onSuccess">) =>
  createMutation(() => ({
    ...patchIssueByIdMutation(),
    meta: { invalidates: issue },
    ...opts,
  }));

// Relabels every issue in a stage at once.
export const rename = (opts?: Pick<ReturnType<typeof patchIssueStageMutation>, "onSuccess">) =>
  createMutation(() => ({
    ...patchIssueStageMutation(),
    meta: { invalidates: issue },
    ...opts,
  }));

export const move = (opts?: Pick<ReturnType<typeof postIssueByIdMoveMutation>, "onSuccess">) =>
  createMutation(() => ({
    ...postIssueByIdMoveMutation(),
    meta: { invalidates: [getIssueQueryKey()] },
    ...opts,
  }));

export const remove = (opts?: Pick<ReturnType<typeof deleteIssueByIdMutation>, "onSuccess">) =>
  createMutation(() => ({
    ...deleteIssueByIdMutation(),
    meta: { invalidates: views() },
    ...opts,
  }));

// Links only show on the issue itself, so the returned row replaces its entry and nothing refetches.
export const link = (opts?: Pick<ReturnType<typeof postIssueByIdLinkMutation>, "onSuccess">) =>
  createMutation(() => ({
    ...postIssueByIdLinkMutation(),
    meta: { invalidates: [] },
    onSuccess: (data, vars, result, ctx) => {
      row(ctx.client, data);
      return opts?.onSuccess?.(data, vars, result, ctx);
    },
  }));

export const unlink = (opts?: Pick<ReturnType<typeof deleteIssueByIdLinkMutation>, "onSuccess">) =>
  createMutation(() => ({
    ...deleteIssueByIdLinkMutation(),
    meta: { invalidates: [] },
    onSuccess: (data, vars, result, ctx) => {
      row(ctx.client, data);
      return opts?.onSuccess?.(data, vars, result, ctx);
    },
  }));

function row(client: QueryClient, data: Issue) {
  client.setQueryData(getIssueByIdQueryKey({ path: { id: data.id } }), data);
}
