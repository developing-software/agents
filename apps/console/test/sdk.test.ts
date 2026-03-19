import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { app } from "@agents/functions/src/api/routes";
import { User } from "@agents/core/user/index";
import { Api } from "@agents/core/api/api";
import { Actor } from "@agents/core/actor";
import { DevAgentSdk } from "@agents/sdk/src/agents";
import { createClient } from "@agents/sdk/src/agents/client";

// Route the Hono app the same way the console does
const api = new Hono().route("/api", app);

let userID: string;
let token: string;
let appID: string;
let tokenID: string;
let sdk: DevAgentSdk;

beforeAll(async () => {
  userID = await User.create({
    email: `test+${Date.now()}@example.com`,
    username: "sdktestuser",
  });

  const pat = await Actor.provide("user", { userID, clientID: "test" }, () =>
    Api.Personal.create(),
  );
  token = pat.token;

  sdk = new DevAgentSdk({
    client: createClient({
      auth: () => token,
      baseUrl: "http://localhost/api",
      fetch: (input, init) => Promise.resolve(api.fetch(new Request(input, init as RequestInit))),
    }),
  });
});

afterAll(async () => {
  // Clean up token and user created during setup
  if (tokenID) {
    await Actor.provide("user", { userID, clientID: "test" }, () => Api.Personal.remove(tokenID));
  }
  // Delete the personal access token used to auth
  const pat = await Actor.provide("user", { userID, clientID: "test" }, () => Api.Personal.list());
  for (const t of pat) {
    await Actor.provide("user", { userID, clientID: "test" }, () => Api.Personal.remove(t.id));
  }
});

describe("profile", () => {
  test("getProfile returns the current user", async () => {
    const { data, error } = await sdk.getProfile();
    expect(error).toBeUndefined();
    expect(data?.data?.user.id).toBe(userID);
  });

  test("putProfile updates name and email", async () => {
    const { data, error } = await sdk.putProfile({
      body: { name: "SDK Test", email: `updated+${Date.now()}@example.com` },
    });
    expect(error).toBeUndefined();
    expect(data?.data?.user.name).toBe("SDK Test");
  });
});

describe("apps", () => {
  test("getApp returns empty list initially", async () => {
    const { data, error } = await sdk.getApp();
    expect(error).toBeUndefined();
    expect(Array.isArray(data?.data)).toBe(true);
  });

  test("postApp creates an app", async () => {
    const { data, error } = await sdk.postApp({
      body: { name: "Test App", redirectURI: "http://localhost/callback" },
    });
    expect(error).toBeUndefined();
    expect(data?.data?.id).toBeDefined();
    appID = data!.data!.id;
  });

  test("getApp lists the created app", async () => {
    const { data } = await sdk.getApp();
    expect(data?.data?.some((a) => a.id === appID)).toBe(true);
  });

  test("getAppById returns the app", async () => {
    const { data, error } = await sdk.getAppById({ path: { id: appID } });
    expect(error).toBeUndefined();
    expect(data?.data?.id).toBe(appID);
  });

  test("deleteAppById removes the app", async () => {
    const { data, error } = await sdk.deleteAppById({ path: { id: appID } });
    expect(error).toBeUndefined();
    expect(data?.data).toBe("ok");
  });
});

describe("tokens", () => {
  test("getToken returns list of tokens", async () => {
    const { data, error } = await sdk.getToken();
    expect(error).toBeUndefined();
    expect(Array.isArray(data?.data)).toBe(true);
  });

  test("postToken creates a token", async () => {
    const { data, error } = await sdk.postToken();
    expect(error).toBeUndefined();
    expect(data?.data?.token).toStartWith("tok_");
    tokenID = data!.data!.id;
  });

  test("getTokenById returns the token", async () => {
    const { data, error } = await sdk.getTokenById({ path: { id: tokenID } });
    expect(error).toBeUndefined();
    expect(data?.data?.id).toBe(tokenID);
  });

  test("deleteTokenById removes the token", async () => {
    const { data, error } = await sdk.deleteTokenById({ path: { id: tokenID } });
    expect(error).toBeUndefined();
    expect(data?.data).toBe("ok");
    tokenID = ""; // mark as already deleted so afterAll skips it
  });
});

describe("auth errors", () => {
  test("returns 401 with invalid token", async () => {
    const badSdk = new DevAgentSdk({
      client: createClient({
        auth: () => "tok_invalid",
        baseUrl: "http://localhost/api",
        fetch: (input, init) => Promise.resolve(api.fetch(new Request(input, init as RequestInit))),
      }),
    });
    const { error } = await badSdk.getProfile();
    expect(error).toBeDefined();
  });
});
