import os
import glob
import re

FRONTEND_SRC = r"frontend/apps/desktop/src"

APPROVED_5_FAMILIES = {
    'neutral': [
        '#0f172a', '#111827', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8',
        '#cbd5e1', '#e2e8f0', '#f1f5f9', '#f8fafc', '#ffffff', '#fff', '#000000', '#000'
    ],
    'primary': [
        '#1d4ed8', '#2563eb', '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'
    ],
    'success': [
        '#047857', '#059669', '#10b981', '#16a34a', '#15803d', '#166534', '#22c55e', '#86efac', '#a7f3d0', '#bbf7d0', '#dcfce7', '#f0fdf4', '#ecfdf5'
    ],
    'warning': [
        '#b45309', '#d97706', '#f59e0b', '#eab308', '#ca8a04', '#854d0e', '#78350f', '#fde68a', '#fef3c7', '#fffbeb'
    ],
    'danger': [
        '#dc2626', '#ef4444', '#b91c1c', '#991b1b', '#7f1d1d', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#fef2f2'
    ]
}

ALL_APPROVED = set()
for fam in APPROVED_5_FAMILIES.values():
    ALL_APPROVED.update(fam)

def inspect_file(filename):
    p = os.path.join(FRONTEND_SRC, filename)
    if not os.path.exists(p):
        print(f"File not found: {p}")
        return
    
    hex_pattern = re.compile(r'#([0-9a-fA-F]{3,8})\b')
    with open(p, 'r', encoding='utf-8') as fp:
        lines = fp.readlines()

    found = []
    for idx, line in enumerate(lines, 1):
        if line.strip().startswith('//') or line.strip().startswith('/*'):
            continue
        matches = hex_pattern.findall(line)
        for m in matches:
            h = ('#' + m).lower()
            if len(h) == 4:
                h = f"#{h[1]*2}{h[2]*2}{h[3]*2}"
            if h not in ALL_APPROVED:
                found.append((idx, h, line.strip()))

    print(f"=== {filename} ({len(found)} non-5-color instances) ===")
    for idx, h, l in found:
        print(f"  Line {idx:4d} [{h}]: {l[:110]}")

if __name__ == "__main__":
    for f in [
        "GlobalNav.tsx",
        "SchedulePage.tsx",
        "scheduleApi.ts",
        "EventFormModal.tsx",
        "EventDetailModal.tsx",
        "keywordAssist.tsx",
        "CounselCompare.tsx",
        "CounselAssistV2.tsx",
        "App.tsx"
    ]:
        inspect_file(f)
