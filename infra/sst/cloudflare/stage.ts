export const isPermanentStage = ["prod", "dev"].includes($app.stage);

export const baseDomain = "agents.developing.company"

export const domain = (() => {
  if ($app.stage === "prod") return "agents.developing.company"
  if ($app.stage === "dev") return "dev.agents.developing.company"
  return `${$app.stage}.dev.agents.developing.company`
})()

export function subdomain(name: string) {
  if (isPermanentStage) return $interpolate`${name}.${domain}`;
  return $interpolate`${name}-${domain}`;
}
