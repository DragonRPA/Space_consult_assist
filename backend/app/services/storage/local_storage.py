import os
from pathlib import Path
from typing import BinaryIO
import logging
from .base import BaseStorageProvider

logger = logging.getLogger(__name__)

class LocalStorageProvider(BaseStorageProvider):
    """
    로컬 파일시스템 기반 스토리지 구현체
    """
    def __init__(self, base_dir: str = "./recordings"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, file_path: str) -> Path:
        return self.base_dir / file_path.lstrip("/\\")

    async def upload_file(self, file_obj: BinaryIO | bytes, destination_path: str, content_type: str = "audio/wav") -> str:
        target_path = self._resolve_path(destination_path)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        
        content = file_obj if isinstance(file_obj, (bytes, bytearray)) else file_obj.read()
        
        with open(target_path, "wb") as f:
            f.write(content)
            
        logger.info(f"[LocalStorageProvider] 파일 저장 완료: {target_path}")
        return str(target_path)

    async def download_file(self, file_path: str) -> bytes:
        target_path = self._resolve_path(file_path)
        if not target_path.exists():
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")
        with open(target_path, "rb") as f:
            return f.read()

    async def get_url(self, file_path: str) -> str:
        clean_path = file_path.lstrip("/\\")
        return f"/recordings/{clean_path}"

    async def delete_file(self, file_path: str) -> bool:
        target_path = self._resolve_path(file_path)
        if target_path.exists():
            target_path.unlink()
            logger.info(f"[LocalStorageProvider] 파일 삭제 완료: {target_path}")
            return True
        return False
