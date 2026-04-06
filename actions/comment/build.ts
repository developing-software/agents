export {};

const ROOT = import.meta.dir;

const result = await Bun.build({
  entrypoints: [ROOT + "/src/main.ts"],
  outdir: ROOT + "/dist",
  target: "node",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
for (const output of result.outputs)
  console.log(`Built ${output.path} (${(output.size / 1024).toFixed(1)} KB)`);
