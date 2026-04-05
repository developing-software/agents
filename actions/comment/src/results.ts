import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import type { AgentData, CheckData, DiffData, PrData, ResultsData } from "./types";

function readJson<T>(path: string): T | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

/**
 * Read all check results from the checks directory.
 * Structure: checks/{category}/{name}/data.json -> { outcome }
 */
function readChecks(checksDir: string): Record<string, Record<string, CheckData>> | null {
  if (!existsSync(checksDir)) return null;

  const result: Record<string, Record<string, CheckData>> = {};
  let hasAny = false;

  const categories = readdirSync(checksDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const cat of categories) {
    const catPath = join(checksDir, cat.name);
    const checks = readdirSync(catPath, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const check of checks) {
      const data = readJson<CheckData>(join(catPath, check.name, "data.json"));
      if (data?.outcome) {
        result[cat.name] ??= {};
        result[cat.name]![check.name] = data;
        hasAny = true;
      }
    }
  }

  return hasAny ? result : null;
}

/**
 * Read the results directory populated by upstream actions.
 * Returns typed data with null for missing sections. Never throws.
 */
export function readResultsDir(dir: string): ResultsData {
  return {
    agent: readJson<AgentData>(join(dir, "agent", "data.json")),
    diff: readJson<DiffData>(join(dir, "diff", "data.json")),
    pr: readJson<PrData>(join(dir, "pr", "data.json")),
    checks: readChecks(join(dir, "checks")),
  };
}
