import { z } from "zod";
import { ErrorCodes, VisibleError } from "../error";
import { getProvider } from "../git";
import type { ProviderType } from "../git/provider/interface";
import { parseFrontmatter } from "../util/yaml";

export namespace AgentSkill {
  export interface RepoRef {
    source: ProviderType | string;
    fullName: string;
  }

  export const SkillInfo = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    license: z.string().optional(),
    body: z.string(),
    source: z.enum([".agents", ".claude"]),
  });
  export type SkillInfo = z.infer<typeof SkillInfo>;

  export const SkillSource = z.union([
    z.object({ type: z.literal("url"), url: z.string() }),
    z.object({
      type: z.literal("repo"),
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      ref: z.string().optional(),
    }),
    z.object({ type: z.literal("inline"), name: z.string(), content: z.string() }),
  ]);
  export type SkillSource = z.infer<typeof SkillSource>;

  export function parseSkillFile(
    content: string,
    id: string,
    source: SkillInfo["source"],
  ): SkillInfo {
    const { attributes, body } = parseFrontmatter(content);
    return {
      id,
      name: (attributes.name as string) ?? id,
      description: attributes.description as string | undefined,
      license: attributes.license as string | undefined,
      body,
      source,
    };
  }

  export async function listAgentsSkills(repo: RepoRef, ref?: string): Promise<SkillInfo[]> {
    const content = getProvider(repo.source).content;
    const entries = await content.listDir(repo.fullName, ".agents/skills", ref);
    if (!entries) return [];

    const skills: SkillInfo[] = [];
    for (const entry of entries) {
      if (entry.type !== "dir") continue;
      const file = await content.readFile(repo.fullName, `${entry.path}/SKILL.md`, ref);
      if (!file) continue;
      skills.push(parseSkillFile(file.content, entry.name, ".agents"));
    }
    return skills;
  }

  export async function listClaudeSkills(repo: RepoRef, ref?: string): Promise<SkillInfo[]> {
    const content = getProvider(repo.source).content;
    const entries = await content.listDir(repo.fullName, ".claude/skills", ref);
    if (!entries) return [];

    const skills: SkillInfo[] = [];
    for (const entry of entries) {
      if (entry.type !== "dir") continue;
      const file = await content.readFile(repo.fullName, `${entry.path}/SKILL.md`, ref);
      if (!file) continue;
      skills.push(parseSkillFile(file.content, entry.name, ".claude"));
    }
    return skills;
  }

  export async function install(
    repo: RepoRef,
    source: SkillSource,
    target: ".agents" | ".claude",
    branch?: string,
  ): Promise<void> {
    const provider = getProvider(repo.source);
    let name: string;
    let content: string;

    switch (source.type) {
      case "url": {
        const response = await fetch(source.url);
        if (!response.ok)
          throw new Error(`Failed to fetch skill from ${source.url}: ${response.status}`);
        content = await response.text();
        const urlParts = source.url.split("/");
        name = urlParts[urlParts.length - 2] ?? "skill";
        break;
      }
      case "repo": {
        const sourceFile = await provider.content.readFile(
          `${source.owner}/${source.repo}`,
          source.path,
          source.ref,
        );
        if (!sourceFile)
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            `Skill not found at ${source.owner}/${source.repo}/${source.path}`,
          );
        content = sourceFile.content;
        name = source.path.split("/").slice(-2, -1)[0] ?? "skill";
        break;
      }
      case "inline": {
        name = source.name;
        content = source.content;
        break;
      }
    }

    const targetPath = `${target}/skills/${name}/SKILL.md`;
    await provider.content.writeFile(repo.fullName, {
      path: targetPath,
      content,
      message: `Add skill: ${name}`,
      branch,
    });
  }

  export async function linkToClaude(
    repo: RepoRef,
    skillId: string,
    branch?: string,
  ): Promise<void> {
    const provider = getProvider(repo.source);
    const file = await provider.content.readFile(
      repo.fullName,
      `.agents/skills/${skillId}/SKILL.md`,
    );
    if (!file)
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        `Skill '${skillId}' not found in .agents/skills/`,
      );

    await provider.content.writeFile(repo.fullName, {
      path: `.claude/skills/${skillId}/SKILL.md`,
      content: file.content,
      message: `Link skill to .claude: ${skillId}`,
      branch,
    });
  }

  export async function remove(
    repo: RepoRef,
    skillId: string,
    target: ".agents" | ".claude",
    branch?: string,
  ): Promise<void> {
    const provider = getProvider(repo.source);
    const dir = await provider.content.listDir(repo.fullName, `${target}/skills/${skillId}`);
    if (!dir) return;

    for (const entry of dir) {
      if (entry.type === "file") {
        await provider.content.deleteFile(repo.fullName, {
          path: entry.path,
          message: `Remove skill: ${skillId}`,
          sha: entry.sha,
          branch,
        });
      }
    }
  }
}
