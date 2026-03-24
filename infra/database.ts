import { DatabaseURL } from "./secrets"

const cluster = planetscale.getDatabaseOutput({
  name: "agents",
  organization: "andrebrandao",
})

// const branch =
//   $app.stage === "prod"
//     ? planetscale.getBranchOutput({
//       name: "main",
//       organization: cluster.organization,
//       database: cluster.name,
//     })
//     : new planetscale.Branch("DatabaseBranch", {
//       database: cluster.name,
//       organization: cluster.organization,
//       name: $app.stage,
//       parentBranch: "main",
//     })

const branch = planetscale.getBranchOutput({
  name: "main",
  organization: cluster.organization,
  database: cluster.name,
})


const hyprdrive = cloudflare.getHyperdriveConfig({
  accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
  hyperdriveId: "ebb41070546a4f5baf5bf1a37877f13c"
})
// // new planetscale.
// const password = new planetscale.

export const database = new sst.Linkable("Database", {
  properties: {
    // host: password.accessHostUrl,
    // database: cluster.name,
    // username: password.username,
    // password: password.plaintext,
    // port: 3306,
    // url: $interpolate`postgresql://${password.username}:${password.plaintext}@${password.accessHostUrl}/${cluster.name}`,
    url: DatabaseURL.value,
  },
})
