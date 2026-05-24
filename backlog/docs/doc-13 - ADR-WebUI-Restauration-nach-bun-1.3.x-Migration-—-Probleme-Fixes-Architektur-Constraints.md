---
id: doc-13
title: "ADR: WebUI Restauration nach bun 1.3.x Migration — Probleme, Fixes,
  Architektur-Constraints"
type: specification
created_date: 2026-05-24 16:56
tags:
  - webui
  - bun
  - build
  - adr
  - architecture
  - websocket
---
# ADR: WebUI Restauration nach bun 1.3.x Migration

## Status

Accepted (2026-05-24)

## Context

Mit dem Wechsel von bun 1.2.x auf 1.3.x traten mehrere fundamentale Probleme in der WebUI auf, die den Betrieb vollständig verhinderten (White Screen). Dieser Report dokumentiert alle gefundenen Probleme, ihre Behebung und die daraus resultierenden architektonischen Constraints.

## Probleme & Lösungen

### Problem 1: `Bun.HTMLBundle` import gibt leeres Objekt zurück

**Symptom**: `import indexHtml from "../web/index.html"` liefert `{}` (leeres Objekt) statt eines `Bun.HTMLBundle`.

**Ursache**: bun 1.3.11+ hat einen Bug im HTML-Bundle-Import. Der Import von `.html`-Dateien als Bundle ist defekt.

**Fix**: Statt compile-time Import wird das HTML-File via `Bun.file("src/web/index.html")` zur Runtime geladen. Für den compiled binary wird ein separater Build-Step in `scripts/build.ts` durchgeführt:
- `Bun.build()` mit `target: "browser"` und Plugin zum Stubben von `"bun"`-Imports
- Ergebnis wird als `dist/web/main.js` + `dist/web/main.css` gespeichert
- `dist/index.html` wird mit angepassten Pfaden generiert

**Constraint**: Der Web-Bundle muss als separater Build-Schritt laufen. `Bun.HTMLBundle` kann nicht verwendet werden.

### Problem 2: `import { $ } from "bun"` im Web-Bundle

**Symptom**: `Bun.build({ target: "browser" })` für das WebUI scheitert an `import { $ } from "bun"` in server-seitigen Modulen.

**Ursache**: Das WebUI importiert transitiv Module aus `src/core/` und `src/utils/`, die `import { $ } from "bun"` verwenden. Da der Web-Bundle auf `target: "browser"` läuft, werden bun-Builtins nicht erkannt.

**Fix**: Ein Build-Plugin stubbt `"bun"`-Imports:
```typescript
plugins: [{
    name: "stub-bun",
    setup(build) {
        build.onResolve({ filter: /^bun$/ }, () => ({
            path: "bun-stub", namespace: "stub"
        }));
        build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
            contents: "export const $ = () => {}; ...",
            loader: "js",
        }));
    },
}]
```

**Constraint**: Das WebUI sollte idealerweise keine Abhängigkeiten zu Server-Modulen haben. Mittel- bis langfristig muss die Import-Architektur bereinigt werden.

### Problem 3: `useNavigate()` ausserhalb von `<BrowserRouter>`

**Symptom**: `Error: useNavigate() may be used only in the context of a <Router> component`

**Ursache**: `App.tsx` ruft `useNavigate()` auf Komponenten-Top-Level auf, aber `<BrowserRouter>` war nur im JSX-Return (also NACH den Hook-Aufrufen). Dies funktionierte zufällig in React Router v6 mit dem `Bun.HTMLBundle`, da der Bundle-Mechanismus eine andere Evaluierungsreihenfolge hatte.

**Fix**: `<BrowserRouter>` in `main.tsx` gesetzt (als Wrapper der gesamten App), aus `App.tsx` entfernt. Damit ist `useNavigate()` immer innerhalb des Router-Kontexts.

**Constraint**: React Router Hooks (`useNavigate`, `useLocation`, `useParams`) müssen in einer Komponente aufgerufen werden, die in einem `<BrowserRouter>` gerendert wird. Der Router muss die gesamte App wrappen, nicht nur den Return-Teil.

### Problem 4: WebSocket Upgrade wird von SPA-Route abgefangen

**Symptom**: `WebSocket connection to 'ws://localhost:6460/' failed: Unexpected response code: 200`

**Ursache**: Die SPA-Route für `/` wurde als Route (`routes["/"] = spaHandler`) registriert. `Bun.serve()` leitet WebSocket-Upgrade-Requests an die Route weiter (bevor `fetch` aufgerufen wird). Der `spaHandler` gab HTML statt eines Upgrades zurück.

**Fix**: Die Route für `/` aus den SPA-Routen entfernt. Stattdessen wird `/` im `fetch`-Handler bedient, der auch die WebSocket-Upgrade-Logik enthält:
```typescript
// In fetch handler:
if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
    const success = server.upgrade(req, { data: undefined });
    if (success) return new Response(null, { status: 101 });
}
if (pathname === "/") {
    // Serve SPA HTML
}
```

**Constraint**: Wenn Bun-Server-Routen und `fetch`-Handler parallel verwendet werden, muss WebSocket-Upgrade im `fetch`-Handler erfolgen, da Routen keine Upgrade-Requests prozessieren können. Der `fetch`-Handler wird nur für nicht-gematche Routen aufgerufen.