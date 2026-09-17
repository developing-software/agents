import { describe, expect, test } from "bun:test";
import { parseClaudeOutput } from "../src/extractors/claude";
import { parseCodexRollout } from "../src/extractors/codex";
import { parseOpencodeSession } from "../src/extractors/opencode";
import { sumNumstat } from "../src/git";
import { titleFromPrompt } from "../src/report";

describe("titleFromPrompt", () => {
  test("uses the first non-empty line without markdown heading", () => {
    expect(titleFromPrompt("\n# Add login page\n\nDetails", "claude")).toBe(
      "claude: Add login page",
    );
  });

  test("falls back when prompt is empty", () => {
    expect(titleFromPrompt("", "codex")).toBe("codex: agent changes");
  });
});

describe("sumNumstat", () => {
  test("sums text files and skips binaries", () => {
    expect(sumNumstat("3\t1\ta.ts\n-\t-\timg.png\n10\t0\tb.ts\n")).toEqual({
      linesAdded: 13,
      linesRemoved: 1,
    });
  });
});

describe("parseClaudeOutput", () => {
  test("parses stream-json lines", () => {
    const raw = [
      JSON.stringify({ type: "system", subtype: "init", model: "claude-sonnet-4-6" }),
      "not json",
      JSON.stringify({ type: "result", result: "done", num_turns: 3 }),
    ].join("\n");
    const entries = parseClaudeOutput(raw);
    expect(entries).toHaveLength(2);
    expect(entries.at(-1).result).toBe("done");
  });

  test("parses a JSON array", () => {
    expect(parseClaudeOutput('[{"type":"result"}]')).toHaveLength(1);
  });
});

describe("parseCodexRollout", () => {
  test("reads last token usage, model and turns", () => {
    const raw = [
      JSON.stringify({ type: "session_meta", payload: { id: "s1" } }),
      JSON.stringify({ type: "turn_context", payload: { model: "gpt-5-codex" } }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "token_count",
          info: { total_token_usage: { input_tokens: 10, output_tokens: 5 } },
        },
      }),
    ].join("\n");
    const parsed = parseCodexRollout(raw, null);
    expect(parsed.sessionId).toBe("s1");
    expect(parsed.metrics.model).toBe("gpt-5-codex");
    expect(parsed.metrics.turns).toBe(1);
    expect(parsed.metrics.tokens.input).toBe(10);
  });
});

describe("parseOpencodeSession", () => {
  test("aggregates assistant tokens and cost", () => {
    const parsed = parseOpencodeSession(
      {
        messages: [
          { info: { role: "user" } },
          {
            info: { role: "assistant", tokens: { input: 4, output: 2 }, cost: 0.5, modelID: "m" },
            parts: [{ type: "text", text: "ok" }],
          },
        ],
      },
      null,
    );
    expect(parsed?.metrics.tokens.input).toBe(4);
    expect(parsed?.metrics.cost_usd).toBe(0.5);
    expect(parsed?.finalMessage).toBe("ok");
  });

  test("returns null without assistant messages", () => {
    expect(parseOpencodeSession({ messages: [] }, null)).toBeNull();
  });
});
