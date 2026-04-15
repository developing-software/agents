import { $ } from "bun";

await $`bun run build`.cwd(`apps/console`);

await $`bunx sst deploy --stage prod`;
