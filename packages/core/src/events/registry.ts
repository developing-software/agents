import { z } from "zod";
import { Event } from "./index";

export namespace EventRegistry {
  export interface Definition<T extends string = string, S extends z.ZodType = z.ZodType> {
    type: T;
    schema: S;
  }

  const registry = new Map<string, Definition>();

  export function define<T extends string, S extends z.ZodType>(
    type: T,
    schema: S,
  ): Definition<T, S> {
    if (registry.has(type)) {
      throw new Error(`Event type already registered: ${type}`);
    }
    const def: Definition<T, S> = { type, schema };
    registry.set(type, def);
    return def;
  }

  export function schemaFor(type: string): z.ZodType | undefined {
    return registry.get(type)?.schema;
  }

  export function all(): ReadonlyMap<string, Definition> {
    return registry;
  }

  type CreateInput = Parameters<typeof Event.create>[0];

  /** Typed create. Parses `data` against the definition schema; throws on mismatch. */
  export async function create<T extends string, S extends z.ZodType>(
    def: Definition<T, S>,
    input: Omit<CreateInput, "type" | "data"> & { data: z.input<S> },
  ): Promise<string> {
    const data = def.schema.parse(input.data) as Record<string, unknown>;
    return Event.create({ ...input, type: def.type, data });
  }

  /** Typed list — returns events with `.data` parsed via the registered schema. */
  export async function list<T extends string, S extends z.ZodType>(
    def: Definition<T, S>,
    opts: Omit<Parameters<typeof Event.list>[0], "type"> = {},
  ): Promise<Array<Omit<Event.Info, "data"> & { data: z.infer<S> }>> {
    const rows = await Event.list({ ...opts, type: def.type });
    return rows.map((e) => ({ ...e, data: def.schema.parse(e.data) as z.infer<S> }));
  }

  /** Typed fromID — returns `undefined` if the event is missing or the type mismatches. */
  export async function fromID<T extends string, S extends z.ZodType>(
    def: Definition<T, S>,
    id: string,
  ): Promise<(Omit<Event.Info, "data"> & { data: z.infer<S> }) | undefined> {
    const row = await Event.fromID(id);
    if (!row || row.type !== def.type) return undefined;
    return { ...row, data: def.schema.parse(row.data) as z.infer<S> };
  }
}
