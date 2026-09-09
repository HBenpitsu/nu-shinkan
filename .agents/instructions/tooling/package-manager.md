# Package Manager Instructions

> **Applies to:** Installing, removing, updating, or resolving dependencies; running package scripts; generating or modifying lockfiles; and any task that requires a JavaScript package manager.

* Use `pnpm` as the package manager for this repository.
* Do not use `npm`, `yarn`, or another package manager.
* Preserve and update `pnpm-lock.yaml` when dependency changes require it.
* Prefer repository-defined scripts over invoking underlying tools directly when an appropriate script already exists.
* In this monorepo, prefer running package-management commands from the repository root.
