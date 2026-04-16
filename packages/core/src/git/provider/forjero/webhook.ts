import { Event } from "../../../events/index";
import { Tags } from "../../../events/tag";
import { Repository } from "../../../repository/index";
import { Log } from "../../../util/log";
import { findRepoAndInstallationByFullName } from "./client";

const log = Log.create({ namespace: "git.webhook.forjero" });

interface ForjeroUser {
  id?: number;
  login?: string;
  username?: string;
  full_name?: string;
}

interface ForjeroRepoPayload {
  id?: number;
  name?: string;
  full_name?: string;
  default_branch?: string;
  owner?: ForjeroUser;
}

interface ForjeroPushPayload {
  ref?: string;
  repository?: ForjeroRepoPayload;
  commits?: Array<{ id?: string; message?: string }>;
  head_commit?: { id?: string; message?: string };
  pusher?: ForjeroUser;
  sender?: ForjeroUser;
}

interface ForjeroIssuePayload {
  action?: string;
  repository?: ForjeroRepoPayload;
  issue?: {
    number?: number;
    title?: string;
    state?: string;
    body?: string;
    labels?: Array<{ name?: string }>;
  };
  sender?: ForjeroUser;
}

interface ForjeroPullRequestPayload {
  action?: string;
  number?: number;
  repository?: ForjeroRepoPayload;
  pull_request?: {
    number?: number;
    title?: string;
    state?: string;
    merged?: boolean;
    head?: { ref?: string };
    base?: { ref?: string };
  };
  sender?: ForjeroUser;
}

interface ForjeroRepositoryPayload {
  action?: string;
  repository?: ForjeroRepoPayload;
  organization?: ForjeroUser;
  sender?: ForjeroUser;
}

function ownerOf(repo: ForjeroRepoPayload | undefined): {
  login: string;
  id: string;
  name: string;
} {
  const fullName = repo?.full_name ?? "";
  const [ownerFromName, repoFromName] = fullName.split("/");
  return {
    login: repo?.owner?.login ?? ownerFromName ?? "",
    id: String(repo?.owner?.id ?? repo?.owner?.login ?? ownerFromName ?? ""),
    name: repo?.name ?? repoFromName ?? "",
  };
}

