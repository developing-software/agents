import { describe, expect, test } from "bun:test";
import { Prompt } from "../src/util/prompt";

describe("Prompt.render", () => {
  test("replaces single placeholder", () => {
    expect(Prompt.render("hello {{name}}", { name: "world" })).toBe("hello world");
  });

  test("replaces multiple placeholders", () => {
    const out = Prompt.render("{{a}} + {{b}} = {{c}}", { a: 1, b: 2, c: 3 });
    expect(out).toBe("1 + 2 = 3");
  });

  test("replaces the same placeholder in multiple positions", () => {
    expect(Prompt.render("{{x}}-{{x}}-{{x}}", { x: "a" })).toBe("a-a-a");
  });

  test("tolerates whitespace inside braces", () => {
    expect(Prompt.render("hi {{ name }}", { name: "dev" })).toBe("hi dev");
  });

  test("coerces numbers to string", () => {
    expect(Prompt.render("n={{n}}", { n: 42 })).toBe("n=42");
  });

  test("missing var expands to empty string", () => {
    expect(Prompt.render("a={{a}} b={{b}}", { a: "x" })).toBe("a=x b=");
  });

  test("leaves non-placeholder braces untouched", () => {
    expect(Prompt.render("code: { foo: 1 }", {})).toBe("code: { foo: 1 }");
    expect(Prompt.render("{{a}} {not a var}", { a: "ok" })).toBe("ok {not a var}");
  });

  test("does not re-expand replacement content (no recursive substitution)", () => {
    expect(Prompt.render("{{x}}", { x: "{{y}}" })).toBe("{{y}}");
  });

  test("empty template returns empty string", () => {
    expect(Prompt.render("", { a: "x" })).toBe("");
  });

  test("empty vars object leaves all placeholders empty", () => {
    expect(Prompt.render("x={{x}}", {})).toBe("x=");
  });
});
