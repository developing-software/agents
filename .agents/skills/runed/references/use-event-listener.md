# useEventListener

Attaches an automatically-disposed event listener. Useful for document/window listeners or elements you don't directly control.

## Usage

```ts
import { useEventListener } from "runed";

// In a component or class
useEventListener(
  () => document.body,
  "click",
  (e) => console.log("clicked", e.target),
);
```

## In a Class

```ts
import { useEventListener } from "runed";

export class ClickLogger {
  #clicks = $state(0);

  constructor() {
    useEventListener(
      () => document.body,
      "click",
      () => this.#clicks++,
    );
  }

  get clicks() {
    return this.#clicks;
  }
}
```

## API

```ts
useEventListener(
  elementGetter: () => EventTarget,
  eventType: string,
  handler: (event: Event) => void
);
```

- Listener is automatically removed when the component is destroyed or the element reference changes
- Target element is defined using a getter for lazy/dynamic initialization
