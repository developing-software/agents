import { prefixes } from "./util/id";

export namespace Examples {
  export const Id = (prefix: keyof typeof prefixes) =>
    `${prefixes[prefix]}_XXXXXXXXXXXXXXXXXXXXXXXXX`;

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
