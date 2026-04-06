# PersistedState

A reactive state container that automatically persists to browser storage (localStorage/sessionStorage) and syncs across tabs.

## Basic Usage

```ts
import { PersistedState } from "runed";

const count = new PersistedState("count", 0);
// count.current is reactive and auto-persisted
```

```svelte
<button onclick={() => count.current++}>Count: {count.current}</button>
```

## Options

```ts
const state = new PersistedState("key", initialValue, {
  storage: "session", // 'local' (default) or 'session'
  syncTabs: false, // Cross-tab sync (default: true)
  connected: false, // Start disconnected from storage
  serializer: {
    // Custom serializer (e.g. superjson)
    serialize: superjson.stringify,
    deserialize: superjson.parse,
  },
});
```

## API

| Property/Method | Description                          |
| --------------- | ------------------------------------ |
| `.current`      | Access/modify the persisted state    |
| `.connect()`    | Connect to storage (persist changes) |
| `.disconnect()` | Disconnect from storage              |
| `.connected`    | Check connection status              |

## Notes

- Arrays and plain objects persist on mutation (deep reactivity)
- Class instances require full reassignment to persist
- When disconnected, state changes stay in memory only
