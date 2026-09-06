# Instructions for Writing Documents

Apply these instructions when creating or editing documentation. The goal is to make reference documents understandable to readers who have not seen the conversation that produced them.

## 1. Classify the document before writing

Choose the document type based on its intended audience and use, not its title or file format.

| Type                | Intended use                                                                                               | Examples                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Discussion document | Help participants in the current conversation review progress, discuss options, or decide what to do next. | Status summaries, proposed implementation plans, work reports, discussion records.       |
| Reference document  | Help readers understand or perform something without access to the current conversation.                   | Tool and command guides, onboarding materials, design documents, operational procedures. |

- If the document is intended for future readers or serves both purposes, apply the reference-document rules below.
- When editing an existing document, preserve its intended purpose and organize additions accordingly.
- Infer the type from the request and the document. Ask the user only if the intended use is unclear and would materially change the content.
- Discussion documents have no additional requirements under this guide. Other applicable repository instructions still apply.

## 2. Write reference documents for readers without chat context

### Establish the context the reader needs

- Start with the document's subject, purpose, and scope.
- State prerequisites and define unfamiliar terms before using them.
- Include or link the background needed to understand the document. Do not assume the reader has access to the chat.
- Use explicit names for tools, files, components, and decisions. Avoid references such as "the earlier approach" or "as discussed above" when their meaning depends on the conversation.

### Organize by the reader's task or understanding

- Present information from general concepts to specific details, and from prerequisites to dependent steps.
- For a guide, explain what the tool does, what is required, how to use it, and how to recognize success.
- For a design document, explain the problem and constraints, the design, and the reasons for consequential choices.
- Use only the sections needed for the document's purpose; these examples are not mandatory templates.

### Describe the resulting design or procedure

- Present the final agreed design, procedure, or rule directly. Do not organize the document around the order in which the conversation unfolded.
- Keep rationale, constraints, and tradeoffs that help readers understand or use the result. Explain them without requiring knowledge of who proposed or corrected an idea.
- Omit abandoned proposals, intermediate drafts, and conversational corrections unless they are needed to explain a decision or the document explicitly records history.
- If a decision is unresolved, label it as unresolved. Do not present a proposal as an agreed fact.
- When editing, integrate changes into the relevant sections and update conflicting statements rather than appending a conversational addendum.

For example, if the agreed procedure is to run validation before deployment:

- Avoid: "We first planned to deploy immediately, but then agreed to add validation."
- Prefer: "Run validation before deployment to catch configuration errors before they reach the deployed environment."

## 3. Review reference documents before finishing

Check the following and revise any item that fails:

- Can a reader identify the document's purpose without reading the chat?
- Are necessary concepts and prerequisites introduced before they are used?
- Can the reader follow the explanation or procedure using the document and its linked references?
- Does the structure follow the reader's needs rather than the chronology of the conversation?
- Are final decisions, proposals, and unresolved questions clearly distinguished where applicable?
- Have edits been integrated without leaving contradictory or outdated statements?

# The Rule Of Document Amending

## ADR

You MUST NOT amend existing content of `ADR/*` documents.
When you revise it, append the content.
EXCEPTION: When user requested to merge amending, you can edit existing content.

## Whole

Remember the **Document Fences**
