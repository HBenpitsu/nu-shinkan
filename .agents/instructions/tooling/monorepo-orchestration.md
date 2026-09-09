# Monorepo Orchestration Instructions

> **Applies to:** Running tasks across multiple workspaces, coordinating repository-wide builds, tests, linting, type checks, determining affected projects, or otherwise orchestrating work across the monorepo.

Use the following preference order for monorepo-wide task execution:

1. Prefer an existing repository-defined script when it already performs the intended monorepo-wide operation.
2. Otherwise, prefer Turborepo when the task can be expressed using the existing Turbo task graph or Turbo's inspection capabilities.
3. Avoid manually enumerating workspaces or duplicating cross-workspace dependency and execution-order logic unless neither of the above is suitable.

Additional rules:

* Treat repository-defined monorepo-wide scripts as the preferred public interface for routine operations.
* Do not bypass an existing script merely to invoke `turbo` directly unless direct invocation is necessary for debugging, inspection, or functionality that the script does not expose.
* Prefer Turbo over ad hoc loops, repeated `pnpm --filter` invocations, or hand-maintained workspace lists for cross-workspace orchestration.
* When determining affected projects, prefer existing repository mechanisms first; otherwise prefer Turbo's dependency graph and inspection features when they can express the requirement correctly.
