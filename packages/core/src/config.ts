import z from "zod";

const Config = z.object({
  database: z.object({
    url: z.string().default("postgres://postgres:postgres@localhost:5432/app_development"),
  }),
  redis: z.object({
    url: z.string().default("redis://localhost:6379"),
  }),
  bus: z.object({
    type: z.enum(["memory", "redis"]).default("memory"),
  }),
  api: z.object({
    key: z.string().default("dev_key_12345"),
    url: z.string().default("http://localhost:3000"),
  }),
});

type Config = z.infer<typeof Config>;

const { data: config, error: err } = Config.safeParse({
  database: { url: process.env.DATABASE_URL },
  redis: { url: process.env.REDIS_URL },
  bus: { type: process.env.BUS_TYPE },
  api: { key: process.env.API_KEY, url: process.env.API_URL },
});

if (err) {
  console.error("Invalid configuration:", z.treeifyError(err));
  throw new Error("Invalid configuration");
}

export default config;
