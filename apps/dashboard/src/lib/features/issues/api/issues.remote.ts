import { Issue } from "@agents/core/issue";
import { remote } from "#lib/server/gate.ts";

// Picker options shaped in SQL; no API route, so the dashboard is the only reader.
export const getLabels = remote.core(Issue.labels).query();
