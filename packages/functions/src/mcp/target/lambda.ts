import { lambda } from "../../target";
import { Central } from "@agents/core/drizzle/central";
import { Queue } from "@agents/core/queue";
import { app } from "../index";

export const handler = lambda(app, Queue.provider(Queue.fromEnv(process.env, Central.use)));
