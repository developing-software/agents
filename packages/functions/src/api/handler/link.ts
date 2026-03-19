// import "zod-openapi/extend";
import { Link, ShortLink } from "@agents/core/link/index";
import { Hono } from "hono";
// import { handle, streamHandle } from "hono/aws-lambda";
// import { Resource } from "sst";

export namespace LinkApi {
  export const routes = new Hono().get("/:id", async (ctx) => {
    const id = ctx.req.param("id");
    // const siteUrl = Resource.Urls.site;
    // const siteUrl = "https://example.com";
    const siteUrl = new URL(ctx.req.url).host;

    // Check permanent short links first
    const shortLink = await ShortLink.fromSlug(id);
    if (shortLink) {
      // Fire-and-forget click tracking
      ShortLink.incrementClick(id).catch(() => {});
      return ctx.redirect(shortLink.url);
    }

    // Fall back to expiring links
    const link = await Link.fromID(id);
    if (!link || link.expires < new Date()) {
      return ctx.redirect(siteUrl + "/" + id);
    }
    return ctx.redirect(link.url);
  });
}

// export const handler = process.env.SST_LIVE ? handle(app) : streamHandle(app);
