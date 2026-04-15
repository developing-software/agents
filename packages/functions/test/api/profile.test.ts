import { describe, expect } from "bun:test";
import { setupApiTest } from "./util";
import { Examples } from "@agents/core/examples";
import { User } from "@agents/core/user";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("profile", () => {
  test("GET /profile", async () => {
    const response = await validateOpenAPIRoute("get", "/profile");
    expect(response).toBeDefined();
    expect(response.user).toBeDefined();
    expect(response.user.id).toBeDefined();
  });

  test("PUT /profile", async () => {
    const profileData = {
      name: "Test User Updated",
      email: "test-updated@example.com",
    };

    const response = await validateOpenAPIRoute("put", "/profile", undefined, profileData);

    expect(response).toBeDefined();
    expect(response.user).toBeDefined();
    expect(response.user.name).toBe(profileData.name);
    expect(response.user.email).toBe(profileData.email);

    // Verify the user was actually updated in the database
    const userId = response.user.id;
    const user = await User.fromID(userId);
    expect(user).toBeDefined();
    expect(user!.name).toBe(profileData.name);
    expect(user!.email).toBe(profileData.email);

    // Reset to original values to clean up
    await User.update({
      id: userId,
      name: Examples.User.name,
      email: Examples.User.email,
    });
  });
});
