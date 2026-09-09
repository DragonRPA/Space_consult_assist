"""
ui/tab_process.py
처리 탭: 입력/출력 저장 폴더 지정, 서브폴더 재귀 검색, 간결한 1/2단계 모드 선택, 2줄 분리 통계 카드, 실시간 처리시간/평균 성능 지표, 현재 작업 파일 용량(MB/KB) 표시, 시작/중지, 작업 완료 시 PC 자동 종료, 3/4단계 후속 파이프라인(미검출 재분석, Supabase DB 전처리 수출)
"""
import json
import os
import shutil
import time
import subprocess
from pathlib import Path
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QLineEdit, QPushButton, QProgressBar, QFileDialog,
    QSizePolicy, QDialog, QListWidget, QListWidgetItem,
    QMessageBox, QRadioButton, QButtonGroup, QCheckBox,
    QComboBox, QTextEdit, QGroupBox, QGridLayout, QFrame,
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QMutex, QMutexLocker, QTimer, QTime
from PyQt5.QtGui import QCursor

from core.config_manager import load_config, save_config
from core.file_scanner import scan_folder, read_txt_content, FileItem
from core.stt_engine import STTEngine
from core.ollama_client import OllamaClient
from core.gemini_client import GeminiClient
from core.parser import parse_llm_response
from core.exporter import run_schema_migration, build_supabase_export
from ui.widgets import PALETTE, LogTextEdit, make_separator


def format_file_size(size_bytes: int) -> str:
    """바이트 단위 파일 크기를 KB/MB 직관 문자열로 포맷팅"""
    if size_bytes >= 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    elif size_bytes >= 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} B"


# ─────────────────────────────────────────────────────────────────
# 오류 파일 선택 다이얼로그
# ─────────────────────────────────────────────────────────────────
class ErrorSelectDialog(QDialog):
    def __init__(self, error_files: list[Path], parent=None):
        super().__init__(parent)
        self.error_files = error_files
        self.setWindowTitle("오류 발생 파일 목록 (선택 열기)")
        self.resize(560, 380)
        self.setStyleSheet(f"""
            QDialog {{
                background-color: {PALETTE['bg_primary']};
                color: {PALETTE['text_primary']};
            }}
            QListWidget {{
                background-color: {PALETTE['bg_tertiary']};
                color: {PALETTE['text_primary']};
                border: 1px solid {PALETTE['border']};
                border-radius: 6px;
                padding: 6px;
            }}
            QListWidget::item {{
                padding: 8px 10px;
                border-bottom: 1px solid {PALETTE['border']};
            }}
            QListWidget::item:hover {{
                background-color: {PALETTE['border']};
                border-radius: 4px;
            }}
            QListWidget::item:selected {{
                background-color: {PALETTE['accent']};
                color: white;
                border-radius: 4px;
            }}
        """)
        self._build_ui()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(12)

        info_lbl = QLabel(f"⚠️ 총 <b>{len(self.error_files)}</b>개의 오류 파일이 있습니다. 열어볼 파일을 선택하세요.")
        info_lbl.setStyleSheet(f"color: {PALETTE['text_primary']}; font-size: 13px;")
        layout.addWidget(info_lbl)

        self.list_widget = QListWidget()
        for path in self.error_files:
            item = QListWidgetItem(f"📄 {path.name} ({path.parent})")
            item.setData(Qt.UserRole, str(path))
            self.list_widget.addItem(item)

        self.list_widget.itemDoubleClicked.connect(self._open_selected)
        layout.addWidget(self.list_widget)

        btn_row = QHBoxLayout()
        self.open_folder_btn = QPushButton("📂 저장 폴더 열기")
        self.open_folder_btn.setProperty("class", "secondary")
        self.open_folder_btn.clicked.connect(self._open_folder)

        self.open_file_btn = QPushButton("📄 선택 파일 열기")
        self.open_file_btn.clicked.connect(self._open_selected)

        self.close_btn = QPushButton("닫기")
        self.close_btn.setProperty("class", "secondary")
        self.close_btn.clicked.connect(self.accept)

        btn_row.addWidget(self.open_folder_btn)
        btn_row.addStretch()
        btn_row.addWidget(self.open_file_btn)
        btn_row.addWidget(self.close_btn)
        layout.addLayout(btn_row)

    def _open_selected(self):
        selected = self.list_widget.currentItem()
        if not selected:
            QMessageBox.warning(self, "선택 안내", "열어볼 파일을 선택해주세요.")
            return
        path_str = selected.data(Qt.UserRole)
        file_path = Path(path_str)
        if file_path.exists():
            os.startfile(str(file_path))
        else:
            QMessageBox.warning(self, "파일 없음", f"파일을 찾을 수 없습니다:\n{path_str}")

    def _open_folder(self):
        if self.error_files:
            folder = self.error_files[0].parent
            if folder.exists():
                os.startfile(str(folder))


# ─────────────────────────────────────────────────────────────────
# 대화록 미리보기 & 1초 수동 스킵 팝업 다이얼로그 (사용자 100% 확인 대기)
# ─────────────────────────────────────────────────────────────────
class TextPreviewSkipDialog(QDialog):
    def __init__(self, filename: str, content: str, size_str: str, parent=None):
        super().__init__(parent)
        self.filename = filename
        self.content = content
        self.size_str = size_str
        self.result_action = "skip"  # 안전 기본값
        self.setWindowTitle(f"👁️ 대화록 미리보기 & 1초 수동 판정 - {filename}")
        self.resize(720, 520)
        self.setStyleSheet(f"""
            QDialog {{
                background-color: {PALETTE['bg_primary']};
                color: {PALETTE['text_primary']};
            }}
            QTextEdit {{
                background-color: {PALETTE['bg_tertiary']};
                color: {PALETTE['text_primary']};
                border: 1px solid {PALETTE['border']};
                border-radius: 6px;
                font-family: 'Consolas', 'Malgun Gothic', monospace;
                font-size: 13px;
                padding: 10px;
            }}
        """)
        self._build_ui()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(12)

        header_row = QHBoxLayout()
        title_lbl = QLabel(f"📄 <b>{self.filename}</b> ({self.size_str})")
        title_lbl.setStyleSheet(f"color: {PALETTE['accent']}; font-size: 14px;")
        header_row.addWidget(title_lbl)
        header_row.addStretch()
        layout.addLayout(header_row)

        self.text_view = QTextEdit()
        self.text_view.setReadOnly(True)
        self.text_view.setPlainText(self.content)
        layout.addWidget(self.text_view)

        stripped = self.content.strip()
        if len(stripped) < 15 or "연결되지 않았습니다" in stripped or "통화연결음" in stripped:
            warn_lbl = QLabel("⚠️ [참고 안내] 대화록 내용이 너무 짧거나 파싱 불가능한 연결음 문구로 추정됩니다. [🚫 파싱 불가/스킵] 추천!")
            warn_lbl.setStyleSheet("color: #F59E0B; font-weight: 700; font-size: 12px; margin-top: 2px;")
            layout.addWidget(warn_lbl)

        btn_row = QHBoxLayout()
        btn_row.setSpacing(10)

        self.btn_skip = QPushButton("🚫 파싱 불가 / 스킵 (0초 즉시 스킵)")
        self.btn_skip.setStyleSheet("""
            QPushButton {
                background-color: #EF4444;
                color: white;
                font-weight: 700;
                font-size: 13px;
                padding: 10px 20px;
                border-radius: 6px;
            }
            QPushButton:hover {
                background-color: #DC2626;
            }
        """)
        self.btn_skip.clicked.connect(self._on_skip)

        self.btn_analyze = QPushButton("▶️ LLM 분석 진행 (정상 대화록 분석)")
        self.btn_analyze.setStyleSheet(f"""
            QPushButton {{
                background-color: {PALETTE['accent']};
                color: white;
                font-weight: 700;
                font-size: 13px;
                padding: 10px 20px;
                border-radius: 6px;
            }}
            QPushButton:hover {{
                background-color: #2563EB;
            }}
        """)
        self.btn_analyze.clicked.connect(self._on_analyze)

        self.btn_stop = QPushButton("⏹ 전체 중지")
        self.btn_stop.setProperty("class", "secondary")
        self.btn_stop.clicked.connect(self._on_stop)

        btn_row.addWidget(self.btn_skip)
        btn_row.addWidget(self.btn_analyze)
        btn_row.addStretch()
        btn_row.addWidget(self.btn_stop)
        layout.addLayout(btn_row)

    def _on_skip(self):
        self.result_action = "skip"
        self.accept()

    def _on_analyze(self):
        self.result_action = "analyze"
        self.accept()

    def _on_stop(self):
        self.result_action = "stop"
        self.reject()


# ─────────────────────────────────────────────────────────────────
# 클릭 가능한 통계 카드 위젯 (슬림 고밀도 가로형 뱃지)
# ─────────────────────────────────────────────────────────────────
class ClickableCard(QWidget):
    clicked = pyqtSignal()

    def __init__(self, title: str, value: str, color: str, parent=None):
        super().__init__(parent)
        self.color = color
        self.setCursor(QCursor(Qt.PointingHandCursor))
        self._normal_style = f"""
            QWidget#CardWidget {{
                background: {PALETTE['bg_secondary']};
                border: 1px solid {PALETTE['border']};
                border-radius: 4px;
            }}
            QWidget#CardWidget:hover {{
                background: {PALETTE['bg_tertiary']};
                border: 1px solid {color};
            }}
        """
        self.setObjectName("CardWidget")
        self.setStyleSheet(self._normal_style)
        self.setFixedHeight(32)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(10, 2, 10, 2)
        layout.setSpacing(6)

        self.title_lbl = QLabel(title)
        self.title_lbl.setStyleSheet(f"color: {PALETTE['text_secondary']}; font-size: 11px; font-weight: 600; border: none; white-space: nowrap;")

        self.val_lbl = QLabel(value)
        self.val_lbl.setStyleSheet(f"color: {color}; font-size: 13px; font-weight: 700; border: none; white-space: nowrap;")
        self.val_lbl.setAlignment(Qt.AlignRight | Qt.AlignVCenter)

        layout.addWidget(self.title_lbl)
        layout.addStretch()
        layout.addWidget(self.val_lbl)

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.clicked.emit()
        super().mousePressEvent(event)


