import { bun } from "../../target";
import { server } from "../index";

const port = Number(process.env.API_PORT) || 3000;
console.log(`API running at http://localhost:${port}/api`);

export default bun(server, port);
