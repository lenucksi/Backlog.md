---
id: doc-20
title: "Session Start: i18n Cluster umsetzen (BACK-552.x)"
type: guide
created_date: 2026-06-09 12:44
tags:
  - session-start
  - i18n
  - back-552
---
# Session Start: i18n Cluster (BACK-552.x)

## Ziel

Internationalisierung des gesamten Forks mit i18next für Web UI + TUI + CLI. Startsprachen: DE + EN.

## Entscheidungen (bereits getroffen)

| Aspekt | Entscheidung |
|--------|-------------|
| **Bibliothek** | i18next + react-i18next (nicht Custom Context wie kuwork) |
| **TUI** | Gleiche i18next-Core-Instance, kein React Hook — direkter `i18n.t()` Import |
| **Type Safety** | i18next-resources-for-ts oder i18next-cli types |
| **Format** | JSON Namespaces (translation.json, commands.json) |
| **Plattform** | Weblate Cloud Libre (später, Subtask .7) |
| **MCP** | Ausgenommen (keine i18n) |

## Task-Struktur

| ID | Was | Prio | Abh. |
|----|-----|------|------|
| **552.1** | i18next Infrastructure + shared core + locale config | high | — |
| **552.2** | EN Dictionary (alle Strings) | high | .1 |
| **552.3** | DE Dictionary | high | .2 |
| **552.4** | Web UI i18n-ifizieren (~30+ Komponenten) | high | .1 |
| **552.5** | TUI i18n-ifizieren | high | .1 |
| **552.6** | Settings Sprachauswahl + Config-Persistenz | medium | .1 |
| **552.7** | Übersetzungsplattform-Setup (Weblate/Crowdin) | low | .2 |
| **552.8** | CLI i18n-ifizieren (niedrigste Prio) | low | .1 |

## Architektur

```
src/i18n/
├── i18n.ts              # Shared i18next instance (TUI + Web)
├── react.ts             # react-i18next Init (nur Web)
├── locales/
│   ├── en/
│   │   ├── translation.json   # Web + TUI Strings
│   │   └── commands.json       # CLI Strings
│   └── de/
│       ├── translation.json
│       └── commands.json
├── types.d.ts           # Auto-generierte TypeScript Declarations
└── config.ts            # Locale → Config-Logik
```

**Web**: `import { useTranslation } from 'react-i18next'` → `const { t } = useTranslation('translation')` → `t('common.loading')`

**TUI**: `import { i18n } from '../i18n/i18n'` → `i18n.t('common.loading')`

**CLI**: Wie TUI, shared instance.

## Empfohlene Reihenfolge

1. **552.1**: i18next initialisieren, Provider in App.tsx, Config-Persistenz
2. **552.2**: Alle EN Strings aus Komponenten extrahieren + kuworks en.ts recyclen
3. **552.4 + 552.5 parallel**: Web-Komponenten + TUI-Komponenten umstellen
4. **552.3**: DE Übersetzung auf Basis des EN Dictionaries
5. **552.6**: Settings-Sprachauswahl + Config-Sync
6. **552.7**: Weblate/Crowdin-Anbindung (später)
7. **552.8**: CLI i18n (optional)

## Wichtige Referenzen

- **Kuworks en.ts (PR #669)**: 25KB, 42 Sections — Quelle zum Recyclen
  - `src/web/locales/en.ts` aus `kuwork/Backlog.md@tasks/combined-208-505`
  - Dict-Struktur kann als Inspiration für JSON-Namespaces dienen
- **Issue #386**: https://github.com/MrLesk/Backlog.md/issues/386
- **i18next Docs**: https://www.i18next.com/
- **react-i18next**: https://react.i18next.com/

## Fallstricke

- TUI-Dateien importieren direkt `i18next` (kein React) — `src/i18n/i18n.ts` muss **vor** `src/i18n/react.ts` initialisiert sein
- `TaskDetailsModal.tsx` ist ~1100+ Zeilen — grösste Einzeldatei, pro Abschnitt vorgehen
- `t()` Keys in GanttView erst nach i18n-Port (Trennung: i18n zuerst, Gantt später)
- Config-Locale muss bidirektional syncen: Web UI ↔ config.yml ↔ i18next.changeLanguage()
- Keine `t.*` Shortcut-Importe (wie in kuworks `useI18n`) — `useTranslation()` von react-i18next nutzen

## Definition of Done (pro Subtask)

- [ ] `bunx tsc --noEmit` clean
- [ ] `bun run check .` clean
- [ ] `bun test` (oder scoped) bestanden
- [ ] Feature in allen relevanten Modalitäten implementiert (Web UI, TUI, CLI; MCP ausgenommen)