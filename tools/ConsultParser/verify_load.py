import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import PyQt5
qt_plugin_path = os.path.join(os.path.dirname(PyQt5.__file__), "Qt5", "plugins", "platforms")
if os.path.exists(qt_plugin_path):
    os.environ["QT_QPA_PLATFORM_PLUGIN_PATH"] = qt_plugin_path

from PyQt5.QtWidgets import QApplication
from PyQt5.QtCore import Qt
from ui.main_window import MainWindow

app = QApplication(sys.argv)
window = MainWindow()
print("[SUCCESS] MainWindow successfully created!")
app.quit()
print("[SUCCESS] Qt platform plugin loaded and terminated cleanly!")
