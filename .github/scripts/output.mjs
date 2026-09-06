import { appendFileSync } from "node:fs";
export function output(name, value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (/[\r\n]/.test(text)) throw Error(`Multiline output: ${name}`);
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${text}\n`);
}
export function planOutput(plan) {
  console.log(JSON.stringify(plan, null, 2));
  output("changes", plan.changes);
  output("targets", plan.targets);
}
