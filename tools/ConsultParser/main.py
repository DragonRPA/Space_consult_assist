"""
main.py
ConsultParser2 진입점
"""
import os
import sys
import ctypes

# Windows DLL 탐색 및 PyTorch C++ 런타임 사전 로드 (WinError 206 원천 방지)
if sys.platform == "win32":
    try:
        def _get_short_path(path_str: str) -> str:
            buf = ctypes.create_unicode_buffer(1024)
            if ctypes.windll.kernel32.GetShortPathNameW(path_str, buf, 1024) > 0:
                return buf.value
            return path_str

        import site
        for sp in site.getsitepackages():
            t_lib = os.path.join(sp, "torch", "lib")
            if os.path.exists(t_lib):
                short_lib = _get_short_path(t_lib)
                try:
                    os.add_dll_directory(short_lib)
                except Exception:
                    pass
                if short_lib not in os.environ.get("PATH", ""):
                    os.environ["PATH"] = short_lib + os.path.pathsep + os.environ.get("PATH", "")

        import torch
    except Exception:
        pass

# Qt Windows QPA 플랫폼 플러그인 경로 자동 탐색 및 보정
import PyQt5
qt_plugin_path = os.path.join(os.path.dirname(PyQt5.__file__), "Qt5", "plugins", "platforms")
if not os.path.exists(qt_plugin_path):
    qt_plugin_path = os.path.join(os.path.dirname(PyQt5.__file__), "Qt", "plugins", "platforms")
if os.path.exists(qt_plugin_path):
    os.environ["QT_QPA_PLATFORM_PLUGIN_PATH"] = qt_plugin_path

from PyQt5.QtWidgets import QApplication
from PyQt5.QtCore import Qt
from ui.main_window import MainWindow


def main():
    # HiDPI 지원 (PyQt5)
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)

    app = QApplication(sys.argv)
    app.setApplicationName("ConsultParser2")
    app.setOrganizationName("AntiGravity")

    window = MainWindow()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
