#!/usr/bin/env bash
# ==============================================================
# label-cleanup.sh — Backlog.md Label Wildwuchs Bereinigung
#
# Führt deterministische Label-Merges durch und bereinigt die Config.
#
# Usage:
#   bash scripts/label-cleanup.sh          # Dry run
#   bash scripts/label-cleanup.sh --apply  # Änderungen ausführen
# ==============================================================
set -euo pipefail

APPLY="${1:-}"
PROJECT_DIR="/home/jo/kit/claude-code-llm-kram/Backlog.md"

info()  { printf "  %s\n" "$*"; }
warn()  { printf "  ⚠ %s\n" "$*" >&2; }
step()  { printf "\n==> %s\n" "$*"; }
dry()   { [ "$APPLY" = "--apply" ] || return 0; }

BACKLOG="bun run cli"

cd "$PROJECT_DIR"

# ---------- Phase 0: Task-Sammlung via Python ----------
step "Sammle alle Tasks mit Labels..."

TASK_DATA=$(timeout 60 python3 -c "
import json, subprocess
r = subprocess.run(['bun', 'run', 'cli', 'task', 'list', '--json'],
    capture_output=True, text=True, timeout=45, cwd='$PROJECT_DIR')
lines = r.stdout.splitlines()
start = -1
for i, line in enumerate(lines):
    if line.strip() == '[':
        start = i
        break
if start < 0:
    exit(1)
data = json.loads('\n'.join(lines[start:]))
# output: label<TAB>task_id
for task in data:
    tid = task.get('id', '')
    for lbl in (task.get('labels') or []):
        print(f'{lbl}\t{tid}')
" 2>/dev/null || echo "")

# Parse into label->tasks mapping via temp approach
declare -A LABEL_TASKS
while IFS=$'\t' read -r lbl tid; do
	[ -z "$lbl" ] && continue
	[ -z "$tid" ] && continue
	if [ -z "${LABEL_TASKS[$lbl]:-}" ]; then
		LABEL_TASKS[$lbl]="$tid"
	else
		LABEL_TASKS[$lbl]="${LABEL_TASKS[$lbl]},$tid"
	fi
done < <(echo "$TASK_DATA" | sort -u)

info "Gesammelt: ${#LABEL_TASKS[@]} Labels mit Tasks"

# ---------- Phase 1: Merges (source -> target) ----------
step "Phase 1 — Label-Merges"

merge_label() {
	local src="$1" tgt="$2"
	local tasks="${LABEL_TASKS[$src]:-}"
	local count=0
	[ -n "$tasks" ] && count=$(echo "$tasks" | tr ',' '\n' | wc -l)

	info "$src ($count tasks) → $tgt"

	if dry; then
		info "  [DRY] würde $src → $tgt mergen ($count tasks)"
		return
	fi

	IFS=',' read -ra ids <<< "$tasks"
	for tid in "${ids[@]}"; do
		[ -z "$tid" ] && continue
		$BACKLOG task edit "$tid" --remove-label "$src" --add-label "$tgt" 2>/dev/null || warn "Fehler bei $tid"
	done

	$BACKLOG label remove "$src" 2>/dev/null || warn "Konnte $src nicht aus Config entfernen"
	info "  ✅ $src → $tgt ($count tasks)"
}

merge_label webui web-ui
merge_label test testing
merge_label tests testing
merge_label bugs bug
merge_label milestone milestones
merge_label filter filters
merge_label refactor refactoring
merge_label upstream-pr upstream

# ---------- Phase 2: docs/document/documents Splitt ----------
step "Phase 2 — docs/document/documents Split"

split_label() {
	local src="$1"
	local tasks="${LABEL_TASKS[$src]:-}"
	local count=0
	[ -n "$tasks" ] && count=$(echo "$tasks" | tr ',' '\n' | wc -l)

	info "$src ($count tasks)"

	if dry; then
		info "  [DRY] würde $src splitten"
		return
	fi

	IFS=',' read -ra ids <<< "$tasks"
	for tid in "${ids[@]}"; do
		[ -z "$tid" ] && continue

		$BACKLOG task view "$tid" --plain 2>/dev/null > "/tmp/_lbl_$tid.txt" || true
		content=$(cat "/tmp/_lbl_$tid.txt" 2>/dev/null || echo "")

		if echo "$content" | grep -qi "internal\|architecture\|code\|markdown\|serializer\|parser\|format\|specification"; then
			$BACKLOG task edit "$tid" --remove-label "$src" --add-label "doc" 2>/dev/null || warn "Fehler $tid"
			info "  → $tid → doc (internal)"
		else
			$BACKLOG task edit "$tid" --remove-label "$src" --add-label "documentation" 2>/dev/null || warn "Fehler $tid"
			info "  → $tid → documentation (user-facing)"
		fi
		rm -f "/tmp/_lbl_$tid.txt"
	done

	$BACKLOG label remove "$src" 2>/dev/null || warn "Konnte $src nicht entfernen"
	info "  ✅ $src aufgeteilt"
}

for label in docs document documents; do
	split_label "$label"
done

# ---------- Phase 3: Orphans aus Config entfernen ----------
step "Phase 3 — Config-Bereinigung (Orphans)"

for lbl in urgent back-491 back-527; do
	if dry; then
		info "  [DRY] backlog label remove $lbl"
		continue
	fi
	$BACKLOG label remove "$lbl" 2>/dev/null || info "  $lbl existiert nicht"
	info "  ✅ $lbl entfernt"
done

# ---------- Phase 4: Fehlende Labels hinzufügen ----------
step "Phase 4 — Fehlende Labels zur Config"

for lbl in color authors all-modalities crud; do
	if dry; then
		info "  [DRY] backlog label add $lbl"
		continue
	fi
	$BACKLOG label add "$lbl" 2>/dev/null && info "  ✅ $lbl hinzugefügt" || info "  $lbl existiert bereits"
done

# ---------- Phase 5: Report ----------
step "Phase 5 — Report"

if dry; then
	info "  [DRY] Ende. Keine Änderungen. Führe mit --apply aus."
	exit 0
fi

echo ""
info "=== Labels in Config ==="
$BACKLOG label list --json 2>/dev/null | python3 -c "
import json, sys
for line in sys.stdin:
    line = line.strip()
    if line.startswith('['):
        try:
            labels = json.loads(line)
            print(f'Count: {len(labels)}')
            for l in sorted([l.get('name',l) if isinstance(l,dict) else l for l in labels]):
                print(f'  - {l}')
        except: pass
" 2>/dev/null

echo ""
info "=== Task-Statistiken ==="
$BACKLOG task list --json 2>/dev/null | python3 -c "
import json, sys
for line in sys.stdin:
    line = line.strip()
    if line.startswith('['):
        try:
            tasks = json.loads(line)
            unlabeled = [t['id'] for t in tasks if not t.get('labels') or len(t['labels']) == 0]
            all_lbls = set()
            for t in tasks:
                for l in (t.get('labels') or []):
                    all_lbls.add(l)
            print(f'Tasks mit Labels: {len(tasks) - len(unlabeled)}')
            print(f'Tasks ohne Labels: {len(unlabeled)} ({len(unlabeled)*100//len(tasks)}%)')
            print(f'Distinct Labels on Tasks: {len(all_lbls)}')
        except: pass
" 2>/dev/null

info ""
info "=== Fertig! ==="
