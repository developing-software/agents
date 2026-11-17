// fallow-ignore-file code-duplication
import { Email } from "./index";
import { bold, button, code, head, preview, render, rule, small, text } from "./render";
import { eq } from "drizzle-orm";
import { Central } from "../../drizzle/central";
import { Identity } from "../../identity";
import { User } from "../../user";
import { WorkspaceTable } from "../../platform/workspace/workspace.central";
import { Workspace } from "../../workspace";

/**
 * `Render` builds a mail, `Send` addresses one. Rendering takes no IO, so a mail can be read
 * without a driver.
 */
export namespace Template {
  export namespace Render {
    export function welcome(name: string) {
      return {
        subject: "Welcome!",
        ...render([
          preview("You're in — here's how to get started."),
          head(`Hi ${name},`),
          text("Welcome! We're glad to have you on board."),
          text(
            "You can now log in and start exploring. If you have any questions, just reply to this email.",
          ),
          rule(),
          small("– The Team"),
        ]),
      };
    }

    export function loginCode(otp: string) {
      return {
        subject: `Your login code: ${otp}`,
        ...render([
          preview(`${otp} — expires shortly`),
          head("Your login code"),
          code(otp),
          text("It expires shortly. If you didn't request it, you can ignore this email."),
          rule(),
          small("– The Team"),
        ]),
      };
    }

    export type Invite = { workspace: string; inviter: string; role: string; url: string };

    export function invite(input: Invite) {
      return {
        subject: `${input.inviter} invited you to ${input.workspace}`,
        ...render([
          preview(`Join ${input.workspace} as ${input.role}.`),
          head(`You're invited to ${input.workspace}`),
          text(bold(input.inviter), ` invited you to join as ${input.role}.`),
          text("Sign in with this address and the workspace is waiting for you."),
          button("Accept invite", input.url),
          small("If you weren't expecting this, you can ignore it: nothing happens until you sign in."),
          rule(),
          small("– The Team"),
        ]),
      };
    }

    export function profileUpdated(name: string) {
      return {
        subject: "Your profile was updated",
        ...render([
          preview("Your profile details changed."),
          head(`Hi ${name},`),
          text("Your profile has been updated successfully."),
          text(
            "If you didn't make this change, please contact us immediately by replying to this email.",
          ),
          rule(),
          small("– The Team"),
        ]),
      };
    }
  }

  export namespace Send {
    export async function welcome(userID: string) {
      const user = await User.fromID(userID);
      if (!user?.email) return;

      await Email.send({ to: user.email, ...Render.welcome(user.name ?? "there") });
    }

    export async function loginCode(email: string, otp: string) {
      await Email.send({ to: email, ...Render.loginCode(otp) });
    }

    /** From whoever is acting, into the workspace the request runs in. */
    export async function invite(email: string, role: string) {
      const schema = Workspace.here()?.schema;
      if (!schema) return;
      const [inviter, workspace] = await Promise.all([
        User.fromID(Identity.userID()),
        Central.use((tx) =>
          tx
            .select({ name: WorkspaceTable.name })
            .from(WorkspaceTable)
            .where(eq(WorkspaceTable.schema, schema))
            .then((rows) => rows.at(0)),
        ),
      ]);
      await Email.send({
        to: email,
        ...Render.invite({
          workspace: workspace?.name ?? "a workspace",
          inviter: inviter?.name ?? "Someone",
          role,
          url: `${process.env.ORIGIN ?? "http://localhost:5173"}/login`,
        }),
      });
    }

    export async function updated(userID: string) {
      const user = await User.fromID(userID);
      if (!user?.email) return;

      await Email.send({ to: user.email, ...Render.profileUpdated(user.name ?? "there") });
    }
  }

  // === DEV ===

  /**
   * Not used in production. Every template paired with props to stand it up, so the preview at
   * /dev/mail can enumerate them — add a mail, add a row, and it shows up there.
   */
  export const _list = [
    {
      name: "welcome",
      label: "Welcome",
      blurb: "Sent once, the first time an account appears.",
      render: () => Render.welcome("Ada"),
    },
    {
      name: "login",
      label: "Login code",
      blurb: "The six-digit code behind passwordless sign-in.",
      render: () => Render.loginCode("482913"),
    },
    {
      name: "invite",
      label: "Workspace invite",
      blurb: "Offers a seat in a workspace; signing in with the address claims it.",
      render: () =>
        Render.invite({
          workspace: "Acme",
          inviter: "Grace",
          role: "member",
          url: "https://example.com/login",
        }),
    },
    {
      name: "updated",
      label: "Profile updated",
      blurb: "Confirms a change the user just made.",
      render: () => Render.profileUpdated("Ada"),
    },
  ];
}
