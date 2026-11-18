"""
ui/process_worker.py
처리 탭 보조 다이얼로그(오류 선택, 텍스트 미리보기·건너뛰기), 클릭 카드 위젯 및 STT·LLM 배치 워커 스레드
"""
import json
import os
import shutil
import time
from pathlib import Path
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QDialog, QListWidget, QListWidgetItem,
    QMessageBox, QTextEdit,
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QMutex, QMutexLocker
from PyQt5.QtGui import QCursor

from core.file_scanner import read_txt_content, FileItem
from core.stt_engine import STTEngine
from core.ollama_client import OllamaClient
from core.gemini_client import GeminiClient
from core.parser import parse_llm_response
from ui.widgets import PALETTE


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


