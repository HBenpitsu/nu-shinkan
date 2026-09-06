import { runDeploy } from "../../scripts/deploy/run.ts";
import { output } from "./output.mjs";
const result = runDeploy(JSON.parse(process.env.TARGETS), false);
output("results", result.results);
if (result.failed) process.exitCode = 1;
