import { Context } from "../context";
import { Log } from "../util/log";

const SENDER_EMAIL_DOMAIN = process.env.SENDER_EMAIL_DOMAIN ?? "mail.example.com";

const log = Log.create({ namespace: "email" });

export namespace Email {
  export type Attachment = {
    filename: string;
    content: string;
    contentType?: string;
  };

  export interface Sender {
    send(input: {
      from: string;
      to: string | string[];
      subject: string;
      body: string;
      attachments?: Attachment[];
    }): Promise<void>;
  }

  const ctx = Context.create<Sender>();

  export function provide<R>(sender: Sender, fn: () => R): R {
    return ctx.provide(sender, fn);
  }

  let fallback: Promise<Sender> | undefined;

  export function use(): Sender {
    try {
      return ctx.use();
    } catch (err) {
      if (!(err instanceof Context.NotFound)) throw err;
      throw new Error("No email sender provided. Use Email.provide() to set one.");
    }
  }

  async function getResendFallback(): Promise<Sender> {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    return {
      async send({ from, to, subject, body, attachments }) {
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
      },
    };
  }

  async function getSender(): Promise<Sender> {
    try {
      return ctx.use();
    } catch (err) {
      if (!(err instanceof Context.NotFound)) throw err;
      log.warn("no email context, falling back to resend");
      fallback ??= getResendFallback();
      return fallback;
    }
  }

  export async function send(
    from: string,
    to: string | string[],
    subject: string,
    body: string,
    attachments?: Attachment[],
  ) {
    from = `Developing Agents <no.reply@agents.developing.company>`;
    log.info("sending email", { subject, from, to });
    try {
      const sender = await getSender();
      await sender.send({ from, to, subject, body, attachments });
    } catch (err) {
      log.warn("failed to send email", { err: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }
}
