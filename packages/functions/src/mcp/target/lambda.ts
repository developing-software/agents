import { lambda } from "../../target";
import { Database } from "@agents/core/drizzle";
import { Queue } from "@agents/core/queue";
import { app } from "../index";

export const handler = lambda(app, Queue.provider(Queue.fromEnv(process.env, Database.use)));
