import type { Issue } from "@agents/core/issue";
import { at, fromDay, shift, split, type Day } from "@agents/ui/day";

/** An issue placed on days: `from`/`until` are the start and due clocks, empty when date-only. */
export type Item = { issue: Issue.Info; start: Day; end: Day; from: string; until: string };

/** A run of an item inside one week row, in columns 0 to 6. */
export type Bar = {
  item: Item;
  lane: number;
  col: number;
  span: number;
  head: boolean;
  tail: boolean;
};

/** A timed item in a day column, in minutes, sharing the width with its overlaps. */
export type Slot = { item: Item; top: number; end: number; col: number; cols: number };

/** Where a pointer is: a day, plus the minute when it's over the hour grid. */
export type Spot = { day: Day; minute?: number };

export type Patch = { startDate?: string; dueDate?: string };

const DAY = 86_400_000;
const STEP = 15;

const gap = (from: Day, to: Day) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export const minutes = (clock: string) =>
  clock ? Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5)) : 0;

export const clock = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

/** Snaps a minute to the grid step, kept inside the day. */
export const snap = (minute: number) =>
  Math.min(Math.max(Math.round(minute / STEP) * STEP, 0), 1440 - STEP);

export function item(issue: Issue.Info, zone: string): Item | undefined {
  const first = issue.startDate ?? issue.dueDate;
  if (!first) return;
  const a = split(first, zone);
  const b = split(issue.dueDate ?? first, zone);
  // A due before its start collapses onto the start day.
  return { issue, start: a.day, end: b.day < a.day ? a.day : b.day, from: a.clock, until: b.clock };
}

/** Single-day with a clock: it goes on the hour grid instead of the all-day lane. */
export const timed = (one: Item) => one.start === one.end && !!(one.from || one.until);

/** Packs the items crossing the week from `first` into lanes, longest first so bars stay low. */
export function lanes(items: Item[], first: Day): Bar[] {
  const last = shift(first, { days: 6 });
  const taken: boolean[][] = [];
  return items
    .filter((one) => one.start <= last && one.end >= first)
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) ||
        gap(b.start, b.end) - gap(a.start, a.end) ||
        (a.from || a.until).localeCompare(b.from || b.until) ||
        a.issue.title.localeCompare(b.issue.title),
    )
    .map((one) => {
      const col = Math.max(0, gap(first, one.start));
      const span = Math.min(6, gap(first, one.end)) - col + 1;
      const cols = Array.from({ length: span }, (_, i) => col + i);
      const free = taken.findIndex((row) => cols.every((c) => !row[c]));
      const lane = free === -1 ? taken.length : free;
      taken[lane] ??= [];
      cols.forEach((c) => (taken[lane][c] = true));
      return { item: one, lane, col, span, head: one.start >= first, tail: one.end <= last };
    });
}

/** Lays timed items out in a day column; overlapping ones split the width. */
export function slots(items: Item[]): Slot[] {
  const all = items
    .map((one) => {
      const top = minutes(one.from || one.until);
      const end = one.from && one.until ? minutes(one.until) : 0;
      return { item: one, top, end: Math.max(end, top + 30), col: 0, cols: 1 };
    })
    .sort((a, b) => a.top - b.top || b.end - a.end);
  const group: Slot[] = [];
  const ends: number[] = [];
  const close = () => {
    group.forEach((one) => (one.cols = ends.length));
    group.length = 0;
    ends.length = 0;
  };
  all.forEach((one) => {
    if (group.length && one.top >= Math.max(...ends)) close();
    const free = ends.findIndex((end) => end <= one.top);
    one.col = free === -1 ? ends.length : free;
    ends[one.col] = one.end;
    group.push(one);
  });
  close();
  return all;
}

// Keeps the start-to-due length when the anchor moves to `start`.
function pair(issue: Issue.Info, start: string): Patch {
  if (!issue.startDate) return { dueDate: start };
  const length = issue.dueDate ? Date.parse(issue.dueDate) - Date.parse(issue.startDate) : 0;
  return {
    startDate: start,
    dueDate: issue.dueDate ? new Date(Date.parse(start) + length).toISOString() : undefined,
  };
}

/** The instant a spot names: the start of its day, or its clock on the hour grid. */
const instant = (to: Spot, zone: string) =>
  to.minute === undefined ? fromDay(to.day, zone) : at(to.day, clock(to.minute), zone);

// Within the hour grid it slides by the pointer; from a lane or the tray its start lands there.
function hours(issue: Issue.Info, first: string, origin: Spot | undefined, to: Spot, zone: string) {
  if (origin?.minute === undefined || to.minute === undefined) return pair(issue, instant(to, zone));
  const a = split(first, zone);
  const day = shift(a.day, { days: gap(origin.day, to.day) });
  return pair(issue, at(day, clock(snap(minutes(a.clock) + to.minute - origin.minute)), zone));
}

// Across days, start and due shift by the same count and keep their clocks.
function across(issue: Issue.Info, days: number, zone: string): Patch {
  const by = (value: string | null) => {
    if (!value) return undefined;
    const one = split(value, zone);
    return at(shift(one.day, { days }), one.clock, zone);
  };
  return { startDate: by(issue.startDate), dueDate: by(issue.dueDate) };
}

/** Moves an issue so the grabbed spot lands on `to`, start and due together. */
export function slide(issue: Issue.Info, origin: Spot | undefined, to: Spot, zone: string): Patch {
  const first = issue.startDate ?? issue.dueDate;
  if (!first) return { dueDate: instant(to, zone) };
  if (to.minute !== undefined) return hours(issue, first, origin, to, zone);
  return across(issue, gap(origin?.day ?? to.day, to.day), zone);
}

/** Drags the due edge to `to`; an issue with only a due starts where its due was. */
export function resize(issue: Issue.Info, to: Spot, zone: string): Patch {
  const first = issue.startDate ?? issue.dueDate;
  if (!first) return {};
  const a = split(first, zone);
  const b = split(issue.dueDate ?? first, zone);
  const due =
    to.minute === undefined
      ? at(to.day < a.day ? a.day : to.day, b.clock, zone)
      : at(a.day, clock(Math.max(to.minute, minutes(a.clock) + STEP)), zone);
  return { startDate: issue.startDate ? undefined : first, dueDate: due };
}

/** The issue as it would read after the patch; a drag preview, never written to the cache. */
export const apply = (issue: Issue.Info, patch: Patch) => ({
  ...issue,
  startDate: patch.startDate ?? issue.startDate,
  dueDate: patch.dueDate ?? issue.dueDate,
});

/** Whether a patch would leave the issue where it is. */
export const same = (issue: Issue.Info, patch: Patch) =>
  (["startDate", "dueDate"] as const).every(
    (key) => patch[key] === undefined || Date.parse(patch[key]) === Date.parse(issue[key] ?? ""),
  );
