import { execFileSync } from "node:child_process";
export function commit(sha) {
  if (!/^[a-f0-9]{40}$/i.test(sha || ""))
    throw Error("Expected fixed commit SHA");
  return execFileSync("git", ["rev-parse", "--verify", `${sha}^{commit}`], {
    encoding: "utf8",
  }).trim();
}
export function checkHead() {
  const head = commit(process.env.HEAD_SHA);
  const actual = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (actual !== head) throw Error("Checkout SHA mismatch");
  return head;
}
