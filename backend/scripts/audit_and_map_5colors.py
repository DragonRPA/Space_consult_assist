import os
import glob
import re
from collections import defaultdict

FRONTEND_SRC = r"frontend/apps/desktop/src"

# 5 Color Doctrine (eBro ERP standard):
# 1. Neutral (먹색/슬레이트): #0f172a, #1e293b, #334155, #475569, #64748b, #94a3b8, #cbd5e1, #e2e8f0, #f1f5f9, #f8fafc, #ffffff, #fff
# 2. Cobalt Blue (Primary/Action): #1d4ed8, #2563eb, #1e40af, #3b82f6, #60a5fa, #93c5fd, #bfdbfe, #dbeafe, #eff6ff
# 3. Emerald Green (Success/Resolved): #047857, #059669, #10b981, #16a34a, #15803d, #166534, #22c55e, #86efac, #a7f3d0, #bbf7d0, #dcfce7, #f0fdf4, #ecfdf5
# 4. Deep Amber (Warning/Pending): #b45309, #d97706, #f59e0b, #eab308, #ca8a04, #854d0e, #78350f, #fde68a, #fef3c7, #fffbeb
# 5. Crimson Red (Danger/Emergency/AS): #dc2626, #ef4444, #b91c1c, #991b1b, #7f1d1d, #f87171, #fca5a5, #fecaca, #fee2e2, #fef2f2

APPROVED_5_FAMILIES = {
    'neutral': [
        '#0b0f19', '#0f172a', '#111827', '#1e293b', '#1f2937', '#334155', '#374151', '#475569', '#64748b', '#94a3b8',
        '#cbd5e1', '#e2e8f0', '#f1f5f9', '#f8fafc', '#ffffff', '#fff',
        '#f5f2eb', '#fbf9f5', '#ece7de', '#f2eee6', '#dcd5c9', '#e8e2d8', '#9a9284', '#575147'
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

def find_unapproved_colors():
    files = glob.glob(os.path.join(FRONTEND_SRC, "**/*.*"), recursive=True)
    ui_files = [f for f in files if f.endswith(('.tsx', '.ts', '.css'))]

    hex_pattern = re.compile(r'#([0-9a-fA-F]{3,8})\b')
    unapproved = defaultdict(list)

    for f in ui_files:
        with open(f, 'r', encoding='utf-8') as fp:
            for line_no, line in enumerate(fp, 1):
                # skip comments
                clean_line = line.strip()
                if clean_line.startswith('//') or clean_line.startswith('/*'):
                    continue
                matches = hex_pattern.findall(line)
                for m in matches:
                    h = ('#' + m).lower()
                    if len(h) == 4:
                        # expand 3-digit hex like #fff
                        h = f"#{h[1]*2}{h[2]*2}{h[3]*2}"
                    if h not in ALL_APPROVED and h != '#ffffff':
                        unapproved[h].append((f, line_no, clean_line[:90]))

    print(f"=== Found {len(unapproved)} Non-5-Color Hexes ===")
    for h, locs in sorted(unapproved.items(), key=lambda x: -len(x[1])):
        print(f"Hex: {h} ({len(locs)} times)")
        for f, lno, snippet in locs[:3]:
            print(f"   {os.path.basename(f)}:{lno} -> {snippet}")
        if len(locs) > 3:
            print(f"   ... and {len(locs)-3} more")

if __name__ == "__main__":
    find_unapproved_colors()
