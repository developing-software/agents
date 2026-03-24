import { json } from "@sveltejs/kit";
import { healthcheck, withDatabase } from "@agents/core/drizzle/index";

export const GET = async ({ platform }: { platform: App.Platform | undefined }) => {
  const runtime = platform ? "workder" : "node";
  const url = platform?.env?.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL;

  try {
    const dbCheck: { status: "ok" | "degraded"; message: string } = url
      ? await withDatabase(url, async () => await healthcheck())
      : { status: "degraded", message: "no db url", };

    const status = dbCheck.status === "ok" ? 200 : 503;

    return json({
      status: dbCheck.status, runtime, db: dbCheck.message,
      hyperdrive: !!platform?.env.HYPERDRIVE.connectionString
    }, { status });
  } catch (e) {
    console.error(e);
    return json({
      status: "degraded", runtime, db: "db error",
      hyperdrive: !!platform?.env.HYPERDRIVE.connectionString
    }, { status: 503 });
  }
};
