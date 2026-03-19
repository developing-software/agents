import { describe, expect } from "bun:test";
import { Link, ShortLink } from "../src/link";

import { withTestUser } from "./util";
describe("link", () => {
  withTestUser("createLink", async () => {
    const url = "https://example.com/some/long/path";
    const linkID = await Link.create(url);
    const link = await Link.fromID(linkID);
    expect(link).toBeDefined();
    expect(link?.url).toBe(url);
  });

  withTestUser("createShortLink", async () => {
    const url = "https://example.com/some/short/path";
    const slug = "short_example";
    const shortLinkID = await ShortLink.create({
      slug,
      url,
    });
    const shortLink = await ShortLink.fromSlug(slug);
    expect(shortLinkID).toBeDefined();
    expect(shortLink).toBeDefined();
    expect(shortLink?.url).toBe(url);
  });
});
