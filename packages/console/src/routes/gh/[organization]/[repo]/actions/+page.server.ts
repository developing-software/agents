import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  return { defaultBranch: repo?.defaultBranch ?? "main" };
};
