#!/usr/bin/env bun

import { $ } from "bun";

const SPEC_PATH = `${import.meta.dir}/../packages/functions`;
const SDK_PATH = `${import.meta.dir}/../packages/sdk/ts`;

await $`bun run gen:spec`.cwd(SPEC_PATH);
await $`bun run gen`.cwd(SDK_PATH);

await $`bun run fmt`.cwd(`${import.meta.dir}/..`);
