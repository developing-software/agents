import { describe, it, expect } from "bun:test";
import { z } from "zod";
import { Event } from "../src/events";
import { EventRegistry } from "../src/events/registry";

describe("event-registry", () => {
  it("define then create + fromID returns typed data", async () => {
    const Def = EventRegistry.define(
      "test.registry.created",
      z.object({ value: z.number() }),
    );
    const id = await EventRegistry.create(Def, {
      origin: "cli",
      data: { value: 42 },
    });
    const event = await EventRegistry.fromID(Def, id);
    expect(event).toBeDefined();
    expect(event!.data.value).toBe(42);
  });

  it("define rejects duplicate type", () => {
    EventRegistry.define("test.registry.dup", z.object({}));
    expect(() =>
      EventRegistry.define("test.registry.dup", z.object({})),
    ).toThrow(/already registered/);
  });

  it("create throws when data shape does not match schema", async () => {
    const Def = EventRegistry.define(
      "test.registry.strict",
      z.object({ n: z.number() }),
    );
    await expect(
      EventRegistry.create(Def, {
        origin: "cli",
        // @ts-expect-error — intentional mismatch
        data: { n: "not a number" },
      }),
    ).rejects.toThrow();
  });

  it("list returns only events of the registered type with parsed data", async () => {
    const Def = EventRegistry.define(
      "test.registry.listed",
      z.object({ label: z.string() }),
    );
    await EventRegistry.create(Def, { origin: "cli", data: { label: "a" } });
    await EventRegistry.create(Def, { origin: "cli", data: { label: "b" } });

    const rows = await EventRegistry.list(Def, { limit: 10 });
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const r of rows) {
      expect(typeof r.data.label).toBe("string");
    }
  });

  it("fromID returns undefined when the row's type does not match the definition", async () => {
    const Def = EventRegistry.define(
      "test.registry.mismatch",
      z.object({ x: z.number() }),
    );
    const otherId = await Event.create({
      type: "test.registry.other",
      origin: "cli",
      data: { x: 1 },
    });
    const event = await EventRegistry.fromID(Def, otherId);
    expect(event).toBeUndefined();
  });

  it("Event.create still accepts unregistered types", async () => {
    const id = await Event.create({
      type: "test.registry.unregistered",
      origin: "cli",
      data: { arbitrary: true },
    });
    const event = await Event.fromID(id);
    expect(event).toBeDefined();
    expect(event!.type).toBe("test.registry.unregistered");
  });

  it("schemaFor / all expose the registry", () => {
    const Def = EventRegistry.define(
      "test.registry.exposed",
      z.object({ ok: z.boolean() }),
    );
    expect(EventRegistry.schemaFor("test.registry.exposed")).toBe(Def.schema);
    expect(EventRegistry.all().has("test.registry.exposed")).toBe(true);
  });
});
