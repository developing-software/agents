import { createClient } from "@agents/sdk/client";
import { DevAgentSdk } from "@agents/sdk";
import { params, strip, value } from "./args";
import * as config from "./config";

/** A configured SDK instance pointed at `url` with an optional bearer `token`. */
export function sdk(token?: string, url = config.DEFAULT_URL) {
  const client = createClient({
    baseUrl: url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return new DevAgentSdk({ client });
}

/** A client from the resolved `--token`/`--url` flags, env and saved config. */
export async function resolve(args: string[]) {
  return sdk(await config.token(value(args, "--token")), await config.url(value(args, "--url")));
}

/** Callable method names, reflected off the SDK so they track the generated client. */
export function methods() {
  const proto = DevAgentSdk.prototype as unknown as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto)
    .filter((n) => n !== "constructor" && typeof proto[n] === "function")
    .sort();
}

export async function api(rest: string[]) {
  const method = rest[0];
  if (!method || method === "help") {
    console.log(`Usage: dev-agents api <method> [--key value | '{json}']\n`);
    console.log("Methods:");
    for (const m of methods()) console.log(`  ${m}`);
    return;
  }

  if (!methods().includes(method)) {
    console.error(`Unknown method: ${method}. Run "dev-agents api" to list methods.`);
    process.exit(1);
  }

  // `--token`/`--url` configure the client; everything else becomes the call params.
  const raw = rest.slice(1);
  const client = await resolve(raw);
  // Invoke as a member so `this` binds to the client instance.
  const call = client as unknown as Record<string, (p: unknown) => Promise<Result>>;
  output(await call[method]!(params(strip(raw, ["--token", "--url"]))));
}

type Result = { data?: unknown; error?: unknown };

/** Print `res.data` as JSON, or print the error and exit non-zero. */
export function output(res: Result) {
  if (res.error) {
    console.error(JSON.stringify(res.error, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(res.data, null, 2));
}
