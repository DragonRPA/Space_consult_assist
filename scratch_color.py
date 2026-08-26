import os

files = [
    "frontend/apps/desktop/src/SchedulePage.tsx",
    "frontend/apps/desktop/src/EventFormModal.tsx",
    "frontend/apps/desktop/src/EventDetailModal.tsx"
]

def replace_colors(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Dark -> Light replacements
    # Backgrounds
    content = content.replace("'#0b0f17'", "'#f9fafb'")  # Main BG
    content = content.replace("'#131b2e'", "'#ffffff'")  # Panel BG
    content = content.replace("'#1e293b'", "'#ffffff'")  # Input/Card BG
    
    # Borders
    content = content.replace("'#23334d'", "'#e5e7eb'")
    content = content.replace("'#334155'", "'#d1d5db'")
    
    # Text
    content = content.replace("'#f8fafc'", "'#111827'")  # Primary text
    content = content.replace("'#94a3b8'", "'#4b5563'")  # Muted text
    # #64748b is used for tertiary/disabled, leave it or use #6b7280
    
    # Specifics
    content = content.replace("background: '#0f172a'", "background: '#ffffff'")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

for p in files:
    if os.path.exists(p):
        replace_colors(p)
        print(f"Updated {p}")
