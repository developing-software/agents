import { prefixes } from "./util/id";

export namespace Examples {
  export const Id = (prefix: keyof typeof prefixes) =>
    `${prefixes[prefix]}_XXXXXXXXXXXXXXXXXXXXXXXXX`;

  export const Repository = {
    id: Id("repository"),
    owner: "octocat",
    repo: "hello-world",
    fullName: "octocat/hello-world",
    defaultBranch: "main",
    source: "github" as const,
    sourceId: "987654321",
    installationId: 123456789,
  };

  export const GithubInstallation = {
    id: Id("githubInstallation"),
    installationId: 123456789,
    owner: "octocat",
  };

  export const Event = {
    id: Id("event"),
    parentEventId: null,
    source: "repository",
    sourceId: Id("repository"),
    origin: "webhook" as const,
    type: "github.issues.opened",
    tags: ["gh:repo:octocat/hello-world", "gh:issue:42"],
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
    token: "pat_test_******XXXX",
    created: "2024-06-29T00:00:00.000Z",
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
