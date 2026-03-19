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
  fingerprint: varchar("fingerprint", { length: 255 }).unique(),
  // stripeCustomerID: varchar("stripe_customer_id", { length: 255 })
  //   .unique()
  //   .notNull(),
  // emailOctopusID: text("email_octopus_id"),
  flags: json("flags").$type<UserFlags>().default({}),
});
