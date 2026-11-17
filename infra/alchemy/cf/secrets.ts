import * as Alchemy from "alchemy";
import { secrets } from "../shared";
import { host } from "./stage";

// Bound as `secret_text`. SESSION_SECRET is minted once per stage and kept in alchemy state.
export const environment = (stage: string) => ({
  NO_COLOR: stage === "prod" ? "1" : "",
  AUTH_URL: `https://${host("auth", stage)}`,
  ...secrets,
  SESSION_SECRET: Alchemy.makeRandom("SessionSecret"),
});
