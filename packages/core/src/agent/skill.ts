import { GithubContent } from "../github/repo/content";
import { parseFrontmatter } from "../util/yaml";
import { z } from "zod";

export namespace AgentSkill {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
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

  /**
   * Parse a SKILL.md file (YAML frontmatter + markdown body).
   */
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

  /**
   * List skills in .agents/skills/ for a repo.
   */
  export async function listAgentsSkills(
    repo: RepoRef,
    ref?: string,
  ): Promise<SkillInfo[]> {
    const entries = await GithubContent.listDir(repo, ".agents/skills", ref);
    if (!entries) return [];

    const skills: SkillInfo[] = [];
    for (const entry of entries) {
      if (entry.type !== "dir") continue;
      const content = await GithubContent.readFile(
        repo,
        `${entry.path}/SKILL.md`,
        ref,
      );
      if (!content) continue;
      skills.push(parseSkillFile(content, entry.name, ".agents"));
    }
    return skills;
  }

  /**
   * List skills in .claude/skills/ for a repo.
   */
  export async function listClaudeSkills(
    repo: RepoRef,
    ref?: string,
  ): Promise<SkillInfo[]> {
    const entries = await GithubContent.listDir(repo, ".claude/skills", ref);
    if (!entries) return [];

    const skills: SkillInfo[] = [];
    for (const entry of entries) {
      if (entry.type !== "dir") continue;
      const content = await GithubContent.readFile(
        repo,
        `${entry.path}/SKILL.md`,
        ref,
      );
      if (!content) continue;
      skills.push(parseSkillFile(content, entry.name, ".claude"));
    }
    return skills;
  }

  /**
   * Install a skill from a source into the target folder.
   * Creates the skill directory and SKILL.md via GitHub API commit.
   */
  export async function install(
    repo: RepoRef,
    source: SkillSource,
    target: ".agents" | ".claude",
    branch?: string,
  ): Promise<void> {
    let name: string;
    let content: string;

    switch (source.type) {
      case "url": {
        const response = await fetch(source.url);
        if (!response.ok)
          throw new Error(`Failed to fetch skill from ${source.url}: ${response.status}`);
        content = await response.text();
        // derive name from URL path
        const urlParts = source.url.split("/");
        name = urlParts[urlParts.length - 2] ?? "skill";
        break;
      }
      case "repo": {
        const sourceContent = await GithubContent.readFile(
          { installationId: repo.installationId, owner: source.owner, repo: source.repo },
          source.path,
          source.ref,
        );
        if (!sourceContent) throw new Error(`Skill not found at ${source.owner}/${source.repo}/${source.path}`);
        content = sourceContent;
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
    await GithubContent.writeFile(
      repo,
      targetPath,
      content,
      `Add skill: ${name}`,
      branch,
    );
  }

  /**
   * Link a skill from .agents/skills/ to .claude/skills/ by copying the SKILL.md.
   */
  export async function linkToClaude(
    repo: RepoRef,
    skillId: string,
    branch?: string,
  ): Promise<void> {
    const content = await GithubContent.readFile(
      repo,
      `.agents/skills/${skillId}/SKILL.md`,
    );
    if (!content)
      throw new Error(`Skill '${skillId}' not found in .agents/skills/`);

    await GithubContent.writeFile(
      repo,
      `.claude/skills/${skillId}/SKILL.md`,
      content,
      `Link skill to .claude: ${skillId}`,
      branch,
    );
  }

  /**
   * Remove a skill from the target folder.
   */
  export async function remove(
    repo: RepoRef,
    skillId: string,
    target: ".agents" | ".claude",
    branch?: string,
  ): Promise<void> {
    const dir = await GithubContent.listDir(
      repo,
      `${target}/skills/${skillId}`,
    );
    if (!dir) return;

    // delete all files in the skill directory
    for (const entry of dir) {
      if (entry.type === "file") {
        await GithubContent.deleteFile(
          repo,
          entry.path,
          `Remove skill: ${skillId}`,
          entry.sha,
          branch,
        );
      }
    }
  }
}
