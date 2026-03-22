import { $ } from "bun";
import { Resource } from "sst/resource";

const CORE_PATH = `${import.meta.dir}/../packages/core`;

await $`bun run db:migrate`.cwd(CORE_PATH).env({
  DATABASE_URL: Resource.Database.url,
})
