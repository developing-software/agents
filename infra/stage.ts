export const domain = (() => {
  if ($app.stage === "prod") return "agents.developing.company"
  if ($app.stage === "dev") return "agents-dev.developing.company"
  return `${$app.stage}-agents-dev.developing.company`
})()
