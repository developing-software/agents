import type { PageServerLoad } from "./$types";
import { listBranchDetails } from "$lib/git/branches.remote";

export const load: PageServerLoad = async ({ params }) => {
  return listBranchDetails({
    organization: params.org,
    repoName: params.repo,
  });
};
