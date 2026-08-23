import os

files_to_fix = [
    "README.md",
    "RELEASE_NOTES.md",
    "dev_temp.md"
]

repo_path = "D:\\GoogleDrive\\RPA_dev\\01.AntiGravity\\Space_consult_assist"

for file in files_to_fix:
    path = os.path.join(repo_path, file)
    if os.path.exists(path):
        # Try to read as cp949, if it fails try utf-16le
        content = None
        try:
            with open(path, "r", encoding="cp949") as f:
                content = f.read()
        except UnicodeDecodeError:
            try:
                with open(path, "r", encoding="utf-16le") as f:
                    content = f.read()
            except Exception as e:
                print(f"Failed to read {file}: {e}")
                continue
        
        # If it looks like gibberish in cp949, it might have been saved as utf-8 but interpreted as something else, wait.
        # Actually, if it's broken on GitHub, GitHub assumes UTF-8. So it means the file is NOT UTF-8.
        # It's highly likely cp949 or utf-16le.
        
        # We will just write it back as utf-8
        if content:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Fixed {file}")
