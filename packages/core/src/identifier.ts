import { ulid } from "ulid";
import { z } from "zod";
import { ErrorCodes, VisibleError } from "./error";

export namespace Identifier {
  export const prefixes = {
    user: "usr",
    account: "acc",
    workspace: "wsp",
    auth: "aut",
    event: "evt",
    plan: "pln",
    apiPersonal: "pat",
    apiClient: "app",
    apiSecret: "sec",
    link: "lnk",
    repository: "rep",
    installation: "ins",
    githubRepo: "grp",
    githubEvent: "gev",
  } as const;

  export type Prefix = keyof typeof prefixes;

  export function create(prefix: Prefix, given?: string): string {
    if (given) {
      if (given.startsWith(prefixes[prefix])) return given;
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_FORMAT,
        `ID ${given} does not start with ${prefixes[prefix]}`,
      );
    }
    return [prefixes[prefix], ulid()].join("_");
  }

  export function schema(prefix: Prefix) {
    return z.string().startsWith(prefixes[prefix]);
  }
}
