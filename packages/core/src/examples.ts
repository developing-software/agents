import { prefixes } from "./util/id";

export namespace Examples {
  export const Id = (prefix: keyof typeof prefixes) =>
    `${prefixes[prefix]}_XXXXXXXXXXXXXXXXXXXXXXXXX`;

  export const GithubRepo = {
    id: Id("githubRepo"),
    owner: "octocat",
    repo: "hello-world",
    fullName: "octocat/hello-world",
    defaultBranch: "main",
  };

  export const GithubEvent = {
    id: Id("githubEvent"),
    repoId: Id("githubRepo"),
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
