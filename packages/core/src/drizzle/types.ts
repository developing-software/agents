import { bigint, char, json, timestamp as rawTs } from "drizzle-orm/pg-core";

export const ulid = (name: string) => char(name, { length: 26 + 4 });

export const id = {
  get id() {
    return ulid("id").primaryKey();
  },
};

export const timestamp = (name: string) =>
  rawTs(name, {
    precision: 3,
    mode: "date",
    withTimezone: true,
  });

export const dollar = (name: string) =>
  bigint(name, {
    mode: "number",
  });

export const timestamps = {
  timeCreated: timestamp("time_created").notNull().defaultNow(),
  timeUpdated: timestamp("time_updated").notNull().defaultNow(),
  // .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  timeDeleted: timestamp("time_deleted"),
};
