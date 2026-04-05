# useDebounce

A higher-order function that creates a debounced version of a callback. Use this when you need to debounce a function call (not just a value). For debounced values, prefer `Debounced` instead.

## Usage

```ts
import { useDebounce } from "runed";

let durationMs = $state(1000);

const debouncedFn = useDebounce(
  () => {
    console.log("executed after inactivity");
  },
  () => durationMs, // reactive duration
);

debouncedFn(); // starts the timer
```

## API

```ts
const fn = useDebounce(callback: () => void, duration: () => number);
```

| Property/Method        | Description                                |
| ---------------------- | ------------------------------------------ |
| `fn()`                 | Call the debounced function                |
| `fn.runScheduledNow()` | Execute the scheduled callback immediately |
| `fn.cancel()`          | Cancel the pending execution               |
| `fn.pending`           | `true` if a call is pending                |
