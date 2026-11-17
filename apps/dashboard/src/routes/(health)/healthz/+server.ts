import { Health } from "@agents/core/health";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = () => Response.json(Health.live());
