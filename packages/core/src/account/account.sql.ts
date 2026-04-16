import { pgTable as table } from "drizzle-orm/pg-core";
import { id, timestamps } from "../drizzle/types";

export const accountTable = table("account", {
  ...id,
  ...timestamps,
});
