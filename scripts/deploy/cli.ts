import { readFileSync } from "node:fs";
import { parseContext } from "@repo/app-config/context";
import { plan, type Request } from "./plan.js";
import { runTask, runDeploy } from "./run.js";
import { list } from "../workspace/query.js";

// Main Logic
function main(): unknown {
  const input = JSON.parse(readFileSync(0, "utf8"));
  switch (process.argv[2]) {
    case "plan":
      if (
        !input ||
        !["staging", "release", "preview"].includes(input.channel) ||
        !["diff", "full", "manual-pick"].includes(input.source) ||
        !Array.isArray(input.picks) ||
        !input.picks.every((name: unknown) => typeof name === "string")
      )
        throw new Error("Invalid plan request");
      return plan(input as Request);
    case "task": {
      if (
        !input ||
        !["test", "build", "lint", "ui_test"].includes(input.task) ||
        !Array.isArray(input.packages) ||
        !input.packages.every((name: unknown) => typeof name === "string")
      )
        throw new Error("Invalid task request");
      const names = new Set(list().map((pkg) => pkg.package));
      for (const name of input.packages)
        if (!names.has(name)) throw new Error(`Unknown package: ${name}`);
      runTask(
        input.task,
        input.packages,
        input.task === "test" ? ["--", "--run"] : [],
      );
      return { success: true };
    }
    case "deploy": {
      if (!input || typeof input.manual !== "boolean")
        throw new Error("Invalid deploy request");
      parseContext({ ...process.env, TARGETS: JSON.stringify(input.targets) });
      const packages = list();
      for (const target of input.targets)
        if (
          !packages.some(
            (pkg) => pkg.package === target.package && pkg.path === target.path,
          )
        )
          throw new Error(`Invalid target: ${target.package}`);
      return runDeploy(input.targets, input.manual);
    }
    default:
      throw new Error(
        "Usage: tsx scripts/deploy/cli.ts plan|task|deploy < request.json",
      );
  }
}

// EntryPoint
try {
  console.log(JSON.stringify(main()));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
