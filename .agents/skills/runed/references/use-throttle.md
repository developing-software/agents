# useThrottle

A higher-order function that throttles the execution of a function, limiting how frequently it can be invoked.

## Usage

```ts
import { useThrottle } from "runed";

let durationMs = $state(1000);

const throttledUpdate = useThrottle(
  () => {
    console.log("throttled execution");
  },
  () => durationMs,
);

throttledUpdate(); // executes at most once per durationMs
```

## API

```ts
const fn = useThrottle(callback: () => void, duration: () => number);
```

Returns a throttled function that executes the callback at most once per specified duration interval.
