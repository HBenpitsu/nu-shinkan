# Project Context

Before starting work, identify and read the documents under `docs/` that are relevant to the task. Use them to understand the project's design and conventions.

When working in a workspace directory, check for a local `AGENT.md` and read it if present.

# README.md Editing

README.md editing is unnecessary in most cases.
It is desired to put living document in docs/ dir, and to name the file explicitly.
When you should add some document which is short living, just use docs/discussion/.

EXCEPTION: if README.md contains explicit living section, you can edit the section only.

# Document Fences

Documents may contain agent instructions that define their authority or conditions for modification. Treat these instructions as document fences and follow them when working with the document.

- Read any fence before using or editing the document. Do not load unrelated documents solely to search for fences.
- Respect the distinction between authoritative design and descriptions of the current implementation. If a fence designates a document as authoritative, do not rewrite it merely to match existing behavior.
- Do not interpret an ordinary implementation request as permission to change a protected design or remove its fence.
- If a request conflicts with a protected design, review the relevant section, explain the conflict, and clarify the user's intent before proceeding with conflicting work. Identify the document and quote the applicable instruction. Continue work that does not depend on resolving the conflict.
- Explicit user instructions take precedence. If the user has already explicitly authorized the design change, proceed without asking again.
