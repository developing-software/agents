import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { app } from "@agents/functions/src/api/routes";
import { User } from "@agents/core/user/index";
import { Api } from "@agents/core/api/api";
import { Actor } from "@agents/core/actor";
import { DevAgentSdk } from "@agents/sdk";
import { createClient } from "@agents/sdk/client";

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
      baseUrl: "http://localhost",
      // @ts-expect-error idk why this is needed
      fetch: (input, init) => app.fetch(new Request(input as string, init as RequestInit)),
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
    expect(data?.user.id).toBe(userID);
  });

  test("putProfile updates name and email", async () => {
    const { data, error } = await sdk.putProfile({
      name: "SDK Test",
      email: `updated+${Date.now()}@example.com`,
    });
    expect(error).toBeUndefined();
    expect(data?.user.name).toBe("SDK Test");
  });
});

describe("apps", () => {
  test("getApp returns empty list initially", async () => {
    const { data, error } = await sdk.getApp();
    expect(error).toBeUndefined();
    expect(Array.isArray(data)).toBe(true);
  });

  test("postApp creates an app", async () => {
    const { data, error } = await sdk.postApp({
      name: "Test App",
      redirectURI: "http://localhost/callback",
    });
    expect(error).toBeUndefined();
    expect(data?.id).toBeDefined();
    appID = data!.id;
  });

  test("getApp lists the created app", async () => {
    const { data } = await sdk.getApp();
    expect(data?.some((a) => a.id === appID)).toBe(true);
  });

  test("getAppById returns the app", async () => {
    const { data, error } = await sdk.getAppById({ id: appID });
    expect(error).toBeUndefined();
    expect(data?.id).toBe(appID);
  });

  test("deleteAppById removes the app", async () => {
    const { data, error } = await sdk.deleteAppById({ id: appID });
    expect(error).toBeUndefined();
    expect(data).toBe("ok");
  });
});

describe("tokens", () => {
  test("getToken returns list of tokens", async () => {
    const { data, error } = await sdk.getToken();
    expect(error).toBeUndefined();
    expect(data).toBeArray();
  });

  test("postToken creates a token", async () => {
    const { data, error } = await sdk.postToken();
    expect(error).toBeUndefined();
    expect(data?.token).toStartWith("tok_");
    tokenID = data!.id;
  });

  test("getTokenById returns the token", async () => {
    const { data, error } = await sdk.getTokenById({ id: tokenID });
    expect(error).toBeUndefined();
    expect(data?.id).toBe(tokenID);
  });

  test("deleteTokenById removes the token", async () => {
    const { data, error } = await sdk.deleteTokenById({ id: tokenID });
    expect(error).toBeUndefined();
    expect(data).toBe("ok");
    tokenID = ""; // mark as already deleted so afterAll skips it
  });
});

describe("auth errors", () => {
  test("returns 401 with invalid token", async () => {
    const badSdk = new DevAgentSdk({
      client: createClient({
        auth: () => "tok_invalid",
        baseUrl: "http://localhost/api",
        // @ts-expect-error idk why this is needed
        fetch: (input, init) => app.fetch(new Request(input as string, init as RequestInit)),
      }),
    });
    const { error } = await badSdk.getProfile();
    expect(error).toBeDefined();
  });
});
