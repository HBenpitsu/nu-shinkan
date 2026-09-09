# Document Protection Rules

> **Applies to:** Reading, relying on, implementing from, or editing documents
> that contain explicit agent-facing authority, protection, or modification
> conditions.

Documents may contain agent instructions that define their authority or conditions for modification. Like this:

```md
> **For agents:** This document is the authoritative design; align the implementation with it. Design changes require explicit user instruction.
```

Treat these instructions as document fences and follow them when working with the document.

- When a document you are already using contains an agent-facing protection or
authority notice, read and follow that notice before relying on or modifying
the affected content.
- Respect the distinction between authoritative design and descriptions of the current implementation. If a fence designates a document as authoritative, do not rewrite it merely to match existing behavior.
- Do not interpret an ordinary implementation request as permission to change a protected design or remove its fence.
- If a request conflicts with a protected design, review the relevant section, explain the conflict, and clarify the user's intent before proceeding with conflicting work. Identify the document and quote the applicable instruction. Continue work that does not depend on resolving the conflict.
- Explicit user instructions take precedence. If the user has already explicitly authorized the design change, proceed without asking again.
