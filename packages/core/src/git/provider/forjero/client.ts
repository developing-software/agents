import { and, eq, isNull } from "drizzle-orm";
import { ForjeroSdk } from "forjero-sdk";
import { createClient } from "forjero-sdk/client";
import { Database } from "../../../drizzle";
import { VisibleError } from "../../../error";
import { repositoryTable } from "../../../repository/repository.sql";
import { installationsTable } from "../../installation.sql";
import { Installation } from "../../installation";

const DEFAULT_BASE_URL = "https://codeberg.org";

export interface ResolvedInstallation {
  token: string;
  baseUrl: string;
  webhookSecret?: string;
}

export function splitFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new VisibleError("validation", "invalid_repo", `Invalid fullName "${fullName}"`);
  }
  return { owner, repo };
}

function readMeta(meta: unknown): { baseUrl?: string; webhookSecret?: string } {
  if (!meta || typeof meta !== "object") return {};
  const m = meta as Record<string, unknown>;
  return {
    baseUrl: typeof m.baseUrl === "string" ? m.baseUrl : undefined,
    webhookSecret: typeof m.webhookSecret === "string" ? m.webhookSecret : undefined,
  };
}

export async function resolveInstallation(fullName: string): Promise<ResolvedInstallation> {
  const row = await Database.use((tx) =>
    tx
      .select({
        installationRef: installationsTable.installationRef,
        meta: installationsTable.meta,
      })
      .from(repositoryTable)
      .innerJoin(installationsTable, eq(repositoryTable.installationId, installationsTable.id))
      .where(
        and(
          eq(repositoryTable.fullName, fullName),
          eq(repositoryTable.source, "forjero"),
          isNull(repositoryTable.timeDeleted),
        ),
      )
      .then((rows) => rows[0] ?? null),
  );
  if (!row?.installationRef) {
    throw new VisibleError(
      "not_found",
      "installation_not_found",
      `No Forgejo installation registered for ${fullName}`,
    );
  }
  const meta = readMeta(row.meta);
  return {
    token: row.installationRef,
    baseUrl: meta.baseUrl ?? DEFAULT_BASE_URL,
    webhookSecret: meta.webhookSecret,
  };
}

export async function resolveInstallationByInstallationId(
  installationId: string,
): Promise<ResolvedInstallation> {
  const row = await Installation.fromIDForWebhook(installationId);
  if (!row?.installationRef) {
    throw new VisibleError(
      "not_found",
      "installation_not_found",
      `Forgejo installation ${installationId} not found`,
    );
  }
  const meta = readMeta(row.meta);
  return {
    token: row.installationRef,
    baseUrl: meta.baseUrl ?? DEFAULT_BASE_URL,
    webhookSecret: meta.webhookSecret,
  };
}

export interface RepoAndInstallation {
  repo: { id: string; fullName: string };
  installation: { id: string; webhookSecret?: string; baseUrl: string; token: string };
}

/**
 * Look up the repo + installation rows for an inbound webhook delivery.
 * Returns null if no matching row is registered.
 */
export async function findRepoAndInstallationByFullName(
  fullName: string,
): Promise<RepoAndInstallation | null> {
  const row = await Database.use((tx) =>
    tx
      .select({
        repoId: repositoryTable.id,
        repoFullName: repositoryTable.fullName,
        installationId: installationsTable.id,
        installationRef: installationsTable.installationRef,
        meta: installationsTable.meta,
      })
      .from(repositoryTable)
      .innerJoin(installationsTable, eq(repositoryTable.installationId, installationsTable.id))
      .where(
        and(
          eq(repositoryTable.fullName, fullName),
          eq(repositoryTable.source, "forjero"),
          isNull(repositoryTable.timeDeleted),
        ),
      )
      .then((rows) => rows[0] ?? null),
  );
  if (!row?.installationRef) return null;
  const meta = readMeta(row.meta);
  return {
    repo: { id: row.repoId, fullName: row.repoFullName },
    installation: {
      id: row.installationId,
      token: row.installationRef,
      baseUrl: meta.baseUrl ?? DEFAULT_BASE_URL,
      webhookSecret: meta.webhookSecret,
    },
  };
}

export function sdkForToken(token: string, baseUrl: string = DEFAULT_BASE_URL): ForjeroSdk {
  const client = createClient({
    baseUrl: `${baseUrl.replace(/\/$/, "")}/api/v1`,
    headers: { Authorization: `Bearer ${token}` },
  });
  return new ForjeroSdk({ client });
}

export async function sdkFor(fullName: string): Promise<ForjeroSdk> {
  const { token, baseUrl } = await resolveInstallation(fullName);
  return sdkForToken(token, baseUrl);
}

export interface SdkResult<T> {
  data?: T;
  error?: unknown;
  response?: Response;
}

/**
 * Unwrap a Forjero SDK call result.
 * Returns the parsed body on 2xx; throws a VisibleError otherwise.
 */
export function unwrap<T>(result: SdkResult<T>): T {
  if (result.error || !result.response?.ok) {
    const status = result.response?.status ?? 0;
    const body =
      typeof result.error === "string"
        ? result.error
        : result.error
          ? JSON.stringify(result.error)
          : `HTTP ${status}`;
    throw new VisibleError("internal", "internal_error", `Forjero API error (${status}): ${body}`);
  }
  return result.data as T;
}

/**
 * Unwrap-or-null on 404: returns null if the response 404s, otherwise the parsed body.
 */
export function unwrapOrNull<T>(result: SdkResult<T>): T | null {
  if (result.response?.status === 404) return null;
  return unwrap(result);
}
