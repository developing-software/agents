import type { Routes } from ".";
import { hc } from "hono/client";

// const client = hc<Routes>("http://localhost:8787/", {
//   init: {
//     credentials: "include",
//   },
// });

// const {data, } = await res.json()
// import { app } from './app'
// import { hc } from 'hono/client'

export type Client = ReturnType<typeof hc<Routes>>;

export const hcWithType = (...args: Parameters<typeof hc>): Client => hc<Routes>(...args);
