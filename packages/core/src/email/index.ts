// fallow-ignore-file unused-file -- kept for planned email feature
import { Resend } from "resend";
import { Log } from "../util/log";

const SENDER_EMAIL_DOMAIN = process.env.SENDER_EMAIL_DOMAIN ?? "mail.example.com";

const resend = new Resend(process.env.RESEND_API_KEY);

export namespace Email {
  const log = Log.create({ namespace: "email" });

  export type Attachment = {
    filename: string;
    content: string;
    contentType?: string;
  };

  export async function send(
    from: string,
    to: string | string[],
    subject: string,
    body: string,
    attachments?: Attachment[],
  ) {
    from = `Developing <${from}@${SENDER_EMAIL_DOMAIN}>`;
    log.info("sending email", { subject, from, to });

    await resend.emails.send({
      from,
      to,
      subject,
      text: body,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  }
}
