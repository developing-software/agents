import { it } from "bun:test";
import { Actor } from "../src/actor";
import { User } from "../src/user";

export function withTestUser(name: string, cb: (id: string) => Promise<any>) {
  return it(name, async () => {
    const user = await User.create({
      // fingerprint: "test+" + nanoid(),
      email: "test@example.com",
    });
    await Actor.provide("system", { userID: user }, async () => {
      await cb(user);
    });
  });
}
