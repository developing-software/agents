import { GithubContent } from "../github/repo/content";
import { z } from "zod";

export namespace AgentPrompt {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
  }

  export const Info = z.object({
    name: z.string(),
    path: z.string(),
    content: z.string(),
  });
  export type Info = z.infer<typeof Info>;

  /**
   * List all prompts from .agents/prompts/ (markdown files).
   */
  export async function list(repo: RepoRef, ref?: string): Promise<Info[]> {
    const entries = await GithubContent.listDir(repo, ".agents/prompts", ref);
    if (!entries) return [];

    const prompts: Info[] = [];
    for (const entry of entries) {
      if (entry.type !== "file" || !entry.name.endsWith(".md")) continue;
      const content = await GithubContent.readFile(repo, entry.path, ref);
      if (!content) continue;

      prompts.push({
        name: entry.name.replace(/\.md$/, ""),
        path: entry.path,
        content,
      });
    }
    return prompts;
  }

  /**
   * Read a single prompt by name.
   */
  export async function get(repo: RepoRef, name: string, ref?: string): Promise<Info | null> {
    const path = `.agents/prompts/${name}.md`;
    const content = await GithubContent.readFile(repo, path, ref);
    if (!content) return null;
    return { name, path, content };
  }
}
