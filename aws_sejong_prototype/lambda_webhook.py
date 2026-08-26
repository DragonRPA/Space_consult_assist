import json
import logging
import boto3
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 환경 변수로 큐 URL이나 DB 테이블명을 받음
QUEUE_URL = os.environ.get('SQS_QUEUE_URL', 'mock-queue-url')
sqs = boto3.client('sqs') if os.environ.get('AWS_REGION') else None # Mock 환경 방지

def lambda_handler(event, context):
    """
    세종텔레콤 전송 결과 웹훅 수신 람다.
    성공/실패 이력을 비동기로 안전하게 처리하기 위해 SQS 큐로 전송함.
    """
    try:
        # API Gateway를 통해 전달된 세종텔레콤의 콜백 데이터 (JSON)
        body = event.get('body', '{}')
        payload = json.loads(body)
        
        logger.info(f"Received webhook payload: {payload}")
        
        # 유효성 검사 (세종텔레콤에서 보낸 형식이 맞는지 확인)
        message_id = payload.get('message_id')
        status = payload.get('status')
        
        if not message_id or not status:
            return {
                'statusCode': 400,
                'body': 'Invalid payload'
            }

        # ------------------------------------------------------------------
        # 안티패턴: 여기서 직접 DB (RDBMS) 에 커넥션을 맺고 UPDATE 쿼리를 날리는 것
        # 세종텔레콤에서 대량으로 쏟아지는 웹훅 트래픽 때문에 DB 커넥션 풀이 고갈될 위험이 높음.
        # ------------------------------------------------------------------
        
        # 권장 패턴: SQS에 메시지를 던져두고 빠르게 200 OK 응답 반환
        if sqs:
            sqs.send_message(
                QueueUrl=QUEUE_URL,
                MessageBody=json.dumps({
                    'message_id': message_id,
                    'status': status,
                    'completed_at': payload.get('completed_at'),
                    'error_code': payload.get('error_code', None)
                })
            )
            logger.info("Successfully enqueued webhook event to SQS")
            
        return {
            'statusCode': 200,
            'body': 'OK'
        }

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        # 세종텔레콤 서버가 에러를 수신하면 재시도를 할 수 있으므로 500 반환
        return {
            'statusCode': 500,
            'body': 'Internal Server Error'
        }

