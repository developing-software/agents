/** Read the value following `flag` in a raw arg list, if present. */
export function value(args: string[], flag: string) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

/** Drop the given `--flag value` pairs from a raw arg list. */
export function strip(args: string[], flags: string[]) {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (flags.includes(args[i]!)) {
      i++;
      continue;
    }
    out.push(args[i]!);
  }
  return out;
}

/** Coerce a flag string into number/boolean/string. */
function coerce(v: string) {
  if (v === "true") return true;
  if (v === "false") return false;
  const n = Number(v);
  return v !== "" && !Number.isNaN(n) ? n : v;
}

/** Turn `["--title", "hi", "--done"]` into `{ title: "hi", done: true }`. Also accepts a `{json}` blob. */
export function params(args: string[]) {
  if (args[0]?.startsWith("{")) return JSON.parse(args[0]) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq >= 0) {
      out[a.slice(2, eq)] = coerce(a.slice(eq + 1));
      continue;
    }
    const next = args[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[a.slice(2)] = true;
      continue;
    }
    out[a.slice(2)] = coerce(next);
    i++;
  }
  return out;
}
