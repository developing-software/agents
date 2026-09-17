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
    port: 5432, // Use 5432 for direct connection instead of PgBouncer(6432)
    url: $interpolate`postgresql://${role.username}:${role.password}@${role.accessHostUrl}/postgres?sslmode=require`,
  },
})


const migrator_role = new planetscale.PostgresBranchRole("DatabaseMigratorRole", {
  database: cluster.name,
  organization: cluster.organization,
  branch: branch.name,
  name: `${$app.name}-migrator-${$app.stage}`,
  inheritedRoles: [
    "pg_read_all_data",
    "pg_write_all_data",
    "postgres", // Only needed for pushing schema changes
  ],

})


// const migration = await command.local.run({
//   command: "bun run db:migrate",
//   environment: {
//     DATABASE_URL: $interpolate`postgresql://${migrator_role.username}:${migrator_role.password}@${migrator_role.accessHostUrl}/postgres?sslmode=require`
//   },
//   dir: "packages/core"
// }, {
//   parent: migrator_role
// })


// const migration = new command.local.Command("DbMigration", {
//   dir: `${process.cwd()}/packages/core`,
//   environment: {
//     DATABASE_URL: $interpolate`postgresql://${migrator_role.username}:${migrator_role.password}@${migrator_role.accessHostUrl}/postgres?sslmode=require`
//   },

//   create: "bun run db:migrate || ( [ $? -eq 9 ] && exit 0 ); exit $?",
//   update: "bun run db:migrate || ( [ $? -eq 9 ] && exit 0 ); exit $?"
// }, {
//   dependsOn: [migrator_role]
// })
