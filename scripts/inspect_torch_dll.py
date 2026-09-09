import os
import sys
import inspect
import torch

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

source = inspect.getsource(torch)
lines = source.splitlines()
for idx, line in enumerate(lines):
    if "def _load_dll_libraries" in line:
        print("\n".join(lines[idx+45:idx+95]))
        break
