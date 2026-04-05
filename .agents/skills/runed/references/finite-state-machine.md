# FiniteStateMachine

A strongly-typed finite state machine for managing state transitions.

## Basic Usage

```ts
import { FiniteStateMachine } from "runed";

type States = "on" | "off";
type Events = "toggle";

const fsm = new FiniteStateMachine<States, Events>("off", {
  off: { toggle: "on" },
  on: { toggle: "off" },
});

fsm.send("toggle"); // -> "on"
fsm.current; // "on"
```

## Conditional Transitions (Actions)

```ts
const fsm = new FiniteStateMachine<States, Events>("off", {
  off: {
    toggle: () => {
      if (canActivate) return "on";
      // return nothing to prevent transition
    },
  },
  on: { toggle: "off" },
});
```

## Lifecycle Methods

```ts
const fsm = new FiniteStateMachine<States, Events>("off", {
  off: {
    toggle: "on",
    _enter: (meta) => console.log("entered off"),
    _exit: (meta) => console.log("leaving off"),
  },
  on: { toggle: "off" },
});
```

Meta object: `{ from, to, event, args }`

## Wildcard Handlers

```ts
"*": { emergency: "off" } // matches any state
```

## Debounced Events

```ts
fsm.debounce(5000, "toggle"); // fire "toggle" after 5s
```

## API

| Property/Method                | Description                |
| ------------------------------ | -------------------------- |
| `current`                      | Current state (reactive)   |
| `send(event, ...args)`         | Trigger an event           |
| `debounce(ms, event, ...args)` | Schedule event after delay |
