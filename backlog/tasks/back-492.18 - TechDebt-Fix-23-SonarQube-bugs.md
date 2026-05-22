---
id: BACK-492.18
title: 'TechDebt: Fix 23 SonarQube bugs'
status: Done
assignee: []
created_date: '2026-05-20 23:44'
updated_date: '2026-05-22 15:38'
labels:
  - tech-debt
  - bugs
milestone: m-15
dependencies: []
parent_task_id: BACK-492
priority: medium
ordinal: 180100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube meldet 23 offene Bugs (0 Vulnerabilities). Diese einzeln analysieren und fixen. Die Bugs verteilen sich über verschiedene Module. Nach dem Audit entscheiden, welche critial sind und welche als false-positive markiert werden können.

Vorgehen:
1. Alle 23 Bugs via SonarQube-API fetchen und kategorisieren
2. Critical/HIGH Bugs priorisieren
3. Fixen oder als won't-fix markieren
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle HIGH/CRITICAL Bugs analysiert und gefixt oder als false-positive dokumentiert
- [ ] #2 Keine Regression in bestehenden Tests
- [ ] #3 SonarQube-Rescan zeigt ≤10 Bugs
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
