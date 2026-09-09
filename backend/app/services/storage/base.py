from abc import ABC, abstractmethod
from typing import BinaryIO

class BaseStorageProvider(ABC):
    """
    미디어 및 오디오 녹음 파일 스토리지 추상 인터페이스
    """
    @abstractmethod
    async def upload_file(self, file_obj: BinaryIO | bytes, destination_path: str, content_type: str = "audio/wav") -> str:
        """
        파일을 업로드하고 접근 가능한 URL 또는 파일 식별자를 반환
        """
        pass

    @abstractmethod
    async def download_file(self, file_path: str) -> bytes:
        """
        파일을 다운로드하여 바이트 데이터로 반환
        """
        pass

    @abstractmethod
    async def get_url(self, file_path: str) -> str:
        """
        파일의 공개 또는 서명된 접근 URL 반환
        """
        pass

    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """
        스토리지에서 파일 삭제
        """
        pass
