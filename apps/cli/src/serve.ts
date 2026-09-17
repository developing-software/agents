const consoleDir = `${import.meta.dir}/../../console`;

function forward(child: Bun.Subprocess) {
  const kill = () => child.kill();
  process.on("SIGINT", kill);
  process.on("SIGTERM", kill);
  return child.exited;
}

/** The SvelteKit adapter-node build, built first if it is missing. */
async function console_() {
  const entry = `${consoleDir}/build/index.js`;
  if (!(await Bun.file(entry).exists())) {
    console.log("Building console...");
    const build = Bun.spawn(["bun", "run", "build"], {
      cwd: consoleDir,
      env: { ...process.env, SVELTE_ADAPTER: "node" },
      stdio: ["inherit", "inherit", "inherit"],
    });
    const code = await build.exited;
    if (code !== 0) process.exit(code);
  }
  const port = process.env.PORT ?? "3000";
  console.log(`Console running at http://localhost:${port}`);
  const child = Bun.spawn(["bun", entry], {
    cwd: consoleDir,
    env: { ...process.env, PORT: port },
    stdio: ["inherit", "inherit", "inherit"],
  });
  process.exit(await forward(child));
}

function usage() {
  console.error(`Usage: dev-agents serve <${Object.keys(targets).join("|")}>`);
  process.exit(1);
}

// api/auth reuse the functions' bun targets, so the CLI serves exactly what `bun dev` runs.
const targets: Record<string, () => unknown> = {
  api: async () => Bun.serve((await import("@agents/functions/api/target/bun")).default),
  auth: async () => Bun.serve((await import("@agents/functions/auth/target/bun")).default),
  console: console_,
};

export async function serve(rest: string[]) {
  return (targets[rest[0]!] ?? usage)();
}
