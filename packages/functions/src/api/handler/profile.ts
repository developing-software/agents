import { z } from "zod";
import { Result, validator, ErrorResponses, authRequired } from "../common";
import { User } from "@agents/core/user/index";
import { Actor } from "@agents/core/actor";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@agents/core/examples";

export namespace ProfileApi {
  export const Profile = z
    .object({
      user: User.Info,
    })
    .meta({
      ref: "Profile",
      description: "The current user's profile.",
      example: Examples.Profile,
    });

  export const route = new Hono()
    .get(
      "/",
      describeRoute({
        tags: ["Profile"],
        summary: "Get profile",
        description: "Get the current user's profile.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Profile.meta({
                    description: "User profile information.",
                    example: Examples.Profile,
                  }),
                ),
                example: Examples.Profile,
              },
            },
            description: "User profile information.",
          },
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      async (c) => {
        const user = await User.fromID(Actor.userID());
        return c.json({ user }, 200);
      },
    )
    .put(
      "/",
      describeRoute({
        tags: ["Profile"],
        summary: "Update profile",
        description: "Update the current user's profile.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Profile.meta({
                    description: "Updated user profile information.",
                    example: Examples.Profile,
                  }),
                ),
                example: Examples.Profile,
              },
            },
            description: "Updated user profile information.",
          },
          400: ErrorResponses[400],
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator(
        "json",
        z.object({ name: z.string(), email: z.email() }).meta({
          description: "The user's updated profile information.",
          example: { name: Examples.User.name, email: Examples.User.email },
        }),
      ),
      async (c) => {
        const id = Actor.userID();
        await User.update({ id, ...c.req.valid("json") });
        const user = await User.fromID(id);
        return c.json({ user }, 200);
      },
    );
}
