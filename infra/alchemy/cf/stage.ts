// The main stack owns the base domain; terraform sits one label below it (`tf.`), so the
// two never contend for a hostname.
const base = "agents.v2.developing.company";

export const permanent = (stage: string) => ["prod", "dev"].includes(stage);

export function host(name: string, stage: string) {
  if (stage === "prod") return `${name}.${base}`;
  if (stage === "dev") return `${name}.dev.${base}`;
  return `${name}.${stage}.dev.${base}`;
}
