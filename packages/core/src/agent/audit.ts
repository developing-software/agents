import { z } from "zod";
import { getProvider } from "../git";
import type { ProviderType } from "../git/provider/interface";
import { parseFrontmatter } from "../util/yaml";

export namespace AgentAudit {
  export interface RepoRef {
    source: ProviderType | string;
    fullName: string;
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
    const content = getProvider(repo.source).content;
    const entries = await content.listDir(repo.fullName, ".agents/audits", ref);
    if (!entries) return [];

    const audits: Info[] = [];
    for (const entry of entries) {
      if (entry.type !== "file" || !entry.name.endsWith(".md")) continue;
      const file = await content.readFile(repo.fullName, entry.path, ref);
      if (!file) continue;

      const { attributes, body } = parseFrontmatter(file.content);
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
    const file = await getProvider(repo.source).content.readFile(repo.fullName, path, ref);
    if (!file) return null;

    const { attributes, body } = parseFrontmatter(file.content);
    return {
      name,
      title: (attributes.title as string) ?? name,
      description: attributes.description as string | undefined,
      path,
      body,
    };
  }
}
