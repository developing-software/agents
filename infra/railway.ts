const project = railway.Project.get("Project", "1f7bf3da-c046-4b33-afec-fa2102f8aa60");

const environment = project.defaultEnvironment;

interface RailwayPostgres {
  id: $util.Input<$util.ID>;
}

function railwayPostgres({ id }: RailwayPostgres) {
  const postgres = railway.Service.get("Postgres", "96031c25-dbae-4c96-bd1c-0eeb40291b3c");

  const pg_variables = railway.VariableCollection.get(
    "PostgresVariables",
    $interpolate`${postgres.id}:${environment.name}:PGHOST:PGPORT`,
  );

  return {
    postgres,
    pg_variables,
  };
}

const pg = railwayPostgres({ id: "96031c25-dbae-4c96-bd1c-0eeb40291b3c" });

// const pg_variables = railway.VariableCollection.get(
//   "PostgresVariables",
//   $interpolate`${postgres.id}:${environment.name}:PGHOST:PGPORT`,
// );

// // const pg_host = railway.Variable.get("PostgresHost", $interpolate`${postgres.id}:${environment.name}:PGHOST`);

// export const outputs = {
//   projectId: project.id,
//   directusId: directus.id,
//   postgresId: postgres.id,
//   // pgHost: pg_host.value,
//   lookupId: $interpolate`${postgres.id}${environment.name}:PGHOST`,
//   vars: pg_variables.variables.apply(vars => vars.map(v => `${v.name}=${v.value}`).join("")),
// };
