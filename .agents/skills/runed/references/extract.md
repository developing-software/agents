# extract

Resolves either a getter function or a static value to a plain value. Useful in utility functions that accept both reactive and static inputs.

## Usage

```ts
import { extract } from "runed";

function throwConfetti(intervalProp?: MaybeGetter<number | undefined>) {
  const interval = $derived(extract(intervalProp, 100));
  // interval is 100 if intervalProp is undefined
  // interval is the value if intervalProp is a value
  // interval is the return value if intervalProp is a getter
}
```

## Behavior

| Input                        | Result                |
| ---------------------------- | --------------------- |
| Static value                 | Returns value         |
| `undefined`                  | Returns fallback      |
| Getter returning value       | Returns getter result |
| Getter returning `undefined` | Returns fallback      |
