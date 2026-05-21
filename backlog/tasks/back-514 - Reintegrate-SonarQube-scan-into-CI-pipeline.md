---
id: BACK-514
title: Reintegrate SonarQube scan into CI pipeline
status: Done
assignee: []
created_date: '2026-05-21 15:20'
labels:
  - ci
  - sonarqube
  - infrastructure
dependencies: []
modified_files:
  - .github/workflows/ci.yml
priority: low
ordinal: 200000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The SonarQube CI job was previously added in commit 3578e20 but got lost during the CI restructuring in 74df78d (path-filter changes). Re-added it with an optimized flow:

- test job now generates lcov coverage (--coverage-reporter=lcov) and uploads it as artifact
- sonarqube job waits for test job (needs: [test]), downloads coverage artifact instead of re-running tests
- Uses SonarSource/sonarqube-scan-action@v6 with continue-on-error: true
- Skips external PRs (no SONAR_TOKEN available on forks)
- Includes SonarCloud package caching
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Re-added the sonarqube job that was lost during CI restructure. It now uses `needs: [test]` to run after CI finishes, downloads coverage from the test job's artifact instead of re-running tests, and runs SonarSource/sonarqube-scan-action@v6 against SonarCloud.
<!-- SECTION:FINAL_SUMMARY:END -->
