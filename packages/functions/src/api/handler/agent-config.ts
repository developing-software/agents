import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { Actor } from "@agents/core/actor";
import { AgentDiscovery } from "@agents/core/agent";
import { ErrorCodes, VisibleError } from "@agents/core/error";
import { getProvider } from "@agents/core/git";
import { Repository } from "@agents/core/repository";
import { ErrorResponses, Result, authRequired, validator } from "../common";

const repoParams = z.object({
  provider: Repository.Source,
  owner: z.string(),
  repo: z.string(),
});

const fileInput = z.object({
  path: z.string(),
  content: z.string(),
});

async function resolveRepo(params: z.infer<typeof repoParams>) {
  Actor.assert("user");
  const repo = await Repository.findByFullName(`${params.owner}/${params.repo}`);
  if (!repo || repo.source !== params.provider) {
    throw new VisibleError(
      "not_found",
      ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
      `Repository ${params.owner}/${params.repo} not found`,
    );
  }
  return repo;
}

export namespace AgentConfigApi {
  export const route = new Hono()
    .get(
      "/:provider/:owner/:repo/pairs",
      describeRoute({
        tags: ["Agent Config"],
        summary: "List agent config pairs",
        description: "List AGENTS.md files with their paired CLAUDE.md metadata.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(AgentDiscovery.AgentPair.array()),
              },
            },
            description: "Agent config pairs.",
          },
          401: ErrorResponses[401],
          404: ErrorResponses[404],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator("param", repoParams),
      async (c) => {
        const repo = await resolveRepo(c.req.valid("param"));
        return c.json(await AgentDiscovery.findConfigPairs(repo), 200);
      },
    )
    .get(
      "/:provider/:owner/:repo/file",
      describeRoute({
        tags: ["Agent Config"],
        summary: "Read an agent config file",
        description: "Read AGENTS.md or CLAUDE.md content from the repository.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z.object({
                    path: z.string(),
                    content: z.string(),
                  }),
                ),
              },
            },
            description: "Config file contents.",
          },
          401: ErrorResponses[401],
          404: ErrorResponses[404],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator("param", repoParams),
      validator("query", z.object({ path: z.string() })),
      async (c) => {
        const repo = await resolveRepo(c.req.valid("param"));
        const filePath = AgentDiscovery.assertConfigPath(c.req.valid("query").path);
        const content = await AgentDiscovery.readFile(repo, filePath);
        if (content === null) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            `${filePath} was not found`,
          );
        }
        return c.json({ path: filePath, content }, 200);
      },
    )
    .put(
      "/:provider/:owner/:repo/file",
      describeRoute({
        tags: ["Agent Config"],
        summary: "Update an agent config file",
        description: "Write AGENTS.md or CLAUDE.md content back to the repository.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z.object({
                    saved: z.array(z.string()),
                    validation: AgentDiscovery.ValidationResult.array(),
                  }),
                ),
              },
            },
            description: "Updated file metadata.",
          },
          400: ErrorResponses[400],
          401: ErrorResponses[401],
          404: ErrorResponses[404],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator("param", repoParams),
      validator("json", z.object({ files: z.array(fileInput).min(1) })),
      async (c) => {
        const repo = await resolveRepo(c.req.valid("param"));
        const files = c.req.valid("json").files.map((file) => ({
          path: AgentDiscovery.assertConfigPath(file.path),
          content: file.content,
        }));
        const validation = files.map((file) => AgentDiscovery.validateFile(file.path, file.content));
        const firstError = validation
          .flatMap((result) => result.issues)
          .find((issue) => issue.level === "error");
        if (firstError) {
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.INVALID_PARAMETER,
            firstError.message,
          );
        }

        await getProvider(repo.source).content.commitFiles({
          fullName: repo.fullName,
          files,
          message:
            files.length === 1
              ? `Update ${files[0]!.path.split("/").pop()}`
              : `Update agent config in ${files[0]!.path.split("/").slice(0, -1).join("/") || "repo root"}`,
          mode: "direct",
          base: repo.defaultBranch ?? "main",
        });

        return c.json({ saved: files.map((file) => file.path), validation }, 200);
      },
    )
    .post(
      "/:provider/:owner/:repo/generate",
      describeRoute({
        tags: ["Agent Config"],
        summary: "Generate a CLAUDE.md draft",
        description: "Generate CLAUDE.md content from an AGENTS.md file and optional instructions.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z.object({
                    path: z.string(),
                    content: z.string(),
                    validation: AgentDiscovery.ValidationResult,
                  }),
                ),
              },
            },
            description: "Generated CLAUDE.md draft.",
          },
          400: ErrorResponses[400],
          401: ErrorResponses[401],
          404: ErrorResponses[404],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator("param", repoParams),
      validator(
        "json",
        z.object({
          agentsPath: z.string(),
          instructions: z.string().optional(),
        }),
      ),
      async (c) => {
        const repo = await resolveRepo(c.req.valid("param"));
        const body = c.req.valid("json");
        const agentsPath = AgentDiscovery.assertConfigPath(body.agentsPath);
        const agentsContent = await AgentDiscovery.readFile(repo, agentsPath);
        if (agentsContent === null) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            `${agentsPath} was not found`,
          );
        }

        const directory = agentsPath.includes("/") ? agentsPath.slice(0, agentsPath.lastIndexOf("/")) : "";
        const claudePath = directory ? `${directory}/CLAUDE.md` : "CLAUDE.md";
        const content = AgentDiscovery.generateClaudeFile({
          agentsPath,
          agentsContent,
          instructions: body.instructions,
        });

        return c.json(
          {
            path: claudePath,
            content,
            validation: AgentDiscovery.validateFile(claudePath, content),
          },
          200,
        );
      },
    )
    .post(
      "/:provider/:owner/:repo/validate",
      describeRoute({
        tags: ["Agent Config"],
        summary: "Validate agent config files",
        description: "Validate AGENTS.md or CLAUDE.md content before saving.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(AgentDiscovery.ValidationResult.array()),
              },
            },
            description: "Validation results.",
          },
          400: ErrorResponses[400],
          401: ErrorResponses[401],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator("param", repoParams),
      validator("json", z.object({ files: z.array(fileInput).min(1) })),
      async (c) => {
        await resolveRepo(c.req.valid("param"));
        return c.json(
          c.req.valid("json").files.map((file) => AgentDiscovery.validateFile(file.path, file.content)),
          200,
        );
      },
    );
}
