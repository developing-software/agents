import { Email } from "./index";
import { User } from "../user/index";

export namespace Template {
  export async function sendInvite(input: {
    email: string;
    workspaceName: string;
    inviterEmail: string;
  }) {
    const subject = `You've been invited to ${input.workspaceName}`;

    const body = [
      `${input.inviterEmail} has invited you to join ${input.workspaceName} on Developing Agents.`,
      ``,
      `Sign in at https://agents.developing.company to accept the invitation.`,
      ``,
      `If you weren't expecting this, you can ignore this email.`,
    ].join("\n");

    const html = inviteHtml(input);

    await Email.send({ from: "hello", to: input.email, subject, body, html });
  }
  export async function sendWelcome(userID: string) {
    const user = await User.fromID(userID);
    if (!user?.email) return;

    const body = [
      `Hi ${user.name ?? "there"},`,
      ``,
      `Welcome! We're glad to have you on board.`,
      ``,
      `You can now log in and start exploring. If you have any questions, just reply to this email.`,
      ``,
      `– The Team`,
    ].join("\n");

    await Email.send({ from: "hello", to: user.email, subject: "Welcome!", body });
  }

  export async function sendProfileUpdated(userID: string) {
    const user = await User.fromID(userID);
    if (!user?.email) return;

    const body = [
      `Hi ${user.name ?? "there"},`,
      ``,
      `Your profile has been updated successfully.`,
      ``,
      `If you didn't make this change, please contact us immediately by replying to this email.`,
      ``,
      `– The Team`,
    ].join("\n");

    await Email.send({ from: "hello", to: user.email, subject: "Your profile was updated", body });
  }

  export async function sendLoginCode(email: string, code: string) {
    const body = [`Your login code is ${code}`].join("\n");

    await Email.send({ from: "auth", to: email, subject: "Login code", body });
  }
}

function inviteHtml(input: { workspaceName: string; inviterEmail: string }) {
  const consoleUrl = "https://agents.developing.company";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Workspace Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
  <tr>
    <td style="padding:32px 40px 0">
      <h1 style="margin:0 0 4px;font-size:20px;font-weight:600;color:#18181b">Developing Agents</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 40px 0">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46">
        <strong>${escapeHtml(input.inviterEmail)}</strong> has invited you to join
        <strong>${escapeHtml(input.workspaceName)}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46">
        Sign in to accept the invitation and start collaborating.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 32px">
      <a href="${consoleUrl}" style="display:inline-block;padding:10px 24px;background:#18181b;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:6px">
        Sign in
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 32px">
      <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa">
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
