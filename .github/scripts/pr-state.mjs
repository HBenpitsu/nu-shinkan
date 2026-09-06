import { github, prNumber } from "./github.mjs";
import { output } from "./output.mjs";
const pr = await github(`pulls/${prNumber(process.env.PR_NUMBER)}`);
if (
  pr.base.ref !== "main" ||
  pr.head.repo?.full_name !== process.env.GITHUB_REPOSITORY
)
  throw Error("Expected same-repository PR targeting main");
if (!["open", "closed"].includes(pr.state)) throw Error("Invalid PR state");
const request = process.env.REQUEST_KIND || "deploy";
output(
  "operation",
  request === "delete" || pr.state === "closed"
    ? "cleanup"
    : request === "close"
      ? "skip"
      : "deploy",
);
