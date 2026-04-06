# useInterval

A reactive wrapper around `setInterval` with pause, resume, and counter tracking.

## Usage

```ts
import { useInterval } from "runed";

const interval = useInterval(1000, {
  callback: (count) => console.log(`Tick ${count}`),
});
```

## Reactive Duration

```ts
let delay = $state(1000);
const interval = useInterval(() => delay);
// Timer restarts automatically when delay changes
```

## Options

| Option              | Default | Description                |
| ------------------- | ------- | -------------------------- |
| `immediate`         | `true`  | Start immediately          |
| `immediateCallback` | `false` | Execute callback on resume |
| `callback`          | —       | Function called each tick  |

## API

| Property/Method | Description                 |
| --------------- | --------------------------- |
| `counter`       | Current tick count          |
| `pause()`       | Pause the interval          |
| `resume()`      | Resume execution            |
| `reset()`       | Reset counter to zero       |
| `isActive`      | Whether interval is running |
