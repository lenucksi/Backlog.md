#!/usr/bin/env python3
"""
label-audit.py — Backlog.md Label Analyse & Edit-Distance Report

Gibt strukturierte Reports aus über:
  - Alle Labels + Task-Count
  - Overlap-Gruppen (Edit-Distance ≤ 3)
  - Orphan-Labels (in Config aber 0 Tasks)
  - Labels auf Tasks aber nicht in Config
  - Upstream-vs-upstream-pr Analyse

Usage:
  python3 scripts/label-audit.py                   # Config-Labels + Task-Scan
  python3 scripts/label-audit.py --edit-distance    # Zusätzlich Edit-Distance-Matrix
  python3 scripts/label-audit.py --json             # JSON-Output

Requires: python3 (keine externen Dependencies)
"""

import json
import subprocess
import sys
from collections import defaultdict

# ----- Levenshtein (reine Python, keine Dependencies) -----

def levenshtein(a: str, b: str) -> int:
    """Berechnet Levenshtein Edit-Distance zwischen a und b."""
    if len(a) < len(b):
        a, b = b, a
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            cost = 0 if ca == cb else 1
            curr.append(min(
                curr[j] + 1,
                prev[j + 1] + 1,
                prev[j] + cost,
            ))
        prev = curr
    return prev[-1]


def run_backlog(args: list[str], capture=True) -> str:
    """Führt backlog CLI Befehl aus und gibt stdout zurück."""
    cmd = ["bun", "run", "cli"] + args
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30, cwd=WORKDIR)
        return r.stdout
    except subprocess.TimeoutExpired:
        return ""
    except FileNotFoundError:
        return ""


def parse_json_output(output: str):
    """Extrahiert JSON-Array aus backlog CLI output (build:css dazwischen)."""
    lines = output.splitlines()
    start = -1
    for i, line in enumerate(lines):
        if line.strip() == "[":
            start = i
            break
    if start < 0:
        return None
    joint = "\n".join(lines[start:])
    try:
        return json.loads(joint)
    except json.JSONDecodeError:
        pass
    return None


def get_config_labels() -> list:
    """Holt alle Labels aus backlog.config.yml via CLI."""
    raw = run_backlog(["label", "list", "--json"])
    data = parse_json_output(raw)
    if not data:
        return []
    result = []
    for item in data:
        if isinstance(item, dict):
            result.append(item.get("name", str(item)))
        else:
            result.append(str(item))
    return result


def get_task_labels() -> dict[str, list[str]]:
    """Holt alle Tasks + ihre Labels via CLI.

    Returns:
        dict: { task_id: [label1, label2, ...] }
    """
    raw = run_backlog(["task", "list", "--json"])
    data = parse_json_output(raw)
    if not data:
        return {}
    result = {}
    for task in data:
        tid = task.get("id", "")
        labels = task.get("labels") or []
        result[tid] = labels
    return result


def find_overlap_groups(labels: list[str], max_distance: int = 3) -> list[dict]:
    """Findet Label-Gruppen mit Edit-Distance ≤ max_distance.

    Returns:
        list[dict]: [{group: [label, ...], pairs: [(a,b,dist), ...]}, ...]
    """
    n = len(labels)
    processed = set()
    groups = []

    for i in range(n):
        if i in processed:
            continue
        group = [labels[i]]
        pairs = []
        for j in range(i + 1, n):
            dist = levenshtein(labels[i], labels[j])
            if dist <= max_distance:
                group.append(labels[j])
                pairs.append((labels[i], labels[j], dist))
                processed.add(j)
        if len(group) > 1:
            processed.add(i)
            groups.append({
                "group": sorted(group),
                "pairs": sorted(pairs, key=lambda x: x[2]),
                "min_distance": min(p[2] for p in pairs),
            })

    return sorted(groups, key=lambda g: g["min_distance"])


def main():
    global WORKDIR
    import os
    WORKDIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    output_json = "--json" in sys.argv
    show_edit_distance = "--edit-distance" in sys.argv or output_json

    # ----- Labels sammeln -----
    config_labels = get_config_labels()
    task_labels = get_task_labels()

    # Task-Count pro Label
    label_counts: dict[str, int] = defaultdict(int)
    labels_on_tasks: set = set()
    for tid, lbls in task_labels.items():
        for lbl in lbls:
            label_counts[lbl] += 1
            labels_on_tasks.add(lbl)

    config_set = set(config_labels)
    orphan_labels = config_set - labels_on_tasks
    missing_labels = labels_on_tasks - config_set
    unlabeled_tasks = [tid for tid, lbls in task_labels.items() if not lbls]

    # ----- Report -----
    if output_json:
        report = {
            "config_label_count": len(config_labels),
            "task_count": len(task_labels),
            "label_counts": dict(sorted(label_counts.items(), key=lambda x: -x[1])),
            "orphan_labels": sorted(orphan_labels),
            "missing_labels": sorted(missing_labels),
            "unlabeled_tasks": unlabeled_tasks,
            "unlabeled_count": len(unlabeled_tasks),
        }
        if show_edit_distance:
            report["overlap_groups"] = find_overlap_groups(list(config_set | labels_on_tasks))
        print(json.dumps(report, indent=2))
        return

    # ----- Text Report -----
    print(f"=== Label Audit Report ===")
    print(f"Datum: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Labels in Config: {len(config_labels)}")
    print(f"Labels on Tasks: {len(labels_on_tasks)}")
    print(f"Total Tasks: {len(task_labels)}")
    pct = len(unlabeled_tasks) * 100 // len(task_labels) if task_labels else 0
    print(f"Tasks without Labels: {len(unlabeled_tasks)} ({pct}%)\n")

    # Top-Labels
    print("=== Top 20 Labels (nach Task-Count) ===")
    for i, (lbl, cnt) in enumerate(sorted(label_counts.items(), key=lambda x: -x[1])[:20], 1):
        print(f"  {i:2d}. {lbl:25s} {cnt:3d} tasks")
    print()

    # Overlap Groups
    if show_edit_distance:
        print("=== Overlap Groups (Edit-Distance ≤ 3) ===")
        groups = find_overlap_groups(list(config_set | labels_on_tasks))
        if not groups:
            print("  Keine Überlappungen gefunden.")
        else:
            for g in groups:
                print(f"  Gruppe: {', '.join(g['group'])} (min dist: {g['min_distance']})")
                for a, b, d in g["pairs"]:
                    print(f"    {a:25s} ↔ {b:25s}  dist={d}")
        print()

    # Orphans
    print("=== Orphan Labels (in Config, 0 Tasks) ===")
    if orphan_labels:
        for lbl in sorted(orphan_labels):
            print(f"  {lbl}")
    else:
        print("  Keine Orphans gefunden.")
    print()

    # Missing
    print("=== Labels on Tasks but NOT in Config ===")
    if missing_labels:
        # Zeige Tasks pro missing label
        for lbl in sorted(missing_labels):
            tasks_with = [tid for tid, ls in task_labels.items() if lbl in ls]
            print(f"  {lbl} ({len(tasks_with)} tasks): {', '.join(tasks_with[:10])}")
    else:
        print("  Keine fehlenden Labels.")
    print()

    # Unlabeled
    print("=== Tasks ohne Labels ===")
    for tid in unlabeled_tasks[:20]:
        print(f"  {tid}")
    if len(unlabeled_tasks) > 20:
        print(f"  ... und {len(unlabeled_tasks) - 20} weitere")
    print()

    print("=== Fertig ===")


if __name__ == "__main__":
    main()
