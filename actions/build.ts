import { Glob } from "bun";

const root = import.meta.dir;
const glob = new Glob("**/build.ts");
const scripts: string[] = [];

for await (const path of glob.scan({ cwd: root })) {
  if (path === "build.ts") continue;
  scripts.push(`${root}/${path}`);
}

scripts.sort();

let failed = false;
for (const script of scripts) {
  const label = script.replace(`${root}/`, "");
  console.log(`\n→ ${label}`);
  const proc = Bun.spawn(["bun", script], { stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`✗ ${label} exited with ${code}`);
    failed = true;
  }
}

if (failed) process.exit(1);
