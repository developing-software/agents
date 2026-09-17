// Compile — args: target, outfile (e.g.: bun build.ts bun-darwin-arm64 dist/dev-agents-macos)
const target = Bun.argv[2] ?? "bun";
const outfile = Bun.argv[3] ?? `${import.meta.dir}/dist/dev-agents`;
await Bun.$`bun build ${import.meta.dir}/src/index.ts --compile --target=${target} --outfile=${outfile}`;
console.log(`Built ${outfile}`);
