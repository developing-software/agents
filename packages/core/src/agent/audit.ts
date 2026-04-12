import { GithubContent } from "../github/repo/content";
import { parseFrontmatter } from "../util/yaml";
import { z } from "zod";

export namespace AgentAudit {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
  }

  export const Info = z.object({
    name: z.string(),
    title: z.string(),
    description: z.string().optional(),
    path: z.string(),
    body: z.string(),
  });
  export type Info = z.infer<typeof Info>;

  /**
   * List all audit scopes from .agents/audits/ (markdown files with frontmatter).
   */
  export async function list(repo: RepoRef, ref?: string): Promise<Info[]> {
    const entries = await GithubContent.listDir(repo, ".agents/audits", ref);
    if (!entries) return [];

    const audits: Info[] = [];
    for (const entry of entries) {
      if (entry.type !== "file" || !entry.name.endsWith(".md")) continue;
      const content = await GithubContent.readFile(repo, entry.path, ref);
      if (!content) continue;

      const { attributes, body } = parseFrontmatter(content);
      audits.push({
        name: entry.name.replace(/\.md$/, ""),
        title: (attributes.title as string) ?? entry.name.replace(/\.md$/, ""),
        description: attributes.description as string | undefined,
        path: entry.path,
        body,
      });
    }
    return audits;
  }

  /**
   * Read a single audit scope by name.
   */
  export async function get(repo: RepoRef, name: string, ref?: string): Promise<Info | null> {
    const path = `.agents/audits/${name}.md`;
    const content = await GithubContent.readFile(repo, path, ref);
    if (!content) return null;

    const { attributes, body } = parseFrontmatter(content);
    return {
      name,
      title: (attributes.title as string) ?? name,
      description: attributes.description as string | undefined,
      path,
      body,
    };
  }
}
