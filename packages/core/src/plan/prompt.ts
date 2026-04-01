import { GithubIssue } from "../github/repo/issue";
import { Repository } from "../repository/index";
import { Plan } from "./index";

/**
 * Generate a structured prompt for a plan, including linked issue content.
 */
export async function toPrompt(planId: string): Promise<string> {
  const plan = await Plan.fromID(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  // Extract linked issue numbers from tags like "gh:issue:42"
  const issueNumbers = plan.tags
    .filter((t) => t.startsWith("gh:issue:"))
    .map((t) => parseInt(t.split(":")[2], 10))
    .filter((n) => !isNaN(n));

  const sections: string[] = [`# Plan: ${plan.title}`, plan.body];

  if (issueNumbers.length > 0 && plan.sourceId) {
    const repo = await Repository.findByID(plan.sourceId);
    if (repo) {
      const issues = await Promise.all(
        issueNumbers.map((n) => GithubIssue.get(repo, n).catch(() => null)),
      );

      const validIssues = issues.filter(
        (i): i is GithubIssue.Info => i !== null,
      );
      if (validIssues.length > 0) {
        sections.push("## Linked Issues");
        for (const issue of validIssues) {
          sections.push(`### Issue #${issue.number}: ${issue.title}`);
          if (issue.body) sections.push(issue.body);
        }
      }
    }
  }

  return sections.join("\n\n");
}
