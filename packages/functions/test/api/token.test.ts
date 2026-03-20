import { describe, expect } from "bun:test";
import { setupApiTest } from "./util";
import { Api } from "@agents/core/api/api";
// import { Examples } from "@agents/core/examples";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("token", () => {
  test("GET /token", async () => {
    const response = await validateOpenAPIRoute("get", "/token");
    expect(response).toBeArray();
  });

  test("GET /token/:id", async () => {
    const newToken = await Api.Personal.create();
    const tokenID = newToken.id;
    const response = await validateOpenAPIRoute("get", "/token/:id", {
      id: tokenID,
    });

    expect(response).toBeDefined();
    expect(response.id).toBe(tokenID);

    await Api.Personal.remove(tokenID);
  });

  test("POST /token", async () => {
    const response = await validateOpenAPIRoute("post", "/token");

    expect(response).toBeDefined();
    expect(response.id).toBeDefined();
    expect(response.token).toBeDefined();
    expect(response.token).toMatch(/^tok_/);

    await Api.Personal.remove(response.id);
  });

  test("DELETE /token/:id", async () => {
    const newToken = await Api.Personal.create();
    const tokenID = newToken.id;

    await validateOpenAPIRoute("delete", "/token/:id", {
      id: tokenID,
    });

    const deletedToken = await Api.Personal.fromID(tokenID);
    expect(deletedToken).toBeUndefined();
  });
});
