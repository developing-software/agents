import { z } from "zod";
import { Hono } from "hono";
import { validator, PaginatedQuery, authRequired } from "../common";
import { describe } from "../doc";
import { Issue } from "@agents/core/issue";
import { Link } from "@agents/core/util/meta";

export namespace IssueApi {
  const doc = describe("Issue");
  const Identifier = z.object({ id: Issue.Info.shape.id });
  // The query string hands `unscheduled` over as text.
  const List = PaginatedQuery(Issue.list.schema).extend({
    unscheduled: z.preprocess(
      (value) => (value === "true" || value === "false" ? value === "true" : value),
      Issue.list.schema.shape.unscheduled,
    ),
  });

  export const route = new Hono()
    .get(
      "/",
      doc(Issue.list.meta, {
        200: doc.page(Issue.Info),
        ...doc.errors(400, 401, 403, 500),
      }),
      authRequired,
      validator("query", List),
      async (c) => c.json(await Issue.list(c.req.valid("query")), 200),
    )
    .get(
      "/stage",
      doc(Issue.stages.meta, {
        200: doc.list(Issue.Stage),
        ...doc.errors(400, 401, 403, 500),
      }),
      authRequired,
      validator("query", Issue.stages.schema),
      async (c) => c.json(await Issue.stages(c.req.valid("query")), 200),
    )
    .patch(
      "/stage",
      doc(Issue.rename.meta, {
        200: doc.ok,
        ...doc.errors(400, 401, 403, 500),
      }),
      authRequired,
      validator("json", Issue.rename.schema),
      async (c) => {
        await Issue.rename(c.req.valid("json"));
        return c.json("ok" as const, 200);
      },
    )
    .get(
      "/:id",
      doc(Issue.fromID.meta, {
        200: doc.json(Issue.Info),
        ...doc.errors(400, 401, 403, 404, 500),
      }),
      authRequired,
      validator("param", Identifier),
      async (c) => c.json(await Issue.assert.exists(Issue.fromID(c.req.valid("param").id)), 200),
    )
    .post(
      "/",
      doc(Issue.create.meta, {
        200: doc.json(Issue.Info),
        ...doc.errors(400, 401, 403, 500),
      }),
      authRequired,
      validator("json", Issue.create.schema),
      async (c) => c.json(await Issue.create(c.req.valid("json")), 200),
    )
    .patch(
      "/:id",
      doc(Issue.update.meta, {
        200: doc.json(Issue.Info),
        ...doc.errors(400, 401, 403, 404, 500),
      }),
      authRequired,
      validator("param", Identifier),
      validator("json", Issue.update.schema.omit({ id: true })),
      async (c) => {
        const { id } = c.req.valid("param");
        await Issue.update({ id, ...c.req.valid("json") });
        return c.json(await Issue.assert.exists(Issue.fromID.force(id)), 200);
      },
    )
    .post(
      "/:id/move",
      doc(Issue.move.meta, {
        200: doc.json(Issue.Info),
        ...doc.errors(400, 401, 403, 404, 500),
      }),
      authRequired,
      validator("param", Identifier),
      validator("json", Issue.move.schema.omit({ id: true })),
      async (c) => {
        const { id } = c.req.valid("param");
        await Issue.move({ id, ...c.req.valid("json") });
        return c.json(await Issue.assert.exists(Issue.fromID.force(id)), 200);
      },
    )
    .post(
      "/:id/link",
      doc(Issue.link.meta, {
        200: doc.json(Issue.Info),
        ...doc.errors(400, 401, 403, 404, 500),
      }),
      authRequired,
      validator("param", Identifier),
      validator("json", Link),
      async (c) =>
        c.json(await Issue.link({ id: c.req.valid("param").id, ...c.req.valid("json") }), 200),
    )
    .delete(
      "/:id/link",
      doc(Issue.unlink.meta, {
        200: doc.json(Issue.Info),
        ...doc.errors(400, 401, 403, 404, 500),
      }),
      authRequired,
      validator("param", Identifier),
      validator("query", Issue.unlink.schema.omit({ id: true })),
      async (c) =>
        c.json(await Issue.unlink({ id: c.req.valid("param").id, ...c.req.valid("query") }), 200),
    )
    .delete(
      "/:id",
      doc(Issue.remove.meta, {
        200: doc.ok,
        ...doc.errors(400, 401, 403, 404, 500),
      }),
      authRequired,
      validator("param", Identifier),
      async (c) => {
        await Issue.remove(c.req.valid("param").id);
        return c.json("ok" as const, 200);
      },
    );
}
