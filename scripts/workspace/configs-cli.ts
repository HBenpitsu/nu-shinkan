import { parseArgs } from "node:util";
import { getWorkspaceConfigurations } from "./configs.js";

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { root: { type: "string" }, targets: { type: "boolean" } },
  });
  const configurations = getWorkspaceConfigurations(values.root);
  const unknown = positionals.filter(
    (name) => !configurations.some((pkg) => pkg.packageName === name),
  );
  if (unknown.length)
    throw new Error(`Unknown packages: ${unknown.join(", ")}`);
  // --targets receives exact names; no names means no deployment targets.
  const selected =
    values.targets || positionals.length
      ? configurations.filter((pkg) => positionals.includes(pkg.packageName))
      : configurations;
  console.log(
    JSON.stringify(
      selected.map((pkg) => {
        if (!values.targets) return { ...pkg, wrangler: pkg.wrangler?.data };
        const workerName = pkg.wrangler?.name;
        if (
          pkg.wrangler &&
          (typeof workerName !== "string" ||
            !/^[a-z0-9][a-z0-9-]*$/.test(workerName))
        )
          throw new Error(`Invalid Worker name: ${pkg.packageName}`);
        return {
          package: pkg.packageName,
          path: pkg.pathRel,
          ...(workerName ? { workerName } : {}),
        };
      }),
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