# ─────────────────────────────────────────────────────────────────
# 처리 워커 스레드
# ─────────────────────────────────────────────────────────────────
class ProcessWorker(QThread):
    log_signal       = pyqtSignal(str, str)                      # (message, level)
    status_signal    = pyqtSignal(str, str)                      # (status_text, color_code)
    progress_signal  = pyqtSignal(int, int, str)                 # (done_count, total_count, stage_prefix)
    file_done_signal = pyqtSignal(str, str, str, float)         # (file_stem, status, json_path, elapsed_sec)
    finished_signal  = pyqtSignal(int, int, int, float, float) # (success, error, skipped, total_elapsed_sec, avg_sec)
    preview_signal   = pyqtSignal(str, str, str, list)         # (txt_filename, content, size_str, res_holder)

    def __init__(self, items: list[FileItem], config: dict, process_mode: str = "all", sort_order: str = "size_asc", enable_preview_skip: bool = False):
        super().__init__()
        self.items = items
        self.config = config
        self.process_mode = process_mode  # "all", "stt_only", "llm_only"
        self.sort_order = sort_order      # "size_asc", "timestamp_asc"
        self.enable_preview_skip = enable_preview_skip  # 대화록 미리보기 & 수동 스킵 팝업 활성화 여부
        self._stop_requested = False
        self._mutex = QMutex()

    def request_stop(self):
        with QMutexLocker(self._mutex):
            self._stop_requested = True

    def _should_stop(self) -> bool:
        with QMutexLocker(self._mutex):
            return self._stop_requested

    def run(self):
        cfg = self.config
        mode = self.process_mode
        engine_type = cfg.get("engine_type", "ollama")
        prompt = cfg.get("prompt", "")
        stage3_prompt = cfg.get("stage3_prompt", "")
        skip_bytes = cfg.get("skip_bytes", 512)

        stt_engine = None
        llm_client = None
        llm_model = ""

        # 1단계 Whisper STT 엔진 준비 (실제로 변환할 음성 잔량이 존재할 때만 로드!)
        if mode in ["all", "stt_only"]:
            audio_pending = [i for i in self.items if i.file_type == "audio" and not i.stt_done]
            if audio_pending:
                w_model = cfg.get("whisper_model", "base")
                w_device = cfg.get("whisper_device", "auto")
                self.log_signal.emit(f"🎙️ OpenAI Whisper STT 준비 완료 (모델: {w_model}, 디바이스: {w_device})", "info")
                stt_engine = STTEngine(whisper_model=w_model, device_setting=w_device)

        # 2단계 LLM 분석 엔진 준비 (mode in ["all", "llm_only"])
        if mode in ["all", "llm_only"]:
            if engine_type == "gemini":
                api_key = cfg.get("gemini_api_key", "").strip()
                if not api_key:
                    self.log_signal.emit("❌ Gemini API 키가 설정되지 않았습니다. [설정] 탭에서 API 키를 입력해주세요.", "error")
                    self.status_signal.emit("❌ Gemini API 키 필요", "#EF4444")
                    self.finished_signal.emit(0, 0, 0, 0.0, 0.0)
                    return
                llm_client = GeminiClient(api_key)
                llm_model = cfg.get("gemini_model", "gemini-3.5-flash-lite")
                self.log_signal.emit(f"🔌 Google Gemini API 클라이언트 준비 완료 ({llm_model})", "success")
            else:
                llm_client = OllamaClient(cfg.get("ollama_url", "http://localhost:11434"))
                llm_model = cfg.get("model", "gemma3:12b")
                # 설명 수식어가 붙어있을 경우 순수 모델명만 추출 (예: 'gemma3:12b (...) ' -> 'gemma3:12b')
                llm_model = llm_model.split(" ")[0].strip()

                if not llm_client.ping():
                    self.log_signal.emit(f"❌ Ollama 서버에 연결할 수 없습니다: {cfg.get('ollama_url', 'http://localhost:11434')}", "error")
                    self.status_signal.emit("❌ Ollama 연결 실패", "#EF4444")
                    self.finished_signal.emit(0, 0, 0, 0.0, 0.0)
                    return
                self.log_signal.emit(f"🔌 Ollama 서버 연결 확인 완료 ({llm_model})", "success")

        batch_start_time = time.time()
        success_cnt = 0
        error_cnt = 0
        skipped_cnt = 0

        # =================================================================
        # [1단계 파이프라인] 음성(m4a/mp3/wav) ➔ 정형화 .txt 변환 및 오디오 보관
        # =================================================================
        if mode in ["all", "stt_only"]:
            audio_pending = [i for i in self.items if i.file_type == "audio" and not i.stt_done]
            total_audio = len(audio_pending)

            if total_audio > 0:
                # 💡 [정렬 지원]: 용량 오름차순 vs 타임스탬프 오름차순
                if self.sort_order == "size_asc":
                    audio_pending.sort(key=lambda x: (x.size_bytes, x.original_path.name))
                    self.log_signal.emit(f"🎧 [1단계 작업 시작] 총 {total_audio}개 음성 파일 (⚖️ 용량 오름차순 정렬) STT 변환 진행", "info")
                else:
                    audio_pending.sort(key=lambda x: x.original_path.name)
                    self.log_signal.emit(f"🎧 [1단계 작업 시작] 총 {total_audio}개 음성 파일 (⏰ 타임스탬프 오름차순 정렬) STT 변환 진행", "info")
                self.status_signal.emit("🎙️ 음성 STT 변환 연산 중...", "#3B82F6")

                for idx, item in enumerate(audio_pending):
                    if self._should_stop():
                        self.log_signal.emit("⏹ 사용자 요청으로 1단계 중지되었습니다.", "warning")
                        break

                    orig_path = item.original_path
                    new_txt_path = item.target_txt_path
                    size_str = format_file_size(item.size_bytes)

                    self.log_signal.emit(
                        f"  [1단계 {idx+1}/{total_audio}] 🎙️ {orig_path.name} ({size_str}) ➔ {new_txt_path.name}",
                        "info"
                    )
                    self.progress_signal.emit(idx, total_audio, "[1단계 STT >> txt]")
                    t0 = time.time()

                    try:
                        def _stt_cb(pct, msg):
                            self.status_signal.emit(f"🎙️ Whisper STT {pct}% ({size_str} - {msg})", "#3B82F6")

                        transcript = stt_engine.process_audio(str(orig_path), progress_callback=_stt_cb)

                        # 1단계 성공 시 비로소 stt_texts 및 completed_audio 폴더 물리적 생성
                        new_txt_path.parent.mkdir(parents=True, exist_ok=True)
                        new_txt_path.write_text(transcript, encoding="utf-8")

                        # completed_audio/ 폴더로 원본 음성 이관 보관 (명시적 설정 경로 우선)
                        comp_audio_setting = cfg.get("completed_audio_dir")
                        completed_audio_dir = Path(comp_audio_setting) if comp_audio_setting else (new_txt_path.parent.parent / "completed_audio")
                        completed_audio_dir.mkdir(parents=True, exist_ok=True)
                        dst_audio_file = completed_audio_dir / orig_path.name

                        try:
                            if orig_path.exists():
                                if dst_audio_file.exists():
                                    dst_audio_file.unlink()
                                shutil.move(str(orig_path), str(dst_audio_file))
                        except Exception as move_err:
                            pass

                        elapsed = time.time() - t0
                        self.log_signal.emit(f"   ✅ STT 변환 성공 ({size_str}, {elapsed:.1f}초)", "success")
                        item.stt_done = True
                        success_cnt += 1

                    except Exception as e:
                        elapsed = time.time() - t0
                        self.log_signal.emit(f"   ❌ STT 변환 실패 ({size_str}, {elapsed:.1f}초): {e}", "error")
                        error_cnt += 1

                self.progress_signal.emit(total_audio, total_audio, "[1단계 STT >> txt 완료]")

        # =================================================================
        # [2단계 파이프라인] .txt 파일 ➔ 다중 선택 LLM JSON 분석
        # =================================================================
        if mode in ["all", "llm_only"] and not self._should_stop():
            txt_targets = []
            for item in self.items:
                # 💡 [지능형 파싱실패 스킵 & 타 엔진 재작업 허용 로직]
                prev_json = item.target_json_path
                if not prev_json.exists():
                    fail_json = prev_json.parent / f"{prev_json.stem}_파싱실패.json"
                    if fail_json.exists():
                        prev_json = fail_json

                is_fail_tagged = "_파싱실패" in item.target_txt_path.stem or "_파싱실패" in item.original_path.stem or prev_json.name.endswith("_파싱실패.json")

                # 💡 [핵심 수정]: 파일명에 '_파싱실패' 태그가 부과되어 있는 파일은 2단계 대상에서 무조건 제외!
                if is_fail_tagged:
                    skipped_cnt += 1
                    continue

                # 💡 이전 결과 JSON이 존재하고 이미 완료/스킵/오류 기록이 있는 건 역시 무조건 제외!
                if prev_json.exists():
                    try:
                        prev_data = json.loads(prev_json.read_text(encoding="utf-8"))
                        prev_status = prev_data.get("processing_status")
                        if prev_status in ["success", "skipped_user", "skipped_empty", "parse_error", "timeout_error"]:
                            if prev_status != "success":
                                skipped_cnt += 1
                            continue
                    except Exception:
                        pass

                if item.file_type == "text" and not item.skipped_small:
                    if not item.json_done:
                        txt_targets.append((item.original_path, item.target_json_path, item.size_bytes))
                elif item.file_type == "audio" and item.stt_done:
                    if not item.json_done:
                        txt_size = item.target_txt_path.stat().st_size if item.target_txt_path.exists() else 0
                        txt_targets.append((item.target_txt_path, item.target_json_path, txt_size))

            total_txt = len(txt_targets)

            if total_txt > 0:
                # 💡 [정렬 지원]: 용량 오름차순 (0B/소용량 파일 최우선!) vs 타임스탬프 오름차순
                if self.sort_order == "size_asc":
                    txt_targets.sort(key=lambda x: (x[2], x[0].name))
                    self.log_signal.emit(f"🤖 [2단계 작업 시작] 총 {total_txt}개 .txt 파일 (⚖️ 용량 오름차순 정렬, 0B/소용량 우선) LLM 분석 진행", "info")
                else:
                    txt_targets.sort(key=lambda x: x[0].name)
                    self.log_signal.emit(f"🤖 [2단계 작업 시작] 총 {total_txt}개 .txt 파일 (⏰ 타임스탬프 오름차순 정렬) LLM 분석 진행", "info")

                for idx, (txt_p, json_p, txt_sz) in enumerate(txt_targets):
                    if self._should_stop():
                        self.log_signal.emit("⏹ 사용자 요청으로 2단계 중지되었습니다.", "warning")
                        break

                    name = txt_p.name
                    size_str = format_file_size(txt_sz)
                    self.log_signal.emit(f"  [2단계 {idx+1}/{total_txt}] 🧠 {name} ({size_str})", "info")
                    self.progress_signal.emit(idx, total_txt, "[2단계 txt >> Json]")
                    t0 = time.time()

                    try:
                        content = read_txt_content(txt_p)

                        def _apply_fail_tag(status_tag: str):
                            skip_res = {
                                "audio_filename": txt_p.stem,
                                "processing_status": status_tag,
                                "model_used": llm_model,
                                "customer_name": "미지정",
                                "symptoms": [],
                                "actions": []
                            }
                            try:
                                json_p.parent.mkdir(parents=True, exist_ok=True)
                                json_p.write_text(json.dumps(skip_res, ensure_ascii=False, indent=2), encoding="utf-8")
                            except Exception:
                                pass

                            if "_파싱실패" not in txt_p.stem:
                                fail_stem = f"{txt_p.stem}_파싱실패"
                                fail_txt_p = txt_p.parent / f"{fail_stem}.txt"
                                fail_json_p = json_p.parent / f"{fail_stem}.json"
                                try:
                                    if txt_p.exists() and not fail_txt_p.exists():
                                        txt_p.rename(fail_txt_p)
                                    if json_p.exists() and not fail_json_p.exists():
                                        json_p.rename(fail_json_p)
                                    audio_dir = txt_p.parent.parent / "completed_audio"
                                    old_m4a = audio_dir / f"{txt_p.stem}.m4a"
                                    fail_m4a = audio_dir / f"{fail_stem}.m4a"
                                    if old_m4a.exists() and not fail_m4a.exists():
                                        old_m4a.rename(fail_m4a)
                                except Exception:
                                    pass

                        # 💡 [원칙 1] 대화록 실시간 미리보기 & 1초 수동 판정 체크박스 켜짐 시:
                        # 시스템이 임의로 건너뛰거나 자동 진행하지 않고 1건도 빠짐없이 100% 팝업으로 표출하여 사장님께 확인받음!
                        if self.enable_preview_skip:
                            res_holder = []
                            self.preview_signal.emit(name, content, size_str, res_holder)
                            user_act = res_holder[0] if res_holder else "skip"

                            if user_act == "stop":
                                self.log_signal.emit("⏹ 사용자 요청으로 중지되었습니다.", "warning")
                                break
                            elif user_act == "skip":
                                # 💡 [원칙 2] 스킵 클릭 시 '_파싱실패' 태그 디스크 부여 후 0.00초 만에 즉시 다음 순서 파일 팝업으로 직행!
                                self.log_signal.emit(f"   🚫 사용자 판별 파싱 불가 ➔ '_파싱실패' 태그 부여 및 즉시 다음 파일 팝업 ({name})", "warning")
                                _apply_fail_tag("skipped_user")
                                skipped_cnt += 1
                                self.file_done_signal.emit(txt_p.stem, "skip", str(json_p), 0.0)
                                self.progress_signal.emit(idx + 1, total_txt, "[2단계 txt >> Json]")
                                continue
                        else:
                            # 💡 체크박스가 꺼져있을 때만(완전 자동 모드) 0B/초단문/스팸 자동 스킵 실행
                            stripped = content.strip()
                            is_garbage = (
                                len(stripped) < 15 or 
                                "연결되지 않았습니다" in stripped or 
                                "통화연결음" in stripped or
                                "1등당첨" in stripped or
                                "광고" in stripped
                            )
                            if is_garbage:
                                self.log_signal.emit(f"   🚫 [자동 감지] 단문/스팸/연결음 ➔ '_파싱실패' 태그 부여 및 0초 자동 스킵 ({name})", "warning")
                                _apply_fail_tag("skipped_empty")
                                skipped_cnt += 1
                                self.file_done_signal.emit(txt_p.stem, "skip", str(json_p), 0.0)
                                self.progress_signal.emit(idx + 1, total_txt, "[2단계 txt >> Json]")
                                continue

                        def _status_cb(msg: str, color: str):
                            self.status_signal.emit(f"{msg} ({size_str})", color)

                        if engine_type == "gemini":
                            raw_resp = llm_client.generate(
                                llm_model, prompt, content,
                                status_callback=_status_cb,
                                stop_checker=self._should_stop
                            )
                            time.sleep(3.5)
                        else:
                            self.status_signal.emit(f"🦙 Ollama ({llm_model}) 추론 중... ({size_str})", "#3B82F6")
                            raw_resp = llm_client.generate(llm_model, prompt, content)
                            self.status_signal.emit("✅ Ollama 추론 완료", "#10B981")

                        result = parse_llm_response(raw_resp, txt_p, llm_model)
                        json_p.parent.mkdir(parents=True, exist_ok=True)
                        json_p.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

                        elapsed = time.time() - t0
                        status = result["processing_status"]

                        if status == "success":
                            # 성공 시 이전에 _파싱실패 태그가 달려있던 파일이라면 복원 정형화!
                            if "_파싱실패" in txt_p.stem:
                                clean_stem = txt_p.stem.replace("_파싱실패", "")
                                new_txt_p = txt_p.parent / f"{clean_stem}.txt"
                                new_json_p = json_p.parent / f"{clean_stem}.json"
                                try:
                                    if txt_p.exists() and not new_txt_p.exists():
                                        txt_p.rename(new_txt_p)
                                    if json_p.exists() and not new_json_p.exists():
                                        json_p.rename(new_json_p)
                                    # m4a도 연동 복원
                                    audio_dir = txt_p.parent.parent / "completed_audio"
                                    old_m4a = audio_dir / f"{txt_p.stem}.m4a"
                                    new_m4a = audio_dir / f"{clean_stem}.m4a"
                                    if old_m4a.exists() and not new_m4a.exists():
                                        old_m4a.rename(new_m4a)
                                except Exception:
                                    pass

                            sym_count = len(result.get("증상") or result.get("symptoms") or [])
                            act_count = len(result.get("조치") or result.get("actions") or [])
                            self.log_signal.emit(f"   ✅ JSON 추출 완료 → 증상 {sym_count}건, 조치 {act_count}건 ({size_str}, {elapsed:.1f}초)", "success")
                            success_cnt += 1
                            self.file_done_signal.emit(txt_p.stem, "success", str(json_p), elapsed)
                        else:
                            # 💡 파싱 실패 시 원본 txt 및 연관 m4a 파일명에 '_파싱실패' 태그 부여
                            if "_파싱실패" not in txt_p.stem:
                                fail_stem = f"{txt_p.stem}_파싱실패"
                                fail_txt_p = txt_p.parent / f"{fail_stem}.txt"
                                fail_json_p = json_p.parent / f"{fail_stem}.json"
                                try:
                                    if txt_p.exists() and not fail_txt_p.exists():
                                        txt_p.rename(fail_txt_p)
                                    if json_p.exists() and not fail_json_p.exists():
                                        json_p.rename(fail_json_p)
                                    audio_dir = txt_p.parent.parent / "completed_audio"
                                    old_m4a = audio_dir / f"{txt_p.stem}.m4a"
                                    fail_m4a = audio_dir / f"{fail_stem}.m4a"
                                    if old_m4a.exists() and not fail_m4a.exists():
                                        old_m4a.rename(fail_m4a)
                                except Exception:
                                    pass

                            self.log_signal.emit(f"   ⚠ 파싱 실패 → '_파싱실패' 태그 부여 ({size_str}, {elapsed:.1f}초)", "warning")
                            error_cnt += 1
                            self.file_done_signal.emit(txt_p.stem, "error", str(json_p), elapsed)

                    except InterruptedError:
                        self.log_signal.emit("⏹ 사용자 요청으로 중지되었습니다.", "warning")
                        break
                    except Exception as e:
                        elapsed = time.time() - t0
                        err_msg = str(e)
                        self.log_signal.emit(f"   ❌ LLM 추출 오류 ({size_str}, {elapsed:.1f}초): {err_msg}", "error")

                        # 💡 35초 타임아웃 / LLM 통신 오류 발생 시에도 timeout_error 상태 결과 JSON을 보존하고 _파싱실패 태그 부과!
                        err_result = {
                            "audio_filename": txt_p.stem,
                            "processing_status": "timeout_error" if "timeout" in err_msg.lower() else "parse_error",
                            "error_message": err_msg,
                            "model_used": llm_model,
                            "customer_name": "미지정",
                            "symptoms": [],
                            "actions": []
                        }
                        try:
                            json_p.parent.mkdir(parents=True, exist_ok=True)
                            json_p.write_text(json.dumps(err_result, ensure_ascii=False, indent=2), encoding="utf-8")

                            # 원본 txt 및 completed_audio m4a에 '_파싱실패' 태그 부여
                            if "_파싱실패" not in txt_p.stem:
                                fail_stem = f"{txt_p.stem}_파싱실패"
                                fail_txt_p = txt_p.parent / f"{fail_stem}.txt"
                                fail_json_p = json_p.parent / f"{fail_stem}.json"
                                if txt_p.exists() and not fail_txt_p.exists():
                                    txt_p.rename(fail_txt_p)
                                if json_p.exists() and not fail_json_p.exists():
                                    json_p.rename(fail_json_p)
                                audio_dir = txt_p.parent.parent / "completed_audio"
                                old_m4a = audio_dir / f"{txt_p.stem}.m4a"
                                fail_m4a = audio_dir / f"{fail_stem}.m4a"
                                if old_m4a.exists() and not fail_m4a.exists():
                                    old_m4a.rename(fail_m4a)
                        except Exception:
                            pass

                        error_cnt += 1
                        self.file_done_signal.emit(txt_p.stem, "error", str(json_p), elapsed)

                self.progress_signal.emit(total_txt, total_txt, "[2단계 txt >> Json 완료]")

        total_elapsed = time.time() - batch_start_time
        processed_total = success_cnt + error_cnt
        avg_sec = (total_elapsed / processed_total) if processed_total > 0 else 0.0

        self.status_signal.emit("⚪ 통신 대기 중", "#9CA3AF")
        self.finished_signal.emit(success_cnt, error_cnt, skipped_cnt, total_elapsed, avg_sec)


