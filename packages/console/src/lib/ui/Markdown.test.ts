/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/svelte";

import Markdown from "./Markdown.svelte";

describe("Markdown", () => {
  test("renders basic markdown content", () => {
    render(Markdown, {
      source: [
        "# Title",
        "",
        "Paragraph with a [link](https://example.com).",
        "",
        "- first item",
        "- second item",
        "",
        "```ts",
        "const answer = 42;",
        "```",
      ].join("\n"),
    });

    const heading = screen.getByRole("heading", { level: 1, name: "Title" });
    const link = screen.getByRole("link", { name: "link" });

    expect(heading.textContent).toBe("Title");
    expect(document.body.textContent).toContain("Paragraph with a");
    expect(document.body.textContent).toContain("first item");
    expect(document.body.textContent).toContain("second item");
    expect(document.body.textContent).toContain("const answer = 42;");
    expect(link.getAttribute("href")).toBe("https://example.com");
  });

  test("renders the provided markdown source", () => {
    const { unmount } = render(Markdown, { source: "## First heading" });
    expect(screen.queryByRole("heading", { level: 2, name: "Updated heading" })).toBeNull();

    unmount();
    render(Markdown, { source: "## Updated heading" });
    expect(screen.queryByRole("heading", { level: 2, name: "First heading" })).toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: "Updated heading" }).textContent,
    ).toBe("Updated heading");
  });
});
