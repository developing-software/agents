import { beforeAll, expect, test as _test, mock } from "bun:test";
import { app } from "../../src/api/routes";
import { User } from "@agents/core/user/index";
import { Api } from "@agents/core/api/api";
import { Actor } from "@agents/core/actor";
import { z } from "zod";

/**
 * Setup API test environment with authentication and utility functions
 */
export function setupApiTest() {
  let userID: string;
  let pat: string;

  const withContext = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    return Actor.Context.provide(
      { type: "user", properties: { userID, clientID: "test-client" } },
      fn,
    );
    // return ProductFilter.provide(
    //   {
    //     region: "na",
    //   },
    //   () => {
    //   },
    // );
  };

  beforeAll(async () => {
    // console.debug = mock();
    console.log = mock();
    console.info = mock();
    console.warn = mock();
    console.error = mock();

    userID = await User.create({ email: "test@example.com" });
    await withContext(async () => {
      pat = await Api.Personal.create().then((r) => r.token);
    });
  });

  /**
   * Make an authenticated GET request
   */
  const get = async (path: string, headers?: Record<string, string>) => {
    return app.request(path, {
      headers: {
        authorization: `Bearer ${pat}`,
        ...headers,
      },
    });
  };

  /**
   * Make an authenticated POST request
   */
  const post = async (path: string, body: any, headers?: Record<string, string>) => {
    return app.request(path, {
      method: "post",
      headers: {
        authorization: `Bearer ${pat}`,
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

  /**
   * Make an authenticated PUT request
   */
  const put = async (path: string, body: any, headers?: Record<string, string>) => {
    return app.request(path, {
      method: "put",
      headers: {
        authorization: `Bearer ${pat}`,
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

  /**
   * Make an authenticated DELETE request
   */
  const del = async (path: string, headers?: Record<string, string>) => {
    return app.request(path, {
      method: "delete",
      headers: {
        authorization: `Bearer ${pat}`,
        ...headers,
      },
    });
  };

  /**
   * Make an unauthenticated request
   */
  const noAuth = (...args: Parameters<typeof app.request>) => app.request(...args);

  /**
   * Run a test with context
   */
  const test = (
    label: string,
    fn: () => void | Promise<unknown>,
    options?: Parameters<typeof _test>[2],
  ) => {
    return _test(label, () => withContext(fn), options);
  };

  const request = async (method: string = "get", path: string, body?: any): Promise<any> => {
    switch (method) {
      case "get":
        return await get(path);
      case "post":
        return await post(path, body);
      case "put":
        return await put(path, body);
      case "delete":
        return await del(path);
      default:
        throw new Error("Method not supported: " + method);
    }
  };

  const validateOpenAPIRoute = async (
    method: "get" | "post" | "put" | "delete" = "get",
    path: string,
    params?: Record<string, string>,
    body?: any,
  ) => {
    // Lazy-load SchemaValidator to avoid circular dependency issues
    const { SchemaValidator } = await import("./schema-validator");

    const originalPath = path.toLowerCase();

    const pathParams = path.split("/").filter((x) => x.startsWith(":"));
    if (pathParams.length > 0) {
      const paramsObj: Record<string, string> = Object.fromEntries(
        pathParams.map((x) => [x.slice(1), params![x.slice(1)]]).filter(([x, y]) => x && y),
      );
      path = path.replace(/:[^/]+/g, (x) => paramsObj[x.slice(1)]!);
    }

    // Get the expected status codes for this route
    const statusCodes = await SchemaValidator.getRouteResponseStatusCodes(originalPath, method);

    // Determine if the route requires authentication based on status codes
    const requiresAuth = statusCodes.includes(401);

    // Test successful response
    const response = await request(method, path, body);
    expect(response.status).toBe(200);
    const data = await SchemaValidator.validateResponse(response, path, method);

    // Test unauthenticated request
    const unauthRes = await noAuth(path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Expect 401 if authenticated, 200 if public route
    if (requiresAuth) {
      expect(unauthRes.status).toBe(401);
    } else {
      expect(unauthRes.status).toBe(200);
    }
    await SchemaValidator.validateResponse(unauthRes, path, method);

    // Test 400 handling if the route defines it
    if (statusCodes.includes(400)) {
      // Create an invalid request body by removing a required field
      const invalidBody = await SchemaValidator.createInvalidRequestBody(originalPath, method);
      if (invalidBody) {
        const badReqRes = await request(method, path, invalidBody);
        expect(badReqRes.status).toBe(400);
        await SchemaValidator.validateResponse(badReqRes, path, method);
      }
    }

    // Test 404 handling if the route defines it
    if (statusCodes.includes(404)) {
      const notFoundPath = originalPath.replace(/:[^/]+/g, "fake-param");
      const notFoundRes = await request(method, notFoundPath, body);
      expect(notFoundRes.status).toBe(404);
      await SchemaValidator.validateResponse(notFoundRes, notFoundPath, method);
    }

    return data;
  };

  /**
   * Result schema helper that matches the API's { data: T } pattern
   */
  const resultSchema = <T extends z.ZodType>(schema: T) => {
    return z.object({
      data: schema,
    });
  };

  /**
   * Validate common error responses
   */
  const expectError = async (response: Response, expectedStatus: number, expectedCode?: string) => {
    expect(response.status).toBe(expectedStatus);

    if (expectedCode) {
      const data = await response.json();
      expect(data).toHaveProperty("code", expectedCode);
    }
  };

  return {
    get,
    post,
    del,
    noAuth,
    test,
    validateOpenAPIRoute,
    resultSchema,
    expectError,
  };
}
