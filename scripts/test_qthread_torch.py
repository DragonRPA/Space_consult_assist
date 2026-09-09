import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from PyQt5.QtCore import QThread, pyqtSignal
from PyQt5.QtWidgets import QApplication

class TestWorker(QThread):
    finished_sig = pyqtSignal(str)

    def run(self):
        try:
            import torch
            res = f"QThread 내 torch 로드 성공: {torch.__version__}"
        except Exception as e:
            res = f"QThread 내 torch 로드 실패: {e}"
        self.finished_sig.emit(res)

app = QApplication(sys.argv)
worker = TestWorker()

def on_finished(res):
    print(res)
    app.quit()

worker.finished_sig.connect(on_finished)
worker.start()
app.exec_()
