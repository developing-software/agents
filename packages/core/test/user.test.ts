import { describe, expect } from "bun:test";
import { User } from "../src/user";
import { withTestWorkspace } from "./util";

describe("user", () => {
  withTestWorkspace("admin user exists after workspace create", async ({ userID }) => {
    const user = await User.fromID(userID);
    expect(user).not.toBeNull();
    expect(user?.role).toBe("admin");
  });
});
