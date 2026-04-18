import type { Email } from "./index";

/** Minimal shape of the CF Workers `SendEmail` binding. */
interface SendEmailBinding {
  send(message: {
    from: string;
    to: string | string[];
    subject: string;
    text?: string;
    attachments?: {
      content: string;
      filename: string;
      type: string;
      disposition: "attachment" | "inline";
    }[];
  }): Promise<unknown>;
}

export function createCloudflareSender(binding: SendEmailBinding): Email.Sender {
  return {
    async send({ from, to, subject, body, attachments }) {
      await binding.send({
        from,
        to,
        subject,
        text: body,
        attachments: attachments?.map((a) => ({
          content: a.content,
          filename: a.filename,
          type: a.contentType ?? "application/octet-stream",
          disposition: "attachment" as const,
        })),
      });
    },
  };
}
