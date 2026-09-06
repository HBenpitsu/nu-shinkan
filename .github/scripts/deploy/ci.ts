import { executeDeployCommand } from "./commands.js";
executeDeployCommand("task", {
  task: process.argv[2],
  packages: JSON.parse(process.env.PACKAGES ?? "[]"),
});
