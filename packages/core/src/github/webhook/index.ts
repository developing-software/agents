import { Webhooks, type EmitterWebhookEventName, type EmitterWebhookEvent } from "@octokit/webhooks";
import { ErrorCodes, VisibleError } from "../../error";
import { registerHandlers } from "./handlers";

export namespace GitHubWebhook {
  let instance: Webhooks | undefined;

  export function init(secret: string): void {
    instance = new Webhooks({ secret });
    registerHandlers(GitHubWebhook);
  }

  function getInstance(): Webhooks {
    if (!instance) throw new Error("GitHubWebhook not initialized — call GitHubWebhook.init(secret) at startup");
    return instance;
  }

  export function on<E extends EmitterWebhookEventName>(
    eventName: E,
    handler: (event: EmitterWebhookEvent<E>) => Promise<void> | void,
  ): void {
    getInstance().on(eventName, handler);
  }

  export async function verifyAndReceive(params: {
    id: string;
    name: string;
    rawBody: string;
    signature: string;
  }): Promise<void> {
    try {
      await getInstance().verifyAndReceive({
        id: params.id,
        name: params.name as EmitterWebhookEventName,
        payload: params.rawBody,
        signature: params.signature,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("signature")) {
        throw new VisibleError(
          "authentication",
          ErrorCodes.Authentication.UNAUTHORIZED,
          "Invalid webhook signature",
        );
      }
      throw error;
    }
  }
}
