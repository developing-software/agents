import { subscriber } from "@agents/core/bus/index";
import { Bus } from "../bus";
import { User } from "@agents/core/user/index";
import { Actor } from "@agents/core/actor";
import { Log } from "@agents/core/util/log";
import { Template } from "@agents/core/email/template";
const log = Log.create({ namespace: "event" });

// SST alternative — export a Lambda handler instead:
// export const handler = bus.subscriber(
//   [User.Event.Created, User.Event.Updated],
//   async (event) =>
//     Actor.provide(event.metadata.actor.type, event.metadata.actor.properties, async () => {
//       switch (event.type) {
//         case 'user.created': { ... break }
//         case 'user.updated': { ... break }
//       }
//     }),
// )

subscriber(Bus, [User.Event.Created, User.Event.Updated], async (event) =>
  Actor.provide(event.metadata.actor.type, event.metadata.actor.properties, async () => {
    log.info("received", { type: event.name });

    switch (event.name) {
      case "user.created": {
        log.info("user created", { userID: event.payload.userID });
        await Template.sendWelcome(event.payload.userID);
        break;
      }

      case "user.updated": {
        log.info("user updated", { userID: event.payload.userID });
        await Template.sendProfileUpdated(event.payload.userID);
        break;
      }
    }
  }),
);
