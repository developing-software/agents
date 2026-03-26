export {};

const ROOT = import.meta.dir;

const entrypoints = ["src/main.ts", "src/post.ts"];

const results = await Promise.all(
  entrypoints.map((entrypoint) =>
    Bun.build({
      entrypoints: [ROOT + "/" + entrypoint],
      outdir: "dist",
      target: "node",
    }),
  ),
);

for (const result of results) {
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  for (const output of result.outputs)
    console.log(`Built ${output.path} (${(output.size / 1024).toFixed(1)} KB)`);
}
