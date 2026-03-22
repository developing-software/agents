import { $ } from "bun";

await $`bun run build`.cwd(`packages/console`);

await $`bunx sst deploy --stage dev`;
