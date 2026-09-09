# Volatile Tests

> **Applies to:** Any test created or used only as a temporary implementation aid and not intended to remain in the repository after the task is complete.

Agents may create volatile tests during implementation when they provide a faster or more reliable feedback loop.

Volatile tests are working artifacts used to reproduce failures, validate assumptions, characterize behavior, or protect intermediate implementation steps. They are not part of the repository's permanent test suite.

## Naming

Every volatile test file must be explicitly marked in its filename using:

`*.volatile.test.*`

Examples:

* `parser.volatile.test.ts`
* `worker.volatile.test.tsx`

The `volatile` marker is mandatory regardless of where the file is placed.

Do not create an unmarked temporary test.

The marker exists so volatile tests can be reliably identified, searched for, excluded, and removed mechanically.

## Constraints

Volatile tests are exempt from conventions that exist for the long-term structure and maintainability of the permanent test suite, including:

* test file placement,
* naming other than the required `volatile` marker,
* abstraction and organization,
* fixture structure,
* duplication,
* long-term maintainability.

Prefer the smallest and simplest test that provides reliable feedback.

Do not introduce reusable testing abstractions or infrastructure solely to support a volatile test unless they are necessary for the implementation itself.

## Lifecycle

Before completing the task, every volatile test must be either:

1. deleted, or
2. intentionally promoted into the permanent test suite.

Promotion requires removing the `volatile` marker and reconsidering the test as a permanent repository asset.

A promoted test must satisfy all instructions governing permanent tests. Merely renaming or relocating a volatile test does not constitute sufficient promotion.

Unless explicitly requested otherwise, no `*.volatile.test.*` file may remain in the completed change.

## Relationship to Permanent Tests

Permanent-test requirements apply to tests intended to remain in the repository.

Those requirements must not discourage the creation of volatile tests when temporary tests improve implementation confidence or shorten the feedback loop.

Conversely, the use of volatile tests does not relax any requirement for tests that become part of the permanent test suite.
