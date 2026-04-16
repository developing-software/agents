import { z } from "zod";
import { getProvider } from "../git";
import type { ProviderType } from "../git/provider/interface";

export namespace AgentPrompt {
  export interface RepoRef {
    source: ProviderType | string;
    fullName: string;
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
    const content = getProvider(repo.source).content;
    const entries = await content.listDir(repo.fullName, ".agents/prompts", ref);
    if (!entries) return [];

    const prompts: Info[] = [];
    for (const entry of entries) {
      if (entry.type !== "file" || !entry.name.endsWith(".md")) continue;
      const file = await content.readFile(repo.fullName, entry.path, ref);
      if (!file) continue;

      prompts.push({
        name: entry.name.replace(/\.md$/, ""),
        path: entry.path,
        content: file.content,
      });
    }
    return prompts;
  }

  /**
   * Read a single prompt by name.
   */
  export async function get(repo: RepoRef, name: string, ref?: string): Promise<Info | null> {
    const path = `.agents/prompts/${name}.md`;
    const file = await getProvider(repo.source).content.readFile(repo.fullName, path, ref);
    if (!file) return null;
    return { name, path, content: file.content };
  }
}