function safeBuf(input: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(input);
  // Copy into a fresh ArrayBuffer so the type isn't ArrayBufferLike (incl. SharedArrayBuffer).
  const out = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(out).set(encoded);
  return out;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifyForjeroSignature(
  rawBody: string,
  signature: string | undefined | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    safeBuf(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, safeBuf(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqualHex(hex, signature.toLowerCase());
}

async function findRepoForPayload(repo: ForjeroRepoPayload | undefined) {
  if (!repo) return null;
  if (repo.id != null) {
    const found = await Repository.findBySourceId("forjero", String(repo.id));
    if (found) return found;
  }
  if (repo.full_name) {
    return Repository.findByFullNameForWebhook(repo.full_name);
  }
  return null;
}

async function handleRepository(payload: ForjeroRepositoryPayload, installationId: string) {
  const repo = payload.repository;
  if (!repo) return;
  const owner = ownerOf(repo);
  log.info("repository event", {
    action: payload.action,
    repo: repo.full_name,
    installationId,
  });

  if (payload.action === "deleted" || payload.action === "removed") {
    if (repo.id != null) await Repository.removeBySourceId("forjero", String(repo.id));
    if (repo.full_name) await Repository.removeByFullName(repo.full_name);
    return;
  }

  await Repository.upsert({
    source: "forjero",
    sourceId: String(repo.id ?? repo.full_name ?? ""),
    installationId,
    owner: owner.login,
    repo: owner.name,
    fullName: repo.full_name ?? `${owner.login}/${owner.name}`,
    defaultBranch: repo.default_branch,
  });
}

async function handlePush(payload: ForjeroPushPayload) {
  const repo = await findRepoForPayload(payload.repository);
  if (!repo) return;
  const branch = (payload.ref ?? "").replace("refs/heads/", "");
  const commitCount = payload.commits?.length ?? 0;
  const lastCommit = payload.head_commit?.message?.split("\n")[0]?.slice(0, 72) ?? "";

  log.info("push event", { repo: repo.fullName, branch, commitCount });

  await Event.create({
    source: "repository",
    sourceId: repo.id,
    origin: "webhook",
    type: "forjero.push",
    tags: [Tags.ghRepo(repo.fullName), Tags.ghBranch(branch)],
    data: {
      branch,
      commitCount,
      lastCommit,
      pusher: payload.pusher?.login ?? payload.pusher?.username ?? payload.sender?.login,
    },
  });
}

async function handleIssues(payload: ForjeroIssuePayload) {
  const repo = await findRepoForPayload(payload.repository);
  if (!repo) return;
  const issue = payload.issue;
  if (!issue?.number) return;

  log.info("issue event", {
    action: payload.action,
    repo: repo.fullName,
    number: issue.number,
  });

  const issueTags = [Tags.ghRepo(repo.fullName), Tags.ghIssue(issue.number)];
  const parentEventId =
    payload.action !== "opened"
      ? await Event.findParent({
          source: "repository",
          sourceId: repo.id,
          tags: issueTags,
          excludeTypePrefix: "agent.",
        })
      : undefined;

  await Event.create({
    source: "repository",
    sourceId: repo.id,
    origin: "webhook",
    type: `forjero.issues.${payload.action ?? "unknown"}`,
    tags: issueTags,
    parentEventId,
    data: {
      title: issue.title ?? "",
      state: issue.state ?? "",
      labels: (issue.labels ?? []).map((l) => l.name ?? ""),
      body: issue.body ?? null,
    },
  });
}

async function handlePullRequest(payload: ForjeroPullRequestPayload) {
  const repo = await findRepoForPayload(payload.repository);
  if (!repo) return;
  const pr = payload.pull_request;
  const number = pr?.number ?? payload.number;
  if (!number) return;

  log.info("pull_request event", {
    action: payload.action,
    repo: repo.fullName,
    number,
  });

  const prTags = [
    Tags.ghRepo(repo.fullName),
    Tags.ghPr(number),
    Tags.ghBranch(pr?.head?.ref ?? ""),
  ];
  const parentEventId =
    payload.action !== "opened"
      ? await Event.findParent({
          source: "repository",
          sourceId: repo.id,
          tags: prTags,
          excludeTypePrefix: "agent.",
        })
      : undefined;

  await Event.create({
    source: "repository",
    sourceId: repo.id,
    origin: "webhook",
    type: `forjero.pull_request.${payload.action ?? "unknown"}`,
    tags: prTags,
    parentEventId,
    data: {
      title: pr?.title ?? "",
      state: pr?.merged ? "merged" : (pr?.state ?? ""),
      headBranch: pr?.head?.ref ?? "",
      baseBranch: pr?.base?.ref ?? "",
    },
  });
}

export interface ForjeroWebhookContext {
  installationId: string;
  eventName: string;
  payload: unknown;
}

export async function handleForjeroWebhook(ctx: ForjeroWebhookContext): Promise<void> {
  switch (ctx.eventName) {
    case "repository":
      return handleRepository(ctx.payload as ForjeroRepositoryPayload, ctx.installationId);
    case "push":
      return handlePush(ctx.payload as ForjeroPushPayload);
    case "issues":
      return handleIssues(ctx.payload as ForjeroIssuePayload);
    case "pull_request":
      return handlePullRequest(ctx.payload as ForjeroPullRequestPayload);
    default:
      log.info("unhandled event", { eventName: ctx.eventName });
  }
}

/**
 * Resolve the installation row for a Forjero webhook delivery and verify its signature.
 * Returns the installation id if signature passes (or no secret is configured); null otherwise.
 */
export async function resolveAndVerifyForjeroDelivery(input: {
  rawBody: string;
  signature: string | undefined | null;
  repoFullName: string | undefined;
}): Promise<{ installationId: string } | null> {
  if (!input.repoFullName) return null;
  const found = await findRepoAndInstallationByFullName(input.repoFullName);
  if (!found) return null;
  const secret = found.installation.webhookSecret ?? process.env.FORJERO_WEBHOOK_SECRET;
  if (!secret) {
    log.info("no webhook secret configured; skipping verification", {
      installationId: found.installation.id,
    });
    return { installationId: found.installation.id };
  }
  const ok = await verifyForjeroSignature(input.rawBody, input.signature, secret);
  if (!ok) return null;
  return { installationId: found.installation.id };
}
