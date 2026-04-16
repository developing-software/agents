import { Repository } from "@agents/core/repository";
import { error, redirect, type RequestEvent } from "@sveltejs/kit";
import { getRequestEvent } from "$app/server";
import { readSession } from "$lib/session";
import { withActor } from "$lib/auth";

interface RepoInput {
  organization: string;
  repoName: string;
  provider?: string;
}

function readProvider(event: RequestEvent, provider?: string): string {
  return provider ?? event.params.provider ?? error(500, "Missing provider parameter");
}

async function findAccessibleRepo(event: RequestEvent, input: RepoInput) {
  const session = await readSession(event);
  const accountIDs = Object.keys(session.accounts);
  if (accountIDs.length === 0) throw redirect(302, "/login");

  const provider = readProvider(event, input.provider);
  const repo = await Repository.findAccessibleByFullName({
    accountIDs,
    source: provider as Repository.Source,
    fullName: `${input.organization}/${input.repoName}`,
  });
  if (!repo) error(404, `Repository ${input.organization}/${input.repoName} not found`);
  return repo;
}

export async function withRepoActor<T>(
  event: RequestEvent,
  input: RepoInput,
  fn: (repo: Repository.Info, workspaceID: string) => Promise<T>,
): Promise<T> {
  const provider = readProvider(event, input.provider);
  const accessible = await findAccessibleRepo(event, { ...input, provider });

  return withActor(event, accessible.workspaceID, async () => {
    const repo = await Repository.findByFullName(`${input.organization}/${input.repoName}`);
    if (!repo || repo.source !== provider) {
      error(404, `Repository ${input.organization}/${input.repoName} not found`);
    }
    return fn(repo, accessible.workspaceID);
  });
}

export async function withRequestRepoActor<T>(
  input: RepoInput,
  fn: (repo: Repository.Info, workspaceID: string) => Promise<T>,
): Promise<T> {
  return withRepoActor(getRequestEvent(), input, fn);
}

export async function listAccessibleRepos(event: RequestEvent) {
  const session = await readSession(event);
  const accountIDs = Object.keys(session.accounts);
  if (accountIDs.length === 0) return [];
  return Repository.listAccessible({ accountIDs });
}
