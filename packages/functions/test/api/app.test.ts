import { describe, expect } from "bun:test";
import { setupApiTest } from "./util";
import { Api } from "@agents/core/api/api";
import { Examples } from "@agents/core/examples";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("app", () => {
  test("GET /app", async () => {
    const response = await validateOpenAPIRoute("get", "/app");
    expect(response).toBeArray();
  });

  test("GET /app/:id", async () => {
    const appID = await Api.Client.create({
      name: Examples.App.name,
      redirectURI: Examples.App.redirectURI,
    }).then((r) => r.id);
    const response = await validateOpenAPIRoute("get", "/app/:id", {
      id: appID,
    });
    expect(response.id).toBe(appID);
    expect(response.name).toBe(Examples.App.name);
  });

  test("POST /app", async () => {
    const response = await validateOpenAPIRoute("post", "/app", undefined, {
      name: Examples.App.name,
      redirectURI: Examples.App.redirectURI,
    });
    const created = await Api.Client.fromID(response.id);
    expect(created).toBeDefined();
    expect(created!.name).toBe(Examples.App.name);
  });

  test("DELETE /address/:id", async () => {
    const appID = await Api.Client.create({
      name: Examples.App.name,
      redirectURI: Examples.App.redirectURI,
    }).then((r) => r.id);
    await validateOpenAPIRoute("delete", "/app/:id", {
      id: appID,
    });
    const deleted = await Api.Client.fromID(appID);
    expect(deleted).toBeUndefined();
  });
});
