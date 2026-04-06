# watch

Run a callback when specific reactive values change. Unlike `$effect` which auto-tracks all accessed values, `watch` lets you explicitly declare which sources to track.

## Single Source

```ts
import { watch } from "runed";

let count = $state(0);
watch(
  () => count,
  () => {
    console.log("count changed:", count);
  },
);
```

## Multiple Sources (with Previous Values)

```ts
let age = $state(20);
let name = $state("bob");

watch([() => age, () => name], ([age, name], [prevAge, prevName]) => {
  console.log(`${prevName} (${prevAge}) -> ${name} (${age})`);
});
```

## Deep Object Watching

```ts
let user = $state({ name: "bob", age: 20 });

// Use $state.snapshot to trigger on deep changes
watch(
  () => $state.snapshot(user),
  () => {
    console.log(`${user.name} is ${user.age}`);
  },
);
```

## Variants

| Variant         | Description                             |
| --------------- | --------------------------------------- |
| `watch`         | Runs after render (uses `$effect`)      |
| `watch.pre`     | Runs before render (uses `$effect.pre`) |
| `watchOnce`     | Runs once then stops                    |
| `watchOnce.pre` | Runs once before render then stops      |

## Options

| Option | Default | Description                                             |
| ------ | ------- | ------------------------------------------------------- |
| `lazy` | `false` | Only run callback after initial change (skip first run) |
