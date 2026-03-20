if ($dev) {
  new sst.x.DevCommand("Console", {
    dev: {
      title: "Console",
      command: "bun run dev",
      directory: "packages/console",
    }

  })
  new sst.x.DevCommand("Auth", {
    dev: {
      title: "Auth",
      command: "bun run dev:auth",
      directory: "packages/functions",
    }
  })
}
