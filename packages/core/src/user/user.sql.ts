import { json, pgTable as table, varchar } from "drizzle-orm/pg-core";
import { id, timestamps } from "../drizzle/types";
import { z } from "zod";

export const UserFlags = z.object({
  notificationChannel: z.string().optional(),
});
export type UserFlags = z.infer<typeof UserFlags>;

export const userTable = table("user", {
  ...id,
  ...timestamps,
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  username: varchar("username", { length: 255 }).unique(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  flags: json("flags").$type<UserFlags>().default({}),
});
