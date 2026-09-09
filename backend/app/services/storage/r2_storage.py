import io
import logging
from typing import BinaryIO
from .base import BaseStorageProvider

logger = logging.getLogger(__name__)

class CloudflareR2StorageProvider(BaseStorageProvider):
    """
    Cloudflare R2 ('drcf') S3 호환 스토리지 구현체
    """
    def __init__(self, account_id: str, access_key_id: str, secret_access_key: str,
                 bucket_name: str = "dragonrpa",
                 public_domain: str = "https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev"):
        self.account_id = account_id
        self.bucket_name = bucket_name
        self.public_domain = public_domain.rstrip("/")
        self.endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
        
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self._s3_client = None

    def _get_client(self):
        if self._s3_client is None:
            try:
                import boto3
                self._s3_client = boto3.client(
                    "s3",
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key_id,
                    aws_secret_access_key=self.secret_access_key,
                    region_name="auto"
                )
            except Exception as e:
                logger.error(f"[CloudflareR2StorageProvider] S3 클라이언트 초기화 실패: {e}")
                raise
        return self._s3_client

    async def upload_file(self, file_obj: BinaryIO | bytes, destination_path: str, content_type: str = "audio/wav") -> str:
        client = self._get_client()
        content = file_obj if isinstance(file_obj, (bytes, bytearray)) else file_obj.read()
        key = destination_path.lstrip("/\\")

        client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=content,
            ContentType=content_type
        )
        logger.info(f"[CloudflareR2StorageProvider] R2 업로드 완료: {key}")
        return await self.get_url(key)

    async def download_file(self, file_path: str) -> bytes:
        client = self._get_client()
        key = file_path.lstrip("/\\")
        response = client.get_object(Bucket=self.bucket_name, Key=key)
        return response["Body"].read()

    async def get_url(self, file_path: str) -> str:
        key = file_path.lstrip("/\\")
        return f"{self.public_domain}/{key}"

    async def delete_file(self, file_path: str) -> bool:
        client = self._get_client()
        key = file_path.lstrip("/\\")
        try:
            client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"[CloudflareR2StorageProvider] R2 삭제 완료: {key}")
            return True
        except Exception as e:
            logger.error(f"[CloudflareR2StorageProvider] R2 삭제 실패: {e}")
            return False
