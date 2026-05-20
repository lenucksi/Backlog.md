---
id: BACK-508
title: Enforce SonarQube quality gate in fork CI
status: Done
assignee: []
created_date: '2026-05-18 12:10'
updated_date: '2026-05-18 14:05'
labels:
  - ci
  - sonarqube
  - fork
dependencies: []
priority: low
ordinal: 199000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The SonarQube scan is currently configured with continue-on-error: true (informative only). Once the baseline analysis has stabilized on the fork (lenucksi/Backlog.md):

1. Remove `continue-on-error: true` from the sonarqube job in `.github/workflows/ci.yml`
2. Verify that the workflow fails when the SonarQube quality gate is not passed
3. Ensure PR decoration (comments with quality gate status) works correctly
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
