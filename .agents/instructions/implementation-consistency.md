# Implementation Consistency Instructions

> **Applies to:** Creating or modifying code in areas where repository-provided implementation examples or snippets exist.

This repository maintains code snippets and canonical examples to reduce unnecessary variation in implementation.

When implementing or modifying code:

1. Check whether a relevant repository snippet (stored in docs/snippets/**) or canonical example exists.
2. Prefer established repository patterns over inventing a new equivalent structure.
3. Adapt snippets to the current context rather than copying them mechanically.
4. Preserve the intent and important structural conventions demonstrated by the snippet.
5. Do not introduce a competing pattern without a concrete reason.

Snippets are examples, not immutable source code.

* They may require adaptation for types, names, dependencies, error handling, or surrounding architecture.
* Do not reproduce obsolete or inapplicable details merely for consistency.
* Existing production code and authoritative design documents take precedence when they conflict with a snippet.
* If multiple established patterns conflict, prefer the one used by the most relevant or current implementation and flag the inconsistency when it materially affects the task.

When adding a substantially new recurring implementation pattern, consider adding or updating a snippet so future implementations can follow the same pattern.
