export const baseDomain = "agents.developing.company"

export const domain = (() => {
  if ($app.stage === "prod") return baseDomain
  if ($app.stage === "dev") return "dev.agents.developing.company"
  return `${$app.stage}.agents.developing.company`
})()
