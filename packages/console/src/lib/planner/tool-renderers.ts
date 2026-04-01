// Helpers for rendering tool call results in the planner chat UI.

export interface RenderedTool {
  kind: "issues" | "issue" | "label" | "plan" | "plans" | "tree" | "file" | "triage" | "generic";
  summary: string;
  data: unknown;
}

export function renderToolResult(toolName: string, result: unknown): RenderedTool {
  switch (toolName) {
    case "listIssues": {
      const issues = result as Array<{ number: number; title: string; state: string }>;
      return {
        kind: "issues",
        summary: `${issues.length} issue${issues.length !== 1 ? "s" : ""}`,
        data: issues,
      };
    }

    case "getIssue": {
      const issue = result as { number: number; title: string; state: string; labels: string[] };
      return {
        kind: "issue",
        summary: `#${issue.number}: ${issue.title}`,
        data: issue,
      };
    }

    case "labelIssue": {
      const r = result as { issueNumber: number; added: string[]; removed: string[] };
      const parts = [];
      if (r.added.length) parts.push(`added: ${r.added.join(", ")}`);
      if (r.removed.length) parts.push(`removed: ${r.removed.join(", ")}`);
      return {
        kind: "label",
        summary: `#${r.issueNumber} — ${parts.join("; ") || "no changes"}`,
        data: result,
      };
    }

    case "createPlan": {
      const plan = result as { id: string; title: string };
      return {
        kind: "plan",
        summary: `Created: ${plan.title}`,
        data: result,
      };
    }

    case "updatePlan": {
      const r = result as { id: string; updated: string[] };
      return {
        kind: "plan",
        summary: `Updated plan ${r.id.slice(0, 8)}… (${r.updated.join(", ")})`,
        data: result,
      };
    }

    case "listPlans": {
      const plans = result as Array<{ id: string; title: string; status: string }>;
      return {
        kind: "plans",
        summary: `${plans.length} plan${plans.length !== 1 ? "s" : ""}`,
        data: plans,
      };
    }

    case "getRepoTree": {
      const entries = result as Array<{ path: string; type: string }>;
      const count = Array.isArray(entries) ? entries.length : 0;
      return {
        kind: "tree",
        summary: `${count} file${count !== 1 ? "s" : ""}`,
        data: entries,
      };
    }

    case "readFile": {
      const r = result as { path: string; content?: string; error?: string };
      return {
        kind: "file",
        summary: r.error ? `Error: ${r.error}` : r.path,
        data: result,
      };
    }

    case "triageIssue": {
      const r = result as {
        issueNumber: number;
        type: string;
        scope: string;
        actionable: boolean;
      };
      return {
        kind: "triage",
        summary: `#${r.issueNumber} — ${r.type}, ${r.scope}${r.actionable ? "" : ", not actionable"}`,
        data: result,
      };
    }

    default:
      return {
        kind: "generic",
        summary: toolName,
        data: result,
      };
  }
}

export function scopeColor(scope: string): string {
  switch (scope) {
    case "trivial": return "#3a3a3a";
    case "small": return "#1a3a2a";
    case "medium": return "#2a2a1a";
    case "large": return "#3a1a1a";
    default: return "#2a2a2a";
  }
}

export function typeColor(type: string): string {
  switch (type) {
    case "bug": return "#3a1a1a";
    case "feature": return "#1a2a3a";
    case "task": return "#1a3a2a";
    case "question": return "#2a1a3a";
    default: return "#2a2a2a";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "draft": return "#2a2a2a";
    case "review": return "#2a2a1a";
    case "approved": return "#1a3a2a";
    case "implementing": return "#1a2a3a";
    case "completed": return "#1a3a1a";
    case "rejected": return "#3a1a1a";
    default: return "#2a2a2a";
  }
}
