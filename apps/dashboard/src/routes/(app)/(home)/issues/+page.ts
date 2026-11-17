import { board } from "#lib/features/issues/api/issues.query.ts";
import { warm } from "#lib/query.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  await warm(data.queryClient, ...board(event.url, {}, { fetch: event.fetch }));
};
