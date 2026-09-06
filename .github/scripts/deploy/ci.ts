import { runTask } from "./run.js";
import { listWorkspacePackages } from "./workspace.js";
const input: unknown = JSON.parse(process.env.PACKAGES ?? "[]");
if (!Array.isArray(input)) throw new Error("Expected package array");
const all = listWorkspacePackages();
const packages = input.map((p) => {
  const pkg = all.find((a) => a.package === p);
  if (!pkg) throw new Error("Unknown package");
  return pkg.package;
});
const task = process.argv[2];
if (!task || !["lint", "ui_test", "test"].includes(task))
  throw new Error("Invalid CI task");
runTask(task, packages, task === "test" ? ["--", "--run"] : []);
