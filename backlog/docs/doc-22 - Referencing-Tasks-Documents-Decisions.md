---
id: doc-22
title: Referencing Tasks, Documents, and Decisions
type: guide
created_date: 2026-06-09
tags:
  - documentation
  - references
  - backlinks
---

# Referencing Tasks, Documents, and Decisions

You can create clickable cross-references between entities in the Web UI by using simple ID patterns in any markdown body text.

## Task References

Type a task ID anywhere in markdown content and it will render as a clickable link:

```
See BACK-123 for the full implementation.
```

This links to the task detail modal for BACK-123.

## Document References

Reference a document by its doc-ID:

- `doc-1` — links to the document page
- `#doc-1` — also works with optional `#` prefix

Example:

```
The architecture is described in doc-12.
The onboarding guide (#doc-3) covers setup.
```

## Decision References

Reference a decision by its decision-ID:

- `decision-3` — links to the decision page
- `#decision-3` — also works with optional `#` prefix

Example:

```
We decided to use Bun (see decision-7).
The reasoning is documented in #decision-14.
```

## Important Notes

- References inside code blocks (`` ` `` or `` ``` ``) are **not** linked — they remain plain text.
- Links include only the entity ID (title resolution happens on the target page).
- Backlinks: on a document or decision page, the "Referenced by" section shows all tasks, documents, and decisions that mention that entity's ID.
- This works everywhere `MermaidMarkdown` renders: task descriptions, document bodies, and decision bodies.
