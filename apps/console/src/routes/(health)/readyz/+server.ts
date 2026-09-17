import { json } from "@sveltejs/kit";
import { Health } from "@agents/core/health";

export const GET = async () => {
  const probe = await Health.ready();
  return json(probe, { status: Health.code(probe) });
};
