const cluster = planetscale.getDatabasePostgresOutput({
  id: "agents",
  organization: "andrebrandao",
})


// const branch =
//   $app.stage === "prod"
//     ? planetscale.getPostgresBranchOutput({
//       id: cluster.defaultBranch,
//       organization: cluster.organization,
//       database: cluster.name,
//     })
//     : new planetscale.PostgresBranch("DatabaseBranch", {
//       database: cluster.name,
//       organization: cluster.organization,
//       name: $app.stage,
//       parentBranch: cluster.defaultBranch,
//     })


const branch = planetscale.getPostgresBranchOutput({
  id: cluster.defaultBranch,
  organization: cluster.organization,
  database: cluster.name,

})


const role = new planetscale.PostgresBranchRole("DatabaseRole", {
  database: cluster.name,
  organization: cluster.organization,
  branch: branch.name,
  name: `${$app.name}-${$app.stage}`,
  inheritedRoles: [
    "pg_read_all_data",
    "pg_write_all_data",
    // "postgres", // Only needed for pushing schema changes
  ],

})

export const hyperdrive = new sst.cloudflare.Hyperdrive("HYPERDRIVE", {
  origin: {
    host: role.accessHostUrl,
    database: role.databaseName,
    user: role.username,
    password: role.password,
    port: 6432, // Use 5432 for direct connection instead of PgBouncer
    scheme: "postgres",
  },
  caching: false,
})


export const database = new sst.Linkable("Database", {
  properties: {
    host: role.accessHostUrl,
    database: cluster.name,
    username: role.username,
    password: role.password,
    port: 5432,
    url: $interpolate`postgresql://${role.username}:${role.password}@${role.accessHostUrl}/postgres?sslmode=require`,
  },
})
