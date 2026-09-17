import { json } from "@sveltejs/kit";
import { Health } from "@agents/core/health";

/** Liveness — touches no dependency. `readyz` and `startupz` ask about the database. */
export const GET = () => json(Health.live());
