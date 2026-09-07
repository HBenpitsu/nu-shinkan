# Repository Agent Instructions

* `docs/` contains repository documentation for humans and AI agents.
  The directory may contain nested subdirectories.
  Before starting work, inspect `docs/` recursively (for example with `tree docs/`) and read any documents relevant to the task.
  Use them to understand the repository's context, design, constraints, assumptions, and existing decisions.

* `.agents/instructions/` contains behavioral instructions for AI agents.
  The directory may contain nested subdirectories used to organize related instructions.
  Before starting work, inspect `.agents/instructions/` recursively and identify candidate instruction files from their paths and file names.
  Each instruction file declares its applicability near the beginning of the document.
  When applicability is unclear from the path or file name alone, inspect only the beginning of the candidate file first.
  Read the full document only when the instruction applies to the task.
  Follow all applicable instructions.

* `.agents/skills/` contains task-specific procedures, methods, and reusable agent workflows.
  Inspect and use relevant skills when the task matches their purpose.

* Do not expect this `AGENTS.md` to contain an exhaustive index of instructions, skills, or repository documentation.
  Relevant resources must be discovered from their respective directory trees.

* When creating, modifying, or reorganizing files under `.agents/`, read `.agents/README.md` first and follow the conventions defined there.
