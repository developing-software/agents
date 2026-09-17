import { SandboxdSdk, type CreateSandbox, type Link, type SandboxView } from "sandboxd-sdk";
import { createClient } from "sandboxd-sdk/client";
import { Actor } from "../actor";
import { ErrorCodes, VisibleError } from "../error";

export namespace Sandbox {
  export type Info = SandboxView;
  export type CreateInput = CreateSandbox;
  export type LinkInfo = Link;

  function readConfig() {
    const url = process.env.SANDBOXD_URL;
    const token = process.env.SANDBOXD_TOKEN;
    if (!url || !token) throw new Error("sandboxd is not configured (SANDBOXD_URL/SANDBOXD_TOKEN)");
    return { url, token };
  }

  function sdk() {
    const { url, token } = readConfig();
    return new SandboxdSdk({ client: createClient({ baseUrl: url, auth: () => token }) });
  }

  /** Sandboxes are owned by the workspace, so every member sees the same runs. */
  function owner() {
    return { "X-Sandboxd-Owner": Actor.workspaceID() };
  }

  async function unwrap<T>(
    call: Promise<{ data?: T; error?: { error: string } | unknown; response?: Response }>,
    what: string,
  ): Promise<T> {
    const { data, error, response } = await call;
    if (data !== undefined && !error) return data;
    const message =
      error && typeof error === "object" && "error" in error ? String(error.error) : String(error);
    if (response?.status === 404) {
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        `${what} not found`,
      );
    }
    if (response?.status === 409) {
      throw new VisibleError("validation", ErrorCodes.Validation.INVALID_STATE, message);
    }
    throw new Error(`sandboxd ${what} failed (${response?.status ?? "no response"}): ${message}`);
  }

  export function configured() {
    return Boolean(process.env.SANDBOXD_URL && process.env.SANDBOXD_TOKEN);
  }

  export async function create(input: CreateInput) {
    return unwrap(sdk().createSandbox({ ...owner(), createSandbox: input }), "create sandbox");
  }

  export async function get(id: string) {
    return unwrap(sdk().getSandbox({ ...owner(), id }), `sandbox ${id}`);
  }

  export async function list() {
    return unwrap(sdk().listSandboxes(owner()), "list sandboxes");
  }

  export async function end(id: string) {
    return unwrap(sdk().endSandbox({ ...owner(), id }), `sandbox ${id}`);
  }

  /** A short-lived wss:// URL for the sandbox's PTY. Hand it to the browser. */
  export async function terminal(id: string) {
    return unwrap(sdk().openTerminal({ ...owner(), id }), `sandbox ${id}`);
  }

  /** A short-lived URL for one port inside the sandbox. */
  export async function preview(id: string, port: number) {
    return unwrap(sdk().openPreview({ ...owner(), id, previewBody: { port } }), `sandbox ${id}`);
  }
}
