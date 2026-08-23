import os
from abc import ABC, abstractmethod
import httpx
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# 재사용 가능한 글로벌 비동기 HTTP 클라이언트 (커넥션 풀링 및 10초 타임아웃)
_http_client: httpx.AsyncClient | None = None

def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=10.0)
    return _http_client

class NotificationService(ABC):
    @abstractmethod
    async def send_completion(self, phone: str, customer_name: str,
                              engineer_name: str, completed_at: str,
                              work_summary: str) -> bool:
        pass

    @abstractmethod
    async def send_visit_accepted(self, phone: str, customer_name: str,
                                  visit_date: str, contact: str) -> bool:
        pass

class MockNotificationService(NotificationService):
    """CEO 결재 전까지 로그만 기록, 실제 발송 안함"""
    async def send_completion(self, **kwargs) -> bool:
        logger.info(f"[MOCK 알림] 작업 완료 문자 발송 시뮬레이션: {kwargs}")
        return True

    async def send_visit_accepted(self, **kwargs) -> bool:
        logger.info(f"[MOCK 알림] 출장 접수 확인 시뮬레이션: {kwargs}")
        return True

class AligoKakaoService(NotificationService):
    """CEO 결재 이후 알리고 카카오 알림톡 실제 발송"""
    def __init__(self):
        self.ALIGO_KEY = os.getenv("ALIGO_KEY", "")
        self.ALIGO_USER = os.getenv("ALIGO_USER_ID", "")
        self.SENDER = os.getenv("ALIGO_SENDER", "")
        self.TPL_COMPLETION = os.getenv("ALIGO_TPL_COMPLETION", "")
        self.TPL_VISIT_ACCEPT = os.getenv("ALIGO_TPL_VISIT_ACCEPT", "")

    async def send_completion(self, phone: str, customer_name: str,
                               engineer_name: str, completed_at: str, work_summary: str) -> bool:
        payload = {
            "key": self.ALIGO_KEY, "userid": self.ALIGO_USER,
            "sender": self.SENDER, "receiver": phone,
            "kakao_type": "at",
            "template_code": self.TPL_COMPLETION,
            "message": (
                f"[스페이스] 출장 완료 안내\n\n"
                f"고객님 서비스가 완료되었습니다.\n\n"
                f"담당 기사: {engineer_name}\n"
                f"완료 시각: {completed_at}\n"
                f"작업 내용: {work_summary}\n\n"
                f"문의사항은 담당 AS센터로 연락 주시기 바랍니다."
            ),
        }
        try:
            client = _get_http_client()
            res = await client.post("https://apis.aligo.in/send/", data=payload)
            return res.json().get("result_code") == "1"
        except Exception as e:
            logger.error(f"[AligoKakaoService] send_completion 실패: {e}")
            return False

    async def send_visit_accepted(self, phone: str, customer_name: str,
                                   visit_date: str, contact: str) -> bool:
        payload = {
            "key": self.ALIGO_KEY, "userid": self.ALIGO_USER,
            "sender": self.SENDER, "receiver": phone,
            "kakao_type": "at",
            "template_code": self.TPL_VISIT_ACCEPT,
            "message": (
                f"[스페이스] 출장 접수 확인\n\n"
                f"고객님 출장 접수가 완료되었습니다.\n\n"
                f"예정 일시: {visit_date}\n"
                f"담당 연락처: {contact}\n\n"
                f"일정 변경이 필요하시면 담당 AS센터로 연락 주세요."
            ),
        }
        try:
            client = _get_http_client()
            res = await client.post("https://apis.aligo.in/send/", data=payload)
            return res.json().get("result_code") == "1"
        except Exception as e:
            logger.error(f"[AligoKakaoService] send_visit_accepted 실패: {e}")
            return False

_cached_service: NotificationService | None = None

def get_notification_service() -> NotificationService:
    global _cached_service
    if _cached_service is None:
        settings = get_settings()
        if settings.notification_enabled:
            _cached_service = AligoKakaoService()
        else:
            _cached_service = MockNotificationService()
    return _cached_service
