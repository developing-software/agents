import { Identifier } from "./identifier";

export namespace Examples {
  export const Id = (prefix: Identifier.Prefix) =>
    `${Identifier.prefixes[prefix]}_XXXXXXXXXXXXXXXXXXXXXXXXX`;

  export const Repository = {
    id: Id("repository"),
    owner: "octocat",
    repo: "hello-world",
    fullName: "octocat/hello-world",
    defaultBranch: "main",
    source: "github" as const,
    sourceId: "987654321",
    installationRef: "123456789",
  };

  export const Installation = {
    id: Id("installation"),
    provider: "github" as const,
    providerAccountId: "42",
    providerAccountLogin: "octocat",
    installationRef: "123456789",
    accountType: "Organization" as const,
  };

  export const Event = {
    id: Id("event"),
    parentEventId: null,
    source: "repository",
    sourceId: Id("repository"),
    origin: "webhook" as const,
    type: "github.issues.opened",
    tags: ["git:provider:github", "git:repo:github:octocat/hello-world", "git:issue:42"],
    data: { action: "opened" },
    timeCreated: "2024-01-01T00:00:00.000Z",
  };

  export const EventArtifact = {
    key: `events/${Id("event")}/artifacts/execution.json`,
    name: "execution.json",
    size: 4096,
    uploaded: "2024-01-01T00:00:00.000Z",
  };

  export const GithubEvent = {
    id: Id("githubEvent"),
    repoId: Id("repository"),
    parentEventId: null,
    issueNumber: 42,
    pullRequestNumber: null,
    source: "action" as const,
    type: "implement.completed",
    payload: { harness: "claude-code", durationMs: 30000 },
    timeCreated: "2024-01-01T00:00:00.000Z",
  };

  export const GithubEventArtifact = {
    key: `artifacts/${Id("githubEvent")}/execution.json`,
    name: "execution.json",
    size: 4096,
    uploaded: "2024-01-01T00:00:00.000Z",
  };

  export const Plan = {
    id: Id("plan"),
    title: "Refactor event API for batch ingestion",
    body: "## Scope\nRefactor the event API to support batch ingestion.\n\n## Acceptance Criteria\n- [ ] Batch endpoint accepts array of events",
    status: "draft" as const,
    authorType: "human" as const,
    tags: ["git:provider:github", "git:repo:github:octocat/hello-world", "git:issue:42"],
    data: {},
    source: "repository",
    sourceId: Id("repository"),
    createdBy: Id("user"),
    timeCreated: "2024-01-01T00:00:00.000Z",
    timeUpdated: "2024-01-01T00:00:00.000Z",
  };

  export const User = {
    id: Id("user"),
    name: "John Doe",
    email: "john@example.com",
  };

  export const Profile = {
    user: User,
  };

  export const Token = {
    id: Id("apiPersonal"),
    name: "CI token",
    token: "tok_test_******XXXX",
    created: "2024-06-29T00:00:00.000Z",
    lastUsedAt: "2024-06-29T00:10:00.000Z",
    expiresAt: null,
  };

  export const App = {
    id: Id("apiClient"),
    secret: "sec_******XXXX",
    name: "Example App",
    redirectURI: "https://example.com/callback",
  };

  export const Link = {
    url: "https://example.com/XXXXXXXXXX",
  };
}
