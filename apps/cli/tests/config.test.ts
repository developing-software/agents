import { describe, expect, it } from "bun:test";
import * as config from "../src/config";

// The whole suite shares one scratch config file (see tests/setup.ts), so every case
// starts from a known state instead of relying on order.
const fresh = (name: string, cb: () => Promise<void>) =>
  it(name, async () => {
    await config.clear();
    delete process.env.AGENTS_TOKEN;
    delete process.env.API_URL;
    delete process.env.AUTH_URL;
    await cb();
  });

describe("token", () => {
  fresh("prefers the flag over everything else", async () => {
    process.env.AGENTS_TOKEN = "tok_env";
    await config.write({ token: "tok_saved" });
    expect(await config.token("tok_flag")).toBe("tok_flag");
  });

  fresh("falls back to AGENTS_TOKEN before the saved token", async () => {
    process.env.AGENTS_TOKEN = "tok_env";
    await config.write({ token: "tok_saved" });
    expect(await config.token()).toBe("tok_env");
  });

  fresh("falls back to the saved token before the OAuth access token", async () => {
    await config.write({ token: "tok_saved", access: "oauth-access" });
    expect(await config.token()).toBe("tok_saved");
  });

  // No refresh token or no issuer means there is nothing to refresh against.
  fresh("returns the saved access token as-is when it cannot be refreshed", async () => {
    await config.write({ access: "oauth-access" });
    expect(await config.token()).toBe("oauth-access");

    await config.write({ access: "oauth-access", refresh: "oauth-refresh" });
    expect(await config.token()).toBe("oauth-access");
  });

  fresh("is undefined with nothing on file", async () => {
    expect(await config.token()).toBeUndefined();
  });
});

describe("url", () => {
  fresh("resolves flag › API_URL › saved › default", async () => {
    await config.write({ url: "http://saved" });
    process.env.API_URL = "http://env";
    expect(await config.url("http://flag")).toBe("http://flag");
    expect(await config.url()).toBe("http://env");
    delete process.env.API_URL;
    expect(await config.url()).toBe("http://saved");
    await config.clear();
    expect(await config.url()).toBe(config.DEFAULT_URL);
  });
});

describe("issuer", () => {
  fresh("resolves flag › AUTH_URL › saved › default", async () => {
    await config.write({ issuer: "http://saved" });
    process.env.AUTH_URL = "http://env";
    expect(await config.issuer("http://flag")).toBe("http://flag");
    expect(await config.issuer()).toBe("http://env");
    delete process.env.AUTH_URL;
    expect(await config.issuer()).toBe("http://saved");
    await config.clear();
    expect(await config.issuer()).toBe(config.DEFAULT_ISSUER);
  });
});

describe("write and clear", () => {
  fresh("overwrites rather than merges", async () => {
    await config.write({ token: "tok_1", url: "http://u" });
    await config.write({ url: "http://u" });
    expect(await config.token()).toBeUndefined();
  });

  fresh("clear is a no-op when already gone", async () => {
    await config.write({ token: "tok_1" });
    await config.clear();
    await config.clear();
    expect(await config.token()).toBeUndefined();
  });
});