# ─────────────────────────────────────────────────────────────────
# 처리 탭 위젯
# ─────────────────────────────────────────────────────────────────
class ProcessTab(QWidget):
    def __init__(self, settings_tab, parent=None):
        super().__init__(parent)
        self.settings_tab = settings_tab
        self.config = load_config()
        self._worker: ProcessWorker | None = None
        self._all_items: list[FileItem] = []
        self._error_files: list[Path] = []
        self._user_stopped: bool = False

        # 시간 성능 측정 관련 변수
        self._start_timestamp: float = 0.0
        self._completed_count_in_batch: int = 0
        self._total_item_time_sum: float = 0.0
        self._timer = QTimer(self)
        self._timer.setInterval(1000)
        self._timer.timeout.connect(self._on_timer_tick)

        self._build_ui()

    # ──────────────────────────────────────────
    # UI 구성
    # ──────────────────────────────────────────
    def _build_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(16, 10, 16, 10)
        root.setSpacing(0)

        # ── 1. 작업 프로세스 모드 & 정렬 순서 단일 툴바 ──
        mode_bar = QHBoxLayout()
        mode_bar.setSpacing(8)

        self.mode_group = QButtonGroup(self)

        self.radio_mode_all = QRadioButton("1+2단계 통합")
        self.radio_mode_stt = QRadioButton("1단계 음성변환(STT)")
        self.radio_mode_llm = QRadioButton("2단계 텍스트분석(LLM)")

        mode_style = f"font-size: 12px; font-weight: 600; color: {PALETTE['text_primary']}; white-space: nowrap;"
        self.radio_mode_all.setStyleSheet(mode_style)
        self.radio_mode_stt.setStyleSheet(mode_style)
        self.radio_mode_llm.setStyleSheet(mode_style)

        self.mode_group.addButton(self.radio_mode_all, 1)
        self.mode_group.addButton(self.radio_mode_stt, 2)
        self.mode_group.addButton(self.radio_mode_llm, 3)

        mode_saved = self.config.get("process_mode", "all")
        if mode_saved == "stt_only":
            self.radio_mode_stt.setChecked(True)
        elif mode_saved == "llm_only":
            self.radio_mode_llm.setChecked(True)
        else:
            self.radio_mode_all.setChecked(True)

        self.radio_mode_all.toggled.connect(self._on_mode_radio_changed)
        self.radio_mode_stt.toggled.connect(self._on_mode_radio_changed)
        self.radio_mode_llm.toggled.connect(self._on_mode_radio_changed)

        mode_bar.addWidget(self.radio_mode_all)
        mode_bar.addWidget(self.radio_mode_stt)
        mode_bar.addWidget(self.radio_mode_llm)

        mode_bar.addSpacing(10)
        mode_bar.addWidget(self._vsep())
        mode_bar.addSpacing(10)

        # 처리 정렬 순서
        sort_lbl = QLabel("정렬:")
        sort_lbl.setStyleSheet(f"font-size: 12px; font-weight: 600; color: {PALETTE['text_secondary']}; white-space: nowrap;")
        self.combo_sort_order = QComboBox()
        self.combo_sort_order.addItem("파일 용량순", "size_asc")
        self.combo_sort_order.addItem("파일 일시순", "timestamp_asc")
        self.combo_sort_order.setStyleSheet(f"""
            QComboBox {{
                background-color: {PALETTE['bg_secondary']};
                border: 1px solid {PALETTE['border']};
                border-radius: 4px;
                padding: 2px 8px;
                color: {PALETTE['accent']};
                font-weight: 600;
                font-size: 12px;
                white-space: nowrap;
                min-height: 22px;
            }}
        """)
        saved_sort = self.config.get("sort_order", "size_asc")
        sort_idx = self.combo_sort_order.findData(saved_sort)
        if sort_idx >= 0:
            self.combo_sort_order.setCurrentIndex(sort_idx)

        mode_bar.addWidget(sort_lbl)
        mode_bar.addWidget(self.combo_sort_order)

        mode_bar.addSpacing(10)
        mode_bar.addWidget(self._vsep())
        mode_bar.addSpacing(10)

        # 2단계 대화록 수동 검수 (스킵/분석)
        self.chk_preview_skip = QCheckBox("2단계 수동 검수 (스킵/분석)")
        self.chk_preview_skip.setStyleSheet("""
            QCheckBox {
                color: #10B981;
                font-weight: 600;
                font-size: 12px;
                white-space: nowrap;
            }
        """)
        saved_preview = self.config.get("enable_preview_skip", False)
        self.chk_preview_skip.setChecked(saved_preview)
        mode_bar.addWidget(self.chk_preview_skip)

        mode_bar.addStretch()

        root.addLayout(mode_bar)
        root.addSpacing(6)

        # ── 2. 각 기능별 4대 입출력 경로 패널 ──
        paths_group = QGroupBox("입출력 경로 설정")
        paths_group.setStyleSheet(f"""
            QGroupBox {{
                font-weight: 700;
                font-size: 12px;
                color: {PALETTE['accent']};
                border: 1px solid {PALETTE['border']};
                border-radius: 6px;
                margin-top: 4px;
                padding-top: 10px;
            }}
            QGroupBox::title {{
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 4px;
            }}
        """)
        paths_grid = QGridLayout(paths_group)
        paths_grid.setContentsMargins(10, 8, 10, 8)
        paths_grid.setHorizontalSpacing(12)
        paths_grid.setVerticalSpacing(6)

        btn_style = f"""
            QPushButton {{
                background-color: {PALETTE['bg_secondary']};
                border: 1px solid {PALETTE['border']};
                border-radius: 4px;
                color: {PALETTE['text_primary']};
                font-size: 12px;
                font-weight: 600;
                padding: 0 8px;
                white-space: nowrap;
            }}
            QPushButton:hover {{
                background-color: {PALETTE['bg_tertiary']};
                border-color: {PALETTE['accent']};
            }}
        """

        # 1) 음성 원본 폴더 (입력)
        box_input_audio = QVBoxLayout()
        box_input_audio.setSpacing(2)
        lbl_input_audio = self._field_label("① 음성 원본 폴더 (1단계 STT 대상 .m4a / .mp3)")
        row_input_audio = QHBoxLayout()
        row_input_audio.setSpacing(6)
        self.input_audio_edit = QLineEdit()
        self.input_audio_edit.setFixedHeight(28)
        self.input_audio_edit.setPlaceholderText("음성 원본 폴더를 선택하세요...")
        self.input_audio_edit.setText(self.config.get("input_audio_dir", self.config.get("last_input_folder", "D:/스페이스_원본")))
        self.input_audio_edit.textChanged.connect(self._on_any_path_changed)
        self.btn_browse_input_audio = QPushButton("폴더 찾기")
        self.btn_browse_input_audio.setFixedHeight(28)
        self.btn_browse_input_audio.setFixedWidth(80)
        self.btn_browse_input_audio.setStyleSheet(btn_style)
        self.btn_browse_input_audio.clicked.connect(self._browse_input_audio)
        row_input_audio.addWidget(self.input_audio_edit)
        row_input_audio.addWidget(self.btn_browse_input_audio)
        box_input_audio.addWidget(lbl_input_audio)
        box_input_audio.addLayout(row_input_audio)

        # 2) 대화록 텍스트 폴더 (1단계 출력 / 2단계 입력)
        box_stt_text = QVBoxLayout()
        box_stt_text.setSpacing(2)
        lbl_stt_text = self._field_label("② 대화록 텍스트 폴더 (1단계 STT 저장 및 2단계 소스)")
        row_stt_text = QHBoxLayout()
        row_stt_text.setSpacing(6)
        self.stt_text_edit = QLineEdit()
        self.stt_text_edit.setFixedHeight(28)
        self.stt_text_edit.setPlaceholderText("STT 텍스트(.txt) 저장/읽기 폴더를 선택하세요...")
        self.stt_text_edit.setText(self.config.get("stt_text_dir", "D:/스페이스_테스트/stt_texts"))
        self.stt_text_edit.textChanged.connect(self._on_any_path_changed)
        self.btn_browse_stt_text = QPushButton("폴더 찾기")
        self.btn_browse_stt_text.setFixedHeight(28)
        self.btn_browse_stt_text.setFixedWidth(80)
        self.btn_browse_stt_text.setStyleSheet(btn_style)
        self.btn_browse_stt_text.clicked.connect(self._browse_stt_text)
        row_stt_text.addWidget(self.stt_text_edit)
        row_stt_text.addWidget(self.btn_browse_stt_text)
        box_stt_text.addWidget(lbl_stt_text)
        box_stt_text.addLayout(row_stt_text)

        # 3) 완료 음성 보관 폴더
        box_completed_audio = QVBoxLayout()
        box_completed_audio.setSpacing(2)
        lbl_completed_audio = self._field_label("③ 완료 음성 보관 폴더 (1단계 완료 이관 보관)")
        row_completed_audio = QHBoxLayout()
        row_completed_audio.setSpacing(6)
        self.completed_audio_edit = QLineEdit()
        self.completed_audio_edit.setFixedHeight(28)
        self.completed_audio_edit.setPlaceholderText("변환 완료 음성 보관 폴더를 선택하세요...")
        self.completed_audio_edit.setText(self.config.get("completed_audio_dir", "D:/스페이스_테스트/completed_audio"))
        self.completed_audio_edit.textChanged.connect(self._on_any_path_changed)
        self.btn_browse_completed_audio = QPushButton("폴더 찾기")
        self.btn_browse_completed_audio.setFixedHeight(28)
        self.btn_browse_completed_audio.setFixedWidth(80)
        self.btn_browse_completed_audio.setStyleSheet(btn_style)
        self.btn_browse_completed_audio.clicked.connect(self._browse_completed_audio)
        row_completed_audio.addWidget(self.completed_audio_edit)
        row_completed_audio.addWidget(self.btn_browse_completed_audio)
        box_completed_audio.addWidget(lbl_completed_audio)
        box_completed_audio.addLayout(row_completed_audio)

        # 4) 분석 결과 JSON 폴더
        box_result_json = QVBoxLayout()
        box_result_json.setSpacing(2)
        lbl_result_json = self._field_label("④ 분석 결과 JSON 폴더 (2단계 LLM/SLM 최종 JSON 저장)")
        row_result_json = QHBoxLayout()
        row_result_json.setSpacing(6)
        self.result_json_edit = QLineEdit()
        self.result_json_edit.setFixedHeight(28)
        self.result_json_edit.setPlaceholderText("최종 JSON 결과 저장 폴더를 선택하세요...")
        self.result_json_edit.setText(self.config.get("result_json_dir", "D:/스페이스_테스트/result_json"))
        self.result_json_edit.textChanged.connect(self._on_any_path_changed)
        self.btn_browse_result_json = QPushButton("폴더 찾기")
        self.btn_browse_result_json.setFixedHeight(28)
        self.btn_browse_result_json.setFixedWidth(80)
        self.btn_browse_result_json.setStyleSheet(btn_style)
        self.btn_browse_result_json.clicked.connect(self._browse_result_json)
        row_result_json.addWidget(self.result_json_edit)
        row_result_json.addWidget(self.btn_browse_result_json)
        box_result_json.addWidget(lbl_result_json)
        box_result_json.addLayout(row_result_json)

        paths_grid.addLayout(box_input_audio, 0, 0)
        paths_grid.addLayout(box_stt_text, 0, 1)
        paths_grid.addLayout(box_completed_audio, 1, 0)
        paths_grid.addLayout(box_result_json, 1, 1)

        root.addWidget(paths_group)
        root.addSpacing(4)

        # 기존 변수 호환성 별칭 매핑
        self.folder_edit = self.input_audio_edit
        self.output_folder_edit = self.result_json_edit
        self.browse_btn = self.btn_browse_input_audio
        self.output_browse_btn = self.btn_browse_result_json

        # 하위 유틸리티 행 (파일명 정규화 점검 버튼)
        output_info_row = QHBoxLayout()
        self.output_label = QLabel(f"저장 위치: {self.result_json_edit.text().strip()}")
        self.output_label.setStyleSheet(f"color: {PALETTE['text_muted']}; font-size: 11px;")
        output_info_row.addWidget(self.output_label)
        output_info_row.addStretch()

        self.btn_sync_filenames = QPushButton("🛠️ 파일명 정규화 점검")
        self.btn_sync_filenames.setFixedHeight(24)
        self.btn_sync_filenames.setStyleSheet(f"""
            QPushButton {{
                color: #F59E0B;
                border: 1px solid #F59E0B;
                font-weight: 600;
                font-size: 11px;
                padding: 0 10px;
                border-radius: 4px;
                background-color: transparent;
                white-space: nowrap;
            }}
            QPushButton:hover {{
                background-color: {PALETTE['bg_tertiary']};
                border: 1px solid #D97706;
            }}
        """)
        self.btn_sync_filenames.clicked.connect(self._on_click_sync_filenames)
        output_info_row.addWidget(self.btn_sync_filenames)
        root.addLayout(output_info_row)
        root.addSpacing(6)

        # ── 3. 고밀도 컴팩트 1:1 대사 집계 바 (슬림 2행 구조) ──
        stats_group = QWidget()
        stats_layout = QVBoxLayout(stats_group)
        stats_layout.setContentsMargins(0, 0, 0, 0)
        stats_layout.setSpacing(4)

        # [행 1] 1단계 STT 집계 행
        row1_box = QHBoxLayout()
        row1_box.setSpacing(6)
        lbl_stage1 = QLabel("1단계 STT")
        lbl_stage1.setFixedWidth(70)
        lbl_stage1.setStyleSheet(f"color: {PALETTE['accent']}; font-weight: 700; font-size: 12px; white-space: nowrap;")
        row1_box.addWidget(lbl_stage1)

        self.stt_stat_total   = ClickableCard("전체 대상", "0", PALETTE['text_secondary'])
        self.stt_stat_pending = ClickableCard("미변환 잔여", "0", PALETTE['accent'])
        self.stt_stat_done    = ClickableCard("변환 완료", "0", PALETTE['success'])
        self.stt_stat_skip    = ClickableCard("스킵", "0", PALETTE['warning'])
        self.stt_stat_error   = ClickableCard("오류", "0", PALETTE['danger'])

        row1_box.addWidget(self.stt_stat_total)
        row1_box.addWidget(self.stt_stat_pending)
        row1_box.addWidget(self.stt_stat_done)
        row1_box.addWidget(self.stt_stat_skip)
        row1_box.addWidget(self.stt_stat_error)
        stats_layout.addLayout(row1_box)

        # [행 2] 2단계 LLM 집계 행
        row2_box = QHBoxLayout()
        row2_box.setSpacing(6)
        lbl_stage2 = QLabel("2단계 LLM")
        lbl_stage2.setFixedWidth(70)
        lbl_stage2.setStyleSheet(f"color: #10B981; font-weight: 700; font-size: 12px; white-space: nowrap;")
        row2_box.addWidget(lbl_stage2)

        self.llm_stat_total   = ClickableCard("전체 대상", "0", PALETTE['text_secondary'])
        self.llm_stat_pending = ClickableCard("미분석 잔여", "0", PALETTE['accent'])
        self.llm_stat_done    = ClickableCard("분석 완료", "0", PALETTE['success'])
        self.llm_stat_skip    = ClickableCard("스킵", "0", PALETTE['warning'])
        self.llm_stat_error   = ClickableCard("오류", "0", PALETTE['danger'])
        self.llm_stat_error.clicked.connect(self._on_error_card_clicked)

        row2_box.addWidget(self.llm_stat_total)
        row2_box.addWidget(self.llm_stat_pending)
        row2_box.addWidget(self.llm_stat_done)
        row2_box.addWidget(self.llm_stat_skip)
        row2_box.addWidget(self.llm_stat_error)
        stats_layout.addLayout(row2_box)

        root.addWidget(stats_group)
        root.addSpacing(6)

        # ── 프로그레스바 ──
        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        self.progress_bar.setFormat("%v / %m (%p%)")
        self.progress_bar.setMinimumHeight(18)
        self.progress_bar.setMaximumHeight(20)
        root.addWidget(self.progress_bar)
        root.addSpacing(8)

        # ── 4. 시작/중지 버튼, 성능 지표 & PC 자동 종료 옵션 ──
        btn_row = QHBoxLayout()
        btn_row.setSpacing(8)

        self.start_btn = QPushButton("▶  분석 시작")
        self.start_btn.setMinimumHeight(32)
        self.start_btn.setMinimumWidth(120)
        self.start_btn.clicked.connect(self._start_processing)

        self.stop_btn = QPushButton("■  중지")
        self.stop_btn.setProperty("class", "danger")
        self.stop_btn.setMinimumHeight(32)
        self.stop_btn.setMinimumWidth(90)
        self.stop_btn.setEnabled(False)
        self.stop_btn.clicked.connect(self._stop_processing)

        btn_row.addWidget(self.start_btn)
        btn_row.addWidget(self.stop_btn)
        btn_row.addSpacing(8)

        badge_style = f"""
            QLabel {{
                background-color: {PALETTE['bg_secondary']};
                border: 1px solid {PALETTE['border']};
                border-radius: 4px;
                padding: 4px 8px;
                color: {PALETTE['text_primary']};
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
                min-height: 22px;
            }}
        """

        self.lbl_start_time = QLabel("시작시간: --:--:--")
        self.lbl_start_time.setStyleSheet(badge_style)

        self.lbl_elapsed_time = QLabel("소요시간: 00분 00초")
        self.lbl_elapsed_time.setStyleSheet(badge_style)

        self.lbl_avg_time = QLabel("건당 평균: -.-초/건")
        self.lbl_avg_time.setStyleSheet(f"""
            QLabel {{
                background-color: {PALETTE['bg_secondary']};
                border: 1px solid {PALETTE['accent']};
                border-radius: 4px;
                padding: 4px 8px;
                color: {PALETTE['accent']};
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
                min-height: 22px;
            }}
        """)

        btn_row.addWidget(self.lbl_start_time)
        btn_row.addWidget(self.lbl_elapsed_time)
        btn_row.addWidget(self.lbl_avg_time)

        # PC 자동 종료 체크박스 & 즉시 취소 버튼
        self.chk_autoshutdown = QCheckBox("작업 완료 시 PC 자동 종료")
        self.chk_autoshutdown.setStyleSheet(f"""
            QCheckBox {{
                color: #F59E0B;
                font-weight: 600;
                font-size: 11px;
                margin-left: 6px;
                white-space: nowrap;
            }}
        """)
        btn_row.addWidget(self.chk_autoshutdown)

        self.btn_cancel_shutdown = QPushButton("종료 예약 취소")
        self.btn_cancel_shutdown.setProperty("class", "secondary")
        self.btn_cancel_shutdown.setFixedHeight(26)
        self.btn_cancel_shutdown.setStyleSheet(f"""
            QPushButton {{
                color: #EF4444;
                border: 1px solid #EF4444;
                font-weight: 600;
                font-size: 11px;
                padding: 0 8px;
                border-radius: 4px;
                white-space: nowrap;
                background-color: transparent;
            }}
            QPushButton:hover {{
                background-color: #FEF2F2;
                color: #DC2626;
            }}
        """)
        self.btn_cancel_shutdown.clicked.connect(self._cancel_pc_shutdown)
        btn_row.addWidget(self.btn_cancel_shutdown)

        btn_row.addStretch()
        root.addLayout(btn_row)
        root.addSpacing(6)

        # ── 5. [3단계/4단계] 후속 파이프라인 전용 액션 패널 ──
        post_panel_layout = QHBoxLayout()
        post_panel_layout.setSpacing(8)

        self.btn_stage3_reanalyze = QPushButton("🔍 [3단계] 미검출 건(증상0/조치0) 재분석")
        self.btn_stage3_reanalyze.setProperty("class", "secondary")
        self.btn_stage3_reanalyze.setFixedHeight(28)
        self.btn_stage3_reanalyze.setStyleSheet(f"""
            QPushButton {{
                color: #F59E0B;
                border: 1px solid #F59E0B;
                font-weight: 600;
                font-size: 11px;
                padding: 0 10px;
                border-radius: 4px;
                white-space: nowrap;
            }}
            QPushButton:hover {{
                background-color: {PALETTE['bg_tertiary']};
            }}
        """)
        self.btn_stage3_reanalyze.clicked.connect(self._run_stage3_reanalysis)

        self.btn_stage4_export = QPushButton("📦 [4단계] JSON 데이터베이스 변환 및 적재")
        self.btn_stage4_export.setProperty("class", "secondary")
        self.btn_stage4_export.setFixedHeight(28)
        self.btn_stage4_export.setStyleSheet(f"""
            QPushButton {{
                color: {PALETTE['accent']};
                border: 1px solid {PALETTE['accent']};
                font-weight: 600;
                font-size: 11px;
                padding: 0 10px;
                border-radius: 4px;
                white-space: nowrap;
            }}
            QPushButton:hover {{
                background-color: {PALETTE['bg_tertiary']};
            }}
        """)
        self.btn_stage4_export.clicked.connect(self._run_stage4_export)

        post_panel_layout.addWidget(self.btn_stage3_reanalyze)
        post_panel_layout.addWidget(self.btn_stage4_export)
        post_panel_layout.addStretch()

        root.addLayout(post_panel_layout)
        root.addSpacing(6)

        root.addWidget(make_separator())
        root.addSpacing(10)

        # ── 6. 로그 영역 & 통신 상태 레이블 ──
        log_header = QHBoxLayout()
        log_header.addWidget(self._section_label("처리 로그"))
        log_header.addSpacing(16)

        self.api_status_label = QLabel("⚪ 통신 대기 중")
        self.api_status_label.setStyleSheet(
            f"color: {PALETTE['text_muted']}; font-weight: 600; font-size: 13px; white-space: nowrap;"
        )
        log_header.addWidget(self.api_status_label)

        log_header.addStretch()
        self.clear_log_btn = QPushButton("로그 지우기")
        self.clear_log_btn.setProperty("class", "secondary")
        self.clear_log_btn.setFixedHeight(24)
        self.clear_log_btn.setFixedWidth(95)
        self.clear_log_btn.setStyleSheet(f"""
            QPushButton {{
                font-size: 11px;
                padding: 0 8px;
                white-space: nowrap;
            }}
        """)
        self.clear_log_btn.clicked.connect(lambda: self.log_view.clear())
        log_header.addWidget(self.clear_log_btn)
        root.addLayout(log_header)
        root.addSpacing(8)

        self.log_view = LogTextEdit()
        self.log_view.setMinimumHeight(180)
        root.addWidget(self.log_view)

        # 초기 폴더 스캔 설정
        in_f = self.config.get("last_input_folder", "")
        out_f = self.config.get("last_output_folder", "")
        if in_f:
            self._refresh_file_stats(in_f, out_f)

    def _section_label(self, text: str) -> QLabel:
        lbl = QLabel(text.upper())
        lbl.setProperty("class", "section-title")
        return lbl

    def _field_label(self, text: str) -> QLabel:
        lbl = QLabel(text)
        lbl.setStyleSheet(f"color: {PALETTE['text_secondary']}; font-size: 12px; margin-bottom: 2px; white-space: nowrap;")
        return lbl

    def _vsep(self) -> QFrame:
        line = QFrame()
        line.setFrameShape(QFrame.VLine)
        line.setFrameShadow(QFrame.Sunken)
        line.setStyleSheet(f"color: {PALETTE['border']};")
        return line

    def _get_selected_mode(self) -> str:
        if self.radio_mode_stt.isChecked():
            return "stt_only"
        elif self.radio_mode_llm.isChecked():
            return "llm_only"
        return "all"

    def _on_mode_radio_changed(self):
        in_f = self.folder_edit.text().strip()
        out_f = self.output_folder_edit.text().strip()
        if in_f:
            self._refresh_file_stats(in_f, out_f)

    # ──────────────────────────────────────────
    # [3단계 & 4단계 후속 파이프라인 핸들러]
    # ──────────────────────────────────────────
    def _run_stage3_reanalysis(self):
        res_json = self.result_json_edit.text().strip() if hasattr(self, 'result_json_edit') else ""
        if res_json:
            result_json_dir = Path(res_json)
        else:
            out_f = self.output_folder_edit.text().strip() or str(Path(self.folder_edit.text().strip()) / "result_output")
            result_json_dir = Path(out_f) / "result_json"

        if not result_json_dir.exists():
            QMessageBox.warning(self, "폴더 없음", f"결과 JSON 폴더를 찾을 수 없습니다:\n{result_json_dir}")
            return

        # 미검출 (증상 0건 & 조치 0건) 파일 조사
        zero_files = []
        for jf in result_json_dir.glob("*.json"):
            try:
                data = json.loads(jf.read_text(encoding="utf-8"))
                symptoms = data.get("symptoms") or data.get("증상") or []
                actions = data.get("actions") or data.get("조치") or []
                if len(symptoms) == 0 and len(actions) == 0:
                    zero_files.append(jf)
            except Exception:
                pass

        if not zero_files:
            QMessageBox.information(self, "미검출 건 없음", "🎉 미검출(증상 0건, 조치 0건)인 JSON 파일이 없습니다!")
            return

        reply = QMessageBox.question(
            self, "3단계 재분석 안내",
            f"⚠️ 총 {len(zero_files)}개의 미검출 건이 발견되었습니다.\n"
            f"1단계에서 변환된 stt_texts/ 원문을 읽어 선택된 분석 엔진으로 2차 재분석을 집행하시겠습니까?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )

        if reply == QMessageBox.StandardButton.Yes:
            self.radio_mode_llm.setChecked(True)
            self._start_processing()

    def _run_stage4_export(self):
        res_json = self.result_json_edit.text().strip() if hasattr(self, 'result_json_edit') else ""
        if res_json:
            result_json_dir = Path(res_json)
            export_out_dir = result_json_dir.parent / "supabase_export"
        else:
            out_f = self.output_folder_edit.text().strip() or str(Path(self.folder_edit.text().strip()) / "result_output")
            result_json_dir = Path(out_f) / "result_json"
            export_out_dir = Path(out_f) / "supabase_export"

        if not result_json_dir.exists():
            QMessageBox.warning(self, "폴더 없음", f"결과 JSON 폴더를 찾을 수 없습니다:\n{result_json_dir}")
            return

        def _export_cb(msg: str):
            self.log_view.append_log(msg, "info")
            self.api_status_label.setText(f"⚙️ {msg}")
            self.api_status_label.setStyleSheet("color: #3B82F6; font-weight: 700; font-size: 13px; white-space: nowrap;")
            from PyQt5.QtWidgets import QApplication
            QApplication.processEvents()

        self.log_view.append_log("🛠️ [4단계 시작] 전사 JSON 스키마 call_type 백필 마이그레이션 실행 중...", "info")
        mod_cnt, total_cnt = run_schema_migration(result_json_dir, progress_callback=_export_cb)
        self.log_view.append_log(f"   ✅ 스키마 보완 마이그레이션 완료 (수정: {mod_cnt}건 / 전체: {total_cnt}건)", "success")

        self.log_view.append_log("📦 [4단계 진행] merged_consults.json 병합 및 Supabase DB 전처리 수출 파일 생성 중...", "info")
        res = build_supabase_export(result_json_dir, export_out_dir, progress_callback=_export_cb)

        msg = (
            f"🎉 [4단계 수출 완료!]\n\n"
            f"1) 단일 통합 JSON: merged_consults.json ({res['merged_count']}건 병합)\n"
            f"2) Supabase Import용: supabase_export.json\n"
            f"3) Supabase SQL Editor용: supabase_seed.sql ({res['item_count']}개 증상/조치 디테일)\n\n"
            f"저장 폴더: {export_out_dir}"
        )
        self.log_view.append_log(msg, "success")
        self.api_status_label.setText("⚪ 통신 대기 중")
        self.api_status_label.setStyleSheet(f"color: {PALETTE['text_muted']}; font-weight: 600; font-size: 13px; white-space: nowrap;")

        reply = QMessageBox.information(
            self, "4단계 수출 완료 안내",
            msg + "\n\n수출 결과 저장 폴더를 열어보시겠습니까?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )

        if reply == QMessageBox.StandardButton.Yes:
            if export_out_dir.exists():
                os.startfile(str(export_out_dir))

    def _cancel_pc_shutdown(self):
        """Windows 시스템 셧다운 예약을 즉시 무력화 (shutdown /a)"""
        try:
            res = subprocess.run(["shutdown", "/a"], capture_output=True, text=True)
            if res.returncode == 0:
                self.log_view.append_log(
                    "✅ [PC 종료 예약 취소 완료] 'shutdown /a' 명령이 성공적으로 실행되어 시스템 종료 예약이 무력화되었습니다.",
                    "success"
                )
                QMessageBox.information(self, "종료 취소 완료", "✅ PC 자동 종료 예약(60초 셧다운)이 성공적으로 취소되었습니다!")
            else:
                err_msg = res.stderr.strip() or "예약된 종료 명령이 없거나 이미 취소되었습니다."
                self.log_view.append_log(f"ℹ️ [PC 종료 취소 안내] {err_msg}", "info")
                QMessageBox.information(self, "종료 취소 안내", f"ℹ️ {err_msg}")
        except Exception as e:
            self.log_view.append_log(f"❌ PC 종료 취소 실행 오류: {e}", "error")
            QMessageBox.warning(self, "실행 오류", f"종료 취소 실행 중 예외 발생:\n{e}")

    # ──────────────────────────────────────────
    # 이벤트 및 타이머 핸들러
    # ──────────────────────────────────────────
    def _on_click_sync_filenames(self):
        """사용자가 '🛠️ 파일명 점검 및 수정' 버튼을 클릭할 때 집행되는 명시적 파일명 정형화 핸들러"""
        in_f = self.input_audio_edit.text().strip() if hasattr(self, 'input_audio_edit') else self.folder_edit.text().strip()
        stt_txt = self.stt_text_edit.text().strip() if hasattr(self, 'stt_text_edit') else ""
        res_json = self.result_json_edit.text().strip() if hasattr(self, 'result_json_edit') else ""
        out_f = str(Path(res_json).parent if res_json else "")

        if not in_f or not Path(in_f).is_dir():
            QMessageBox.warning(self, "폴더 오류", "유효한 음성 원본 폴더를 먼저 선택해주세요.")
            return

        def _sync_cb(done: int, total: int, msg: str):
            self.progress_bar.setMaximum(max(total, 1))
            self.progress_bar.setValue(done)
            pct = int((done / max(total, 1)) * 100) if total > 0 else 100
            self.progress_bar.setFormat(f"[파일명 동기화 수정] %v / %m ({pct}%)")
            self.log_view.append_log(msg, "info" if total > 0 else "success")
            self.api_status_label.setText(f"🛠️ {msg[:45]}...")
            self.api_status_label.setStyleSheet("color: #F59E0B; font-weight: 700; font-size: 13px; white-space: nowrap;")
            from PyQt5.QtWidgets import QApplication
            QApplication.processEvents()

        self.btn_sync_filenames.setEnabled(False)
        from core.file_scanner import sync_filenames_by_timestamp
        completed_count, total_targets = sync_filenames_by_timestamp(
            in_f, out_f, progress_callback=_sync_cb,
            stt_text_dir=stt_txt, result_json_dir=res_json
        )
        self.btn_sync_filenames.setEnabled(True)

        self.api_status_label.setText("⚪ 통신 대기 중")
        self.api_status_label.setStyleSheet(f"color: {PALETTE['text_muted']}; font-weight: 600; font-size: 13px; white-space: nowrap;")

        if total_targets == 0:
            QMessageBox.information(self, "점검 완료", "✅ 모든 음성 및 JSON 파일명이 txt 기준 100% 동일하게 정형화되어 있습니다. 수정할 파일이 없습니다.")
        else:
            QMessageBox.information(
                self, "파일명 수정 완료",
                f"🎉 총 {total_targets}개 중 {completed_count}개 파일의 파일명이 txt 기준 1:1로 성공적으로 변경 수정되었습니다!"
            )
            self._refresh_file_stats(in_f, out_f)

    def _browse_input_audio(self):
        current = self.input_audio_edit.text() or "D:\\"
        folder = QFileDialog.getExistingDirectory(self, "음성 원본 폴더 선택", current)
        if folder:
            self.input_audio_edit.setText(folder)

    def _browse_stt_text(self):
        current = self.stt_text_edit.text() or "D:\\"
        folder = QFileDialog.getExistingDirectory(self, "대화록 텍스트 폴더 선택", current)
        if folder:
            self.stt_text_edit.setText(folder)

    def _browse_completed_audio(self):
        current = self.completed_audio_edit.text() or "D:\\"
        folder = QFileDialog.getExistingDirectory(self, "완료 음성 보관 폴더 선택", current)
        if folder:
            self.completed_audio_edit.setText(folder)

    def _browse_result_json(self):
        current = self.result_json_edit.text() or "D:\\"
        folder = QFileDialog.getExistingDirectory(self, "분석 결과 JSON 폴더 선택", current)
        if folder:
            self.result_json_edit.setText(folder)

    def _browse_folder(self):
        self._browse_input_audio()

    def _browse_output_folder(self):
        self._browse_result_json()

    def _on_any_path_changed(self, text: str = ""):
        self._refresh_file_stats()

    def _refresh_file_stats(self, input_folder_path: str = "", output_folder_path: str = ""):
        """2줄 독립 분리형 1단계(STT) 및 2단계(LLM) 통계 카드 집계 계산 (4대 명시적 경로 완벽 반영)"""
        in_audio = input_folder_path or (self.input_audio_edit.text().strip() if hasattr(self, 'input_audio_edit') else "")
        stt_txt = self.stt_text_edit.text().strip() if hasattr(self, 'stt_text_edit') else ""
        comp_aud = self.completed_audio_edit.text().strip() if hasattr(self, 'completed_audio_edit') else ""
        res_json = self.result_json_edit.text().strip() if hasattr(self, 'result_json_edit') else ""
        out_root = output_folder_path or str(Path(res_json).parent if res_json else "")

        if not in_audio or not Path(in_audio).is_dir():
            return

        cfg = load_config()
        if hasattr(self, 'settings_tab') and self.settings_tab:
            live_cfg = self.settings_tab.get_current_config()
            cfg.update(live_cfg)
        skip_bytes = cfg.get("skip_bytes", 512)
        mode = self._get_selected_mode()

        def _scan_callback(msg: str, level: str):
            self.log_view.append_log(msg, level)
            self.api_status_label.setText(f"📂 {msg[:45]}...")
            self.api_status_label.setStyleSheet("color: #3B82F6; font-weight: 700; font-size: 13px; white-space: nowrap;")
            from PyQt5.QtWidgets import QApplication
            QApplication.processEvents()

        try:
            self.api_status_label.setText("📂 입력 폴더 스캔 및 타임스탬프 1:1 동기화 탐색 중...")
            self.api_status_label.setStyleSheet("color: #3B82F6; font-weight: 700; font-size: 13px; white-space: nowrap;")
            self._all_items = scan_folder(
                in_audio, out_root, skip_bytes, mode,
                progress_callback=_scan_callback,
                stt_text_dir=stt_txt,
                completed_audio_dir=comp_aud,
                result_json_dir=res_json
            )

            # === [1줄] 1단계 STT >> txt 독립 집계 ===
            audio_items = [i for i in self._all_items if i.file_type == "audio"]
            stt_total   = len(audio_items)
            stt_done    = sum(1 for i in audio_items if i.stt_done)
            stt_pending = max(0, stt_total - stt_done)
            stt_skip    = 0
            stt_error   = 0

            self.stt_stat_total.val_lbl.setText(str(stt_total))
            self.stt_stat_pending.val_lbl.setText(str(stt_pending))
            self.stt_stat_done.val_lbl.setText(str(stt_done))
            self.stt_stat_skip.val_lbl.setText(str(stt_skip))
            self.stt_stat_error.val_lbl.setText(str(stt_error))

            # === [2줄] 2단계 txt >> Json 독립 집계 ===
            txt_items = [i for i in self._all_items if i.file_type == "text" or i.stt_done]
            llm_total   = len(txt_items)
            llm_done    = sum(1 for i in txt_items if i.json_done)
            llm_skip    = sum(1 for i in txt_items if i.skipped_small and not i.json_done)
            llm_pending = max(0, llm_total - llm_done - llm_skip)

            self._error_files.clear()
            out_dir = Path(output_folder_path) / "result_json" if output_folder_path else (Path(input_folder_path) / "result_output" / "result_json")
            if out_dir.exists():
                for json_file in out_dir.glob("*.json"):
                    try:
                        data = json.loads(json_file.read_text(encoding="utf-8"))
                        status = data.get("processing_status")
                        if status in ["parse_error", "timeout_error"]:
                            self._error_files.append(json_file)
                    except Exception:
                        pass

            llm_error = len(self._error_files)

            self.llm_stat_total.val_lbl.setText(str(llm_total))
            self.llm_stat_pending.val_lbl.setText(str(llm_pending))
            self.llm_stat_done.val_lbl.setText(str(llm_done))
            self.llm_stat_skip.val_lbl.setText(str(llm_skip))
            self.llm_stat_error.val_lbl.setText(str(llm_error))

            # 프로그레스 바 설정 (선택 모드 연동)
            if mode == "stt_only":
                active_max = max(stt_pending, 1)
            elif mode == "llm_only":
                active_max = max(llm_pending, 1)
            else:
                active_max = max(stt_pending + llm_pending, 1)

            self.progress_bar.setMaximum(active_max)
            self.progress_bar.setValue(0)
            self.progress_bar.setFormat(f"대기 중 (%v / %m)")

            self.api_status_label.setText("⚪ 통신 대기 중")
            self.api_status_label.setStyleSheet(f"color: {PALETTE['text_muted']}; font-weight: 600; font-size: 13px; white-space: nowrap;")
        except Exception as e:
            self.log_view.append_log(f"폴더 스캔 오류: {e}", "error")
            self.api_status_label.setText("❌ 폴더 스캔 오류 발생")
            self.api_status_label.setStyleSheet("color: #EF4444; font-weight: 700; font-size: 13px; white-space: nowrap;")

    def _on_timer_tick(self):
        if self._start_timestamp > 0:
            elapsed_sec = int(time.time() - self._start_timestamp)
            mins, secs = divmod(elapsed_sec, 60)
            hrs, mins = divmod(mins, 60)

            if hrs > 0:
                self.lbl_elapsed_time.setText(f"⏳ 소요시간: {hrs:02d}:{mins:02d}:{secs:02d}")
            else:
                self.lbl_elapsed_time.setText(f"⏳ 소요시간: {mins:02d}분 {secs:02d}초")

            if self._completed_count_in_batch > 0:
                avg = self._total_item_time_sum / self._completed_count_in_batch
                self.lbl_avg_time.setText(f"⚡ 건당 평균: {avg:.1f}초/건")

    def _start_processing(self):
        input_folder = self.input_audio_edit.text().strip()
        stt_txt = self.stt_text_edit.text().strip()
        comp_aud = self.completed_audio_edit.text().strip()
        res_json = self.result_json_edit.text().strip()
        output_folder = str(Path(res_json).parent if res_json else "")
        mode = self._get_selected_mode()

        if not input_folder or not Path(input_folder).is_dir():
            QMessageBox.warning(self, "폴더 오류", "유효한 음성 원본 폴더를 선택해주세요.")
            return

        cfg = load_config()
        if hasattr(self, 'settings_tab') and self.settings_tab:
            live_cfg = self.settings_tab.get_current_config()
            cfg.update(live_cfg)
        sort_order = self.combo_sort_order.currentData() or "size_asc"
        enable_preview_skip = self.chk_preview_skip.isChecked()
        cfg["last_input_folder"] = input_folder
        cfg["last_output_folder"] = output_folder
        cfg["input_audio_dir"] = input_folder
        cfg["stt_text_dir"] = stt_txt
        cfg["completed_audio_dir"] = comp_aud
        cfg["result_json_dir"] = res_json
        cfg["process_mode"] = mode
        cfg["sort_order"] = sort_order
        cfg["enable_preview_skip"] = enable_preview_skip
        save_config(cfg)

        # 💡 [사전 검증 1]: 2단계 수행 모드 시 분석 엔진 접속 유효성 사전 검사
        if mode in ["all", "llm_only"]:
            engine_type = cfg.get("engine_type", "ollama")
            if engine_type == "gemini":
                api_key = cfg.get("gemini_api_key", "").strip()
                if not api_key:
                    QMessageBox.warning(
                        self, "API 키 설정 필요",
                        "⚠️ Google Gemini API 키가 설정되지 않았습니다.\n\n"
                        "[설정] 탭으로 이동하여 Gemini API 키를 입력하거나, Ollama(로컬 LLM) 엔진으로 변경 후 다시 시도하세요."
                    )
                    self.log_view.append_log("❌ [분석 중단] Gemini API 키가 설정되지 않았습니다.", "error")
                    return
            else:
                ollama_url = cfg.get("ollama_url", "http://localhost:11434")
                try:
                    from core.ollama_client import OllamaClient
                    oc = OllamaClient(ollama_url)
                    if not oc.ping():
                        QMessageBox.warning(
                            self, "Ollama 서버 연결 실패",
                            f"⚠️ Ollama 서버에 연결할 수 없습니다:\n{ollama_url}\n\n"
                            "Ollama 서비스를 실행 중인지 확인하거나, [설정] 탭에서 Google Gemini 엔진으로 변경하세요."
                        )
                        self.log_view.append_log(f"❌ [분석 중단] Ollama 서버 연결 실패 ({ollama_url})", "error")
                        return
                except Exception as ping_err:
                    QMessageBox.warning(self, "엔진 연결 오류", f"Ollama 서버 확인 중 예외 발생:\n{ping_err}")
                    return

        skip_bytes = cfg.get("skip_bytes", 512)
        self._all_items = scan_folder(
            input_folder, output_folder, skip_bytes, mode,
            stt_text_dir=stt_txt,
            completed_audio_dir=comp_aud,
            result_json_dir=res_json
        )

        if not self._all_items:
            self.log_view.append_log("처리할 음성 또는 텍스트 파일이 없습니다.", "warning")
            return

        self.progress_bar.setMaximum(len(self._all_items))
        self.progress_bar.setValue(0)
        self._user_stopped = False
        self._reset_runtime_stats()

        self._start_timestamp = time.time()
        start_qtime = QTime.currentTime().toString("HH:mm:ss")
        self.lbl_start_time.setText(f"⏱️ 시작시간: {start_qtime}")
        self.lbl_elapsed_time.setText("⏳ 소요시간: 00분 00초")
        self.lbl_avg_time.setText("⚡ 건당 평균: -.-초/건")
        self._timer.start()

        self.start_btn.setEnabled(False)
        self.browse_btn.setEnabled(False)
        self.output_browse_btn.setEnabled(False)
        self.stop_btn.setEnabled(True)

        self._worker = ProcessWorker(
            self._all_items, cfg,
            process_mode=mode,
            sort_order=sort_order,
            enable_preview_skip=enable_preview_skip
        )
        self._worker.log_signal.connect(self._on_log)
        self._worker.status_signal.connect(self._on_status_changed)
        self._worker.progress_signal.connect(self._on_progress)
        self._worker.file_done_signal.connect(self._on_file_done)
        self._worker.finished_signal.connect(self._on_finished)
        self._worker.preview_signal.connect(self._on_preview_request, Qt.BlockingQueuedConnection)
        self._worker.start()

    def _stop_processing(self):
        self._user_stopped = True
        try:
            subprocess.run(["shutdown", "/a"], capture_output=True, text=True)
        except Exception:
            pass

        if self._worker and self._worker.isRunning():
            self._worker.request_stop()
            self.stop_btn.setEnabled(False)
            self.log_view.append_log("⏹ 사용자 요청 중지... 즉시 작업을 멈추고 PC 자동 종료를 차단합니다.", "warning")

    def _reset_runtime_stats(self):
        self.llm_stat_done.val_lbl.setText("0")
        self.llm_stat_error.val_lbl.setText("0")
        self._error_files.clear()
        self._completed_count_in_batch = 0
        self._total_item_time_sum = 0.0

    def _on_error_card_clicked(self):
        error_count = len(self._error_files)
        if error_count == 0:
            QMessageBox.information(self, "안내", "현재 발생한 오류 파일이 없습니다.")
        elif error_count == 1:
            err_file = self._error_files[0]
            if err_file.exists():
                os.startfile(str(err_file))
                self.log_view.append_log(f"📄 오류 파일 오픈: {err_file.name}", "info")
            else:
                QMessageBox.warning(self, "파일 없음", f"오류 파일을 찾을 수 없습니다:\n{err_file}")
        else:
            dialog = ErrorSelectDialog(self._error_files, self)
            dialog.exec_()

    # ──────────────────────────────────────────
    # 워커 시그널 핸들러
    # ──────────────────────────────────────────
    def _on_log(self, msg: str, level: str):
        self.log_view.append_log(msg, level)

    def _on_status_changed(self, text: str, color: str):
        self.api_status_label.setText(text)
        self.api_status_label.setStyleSheet(
            f"color: {color}; font-weight: 600; font-size: 13px; white-space: nowrap;"
        )

    def _on_progress(self, done: int, total: int, stage_prefix: str = ""):
        """프로그레스바 수치 및 진행 상태 텍스트 동기화"""
        self.progress_bar.setMaximum(max(total, 1))
        self.progress_bar.setValue(done)
        pct = int((done / max(total, 1)) * 100)
        prefix = f"{stage_prefix} " if stage_prefix else ""
        self.progress_bar.setFormat(f"{prefix}%v / %m ({pct}%)")

    def _on_file_done(self, stem: str, status: str, json_path_str: str, elapsed_sec: float):
        if status == "success":
            cur = int(self.llm_stat_done.val_lbl.text())
            self.llm_stat_done.val_lbl.setText(str(cur + 1))
            self._completed_count_in_batch += 1
            self._total_item_time_sum += elapsed_sec
        elif status == "error":
            cur = int(self.llm_stat_error.val_lbl.text())
            self.llm_stat_error.val_lbl.setText(str(cur + 1))
            self._completed_count_in_batch += 1
            self._total_item_time_sum += elapsed_sec
            json_path = Path(json_path_str)
            if json_path not in self._error_files:
                self._error_files.append(json_path)
        elif status == "skip":
            cur = int(self.llm_stat_skip.val_lbl.text())
            self.llm_stat_skip.val_lbl.setText(str(cur + 1))

        if self._completed_count_in_batch > 0:
            avg = self._total_item_time_sum / self._completed_count_in_batch
            self.lbl_avg_time.setText(f"⚡ 건당 평균: {avg:.1f}초/건")

    def _on_finished(self, success: int, error: int, skipped: int, total_elapsed_sec: float, avg_sec: float):
        self._timer.stop()
        self.start_btn.setEnabled(True)
        self.browse_btn.setEnabled(True)
        self.output_browse_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.api_status_label.setText("⚪ 통신 대기 중")
        self.api_status_label.setStyleSheet(
            f"color: {PALETTE['text_muted']}; font-weight: 600; font-size: 13px; white-space: nowrap;"
        )

        cfg = load_config()
        if hasattr(self, 'settings_tab') and self.settings_tab:
            cfg.update(self.settings_tab.get_current_config())

        mode = self._get_selected_mode()
        engine_type = cfg.get("engine_type", "ollama")
        if engine_type == "gemini":
            engine_desc = f"Google Gemini ({cfg.get('gemini_model', 'gemini-3.5-flash-lite')})"
        else:
            engine_desc = f"Ollama ({cfg.get('model', 'gemma3:12b')})"

        mins, secs = divmod(int(total_elapsed_sec), 60)
        time_str = f"{mins:02d}분 {secs:02d}초" if mins > 0 else f"{secs}초"

        self.lbl_elapsed_time.setText(f"⏳ 소요시간: {time_str}")
        if avg_sec > 0:
            self.lbl_avg_time.setText(f"⚡ 건당 평균: {avg_sec:.1f}초/건")

        mode_str = "1+2단계 연속" if mode == "all" else ("1단계 음성STT만" if mode == "stt_only" else "2단계 LLM분석만")

        self.log_view.append_log(
            f"📊 [작업 완료 요약 - {mode_str}] 2단계 분석 엔진: {engine_desc}\n"
            f"   - 성공 {success}건 | 오류 {error}건 | 스킵 {skipped}건\n"
            f"   - 총 소요시간: {time_str} ({total_elapsed_sec:.1f}초)\n"
            f"   - 1건당 평균 소요시간: {avg_sec:.2f}초 / 건",
            "success" if error == 0 else "warning",
        )

        in_f = self.folder_edit.text().strip()
        out_f = self.output_folder_edit.text().strip()
        if in_f:
            self._refresh_file_stats(in_f, out_f)

        # 🏁 PC 자동 종료 옵션 가동 체크 (사용자 중간 중지 시에는 절대 셧다운 금지!)
        is_user_stopped = self._user_stopped or (self._worker and self._worker._should_stop())
        if self.chk_autoshutdown.isChecked():
            if is_user_stopped:
                self.log_view.append_log(
                    "⏹ [PC 자동 종료 차단] 사용자에 의해 작업이 중간 중지되었으므로 PC 자동 종료를 집행하지 않습니다.",
                    "warning"
                )
                try:
                    subprocess.run(["shutdown", "/a"], capture_output=True, text=True)
                except Exception:
                    pass
            else:
                self.log_view.append_log(
                    "🏁 [PC 자동 종료 요청] 지정된 모든 작업 완수로 60초 후 Windows 시스템이 자동 종료됩니다.\n"
                    "   - 종료를 취소하려면 [🛑 종료 예약 취소] 버튼을 클릭하세요.",
                    "warning"
                )
                try:
                    subprocess.Popen(["shutdown", "/s", "/t", "60", "/c", "ConsultParser2 작업 완료로 60초 후 PC가 자동 종료됩니다."])
                except Exception as e:
                    self.log_view.append_log(f"⚠ PC 자동 종료 명령 호출 예외: {e}", "error")

    def _on_preview_request(self, filename: str, content: str, size_str: str, res_holder: list):
        """2단계 LLM 분석 직전 대화록 미리보기 & 1초 수동 스킵 모달 조치 (사용자 100% 판정 대기)"""
        from PyQt5.QtWidgets import QApplication
        dialog = TextPreviewSkipDialog(filename, content, size_str, parent=self)
        dialog.exec_()
        res_holder.append(dialog.result_action)
        dialog.deleteLater()
        QApplication.processEvents()
