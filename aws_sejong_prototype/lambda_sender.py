import json
import logging
import urllib.request
import urllib.error

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 환경 변수로 주입될 값들 (실제로는 AWS Parameter Store나 Secrets Manager 사용 권장)
SEJONG_API_URL = "https://api.sejongnetworks.com/bizmsg/v1/message"
SEJONG_CLIENT_ID = "mock_client_id"
SEJONG_CLIENT_SECRET = "mock_client_secret"

def lambda_handler(event, context):
    """
    세종텔레콤 비즈메시지 발송 람다 (알림톡 -> SMS 폴백 로직 포함)
    """
    try:
        # event body에서 발송에 필요한 정보 추출
        # (예: API Gateway를 통해 전달된 JSON body)
        body = json.loads(event.get('body', '{}'))
        phone_number = body.get('phone_number')
        template_code = body.get('template_code')
        template_params = body.get('template_params', {})
        fallback_message = body.get('fallback_message', '')
        
        if not phone_number or not template_code:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required fields: phone_number, template_code'})
            }

        # 1. 알림톡 발송 시도
        result = send_alimtalk(phone_number, template_code, template_params)
        
        # 2. 알림톡 실패 시 Fallback(SMS/LMS) 발송 로직
        if result.get('status') != 'success':
            logger.warning(f"Alimtalk failed for {phone_number}. Reason: {result.get('error_msg')}. Attempting fallback...")
            
            if fallback_message:
                fallback_result = send_sms(phone_number, fallback_message)
                if fallback_result.get('status') == 'success':
                    return {
                        'statusCode': 200,
                        'body': json.dumps({'message': 'Alimtalk failed, but fallback SMS succeeded', 'fallback_result': fallback_result})
                    }
                else:
                    return {
                        'statusCode': 500,
                        'body': json.dumps({'error': 'Both Alimtalk and fallback SMS failed', 'details': fallback_result})
                    }
            else:
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': 'Alimtalk failed, and no fallback message provided'})
                }

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Alimtalk sent successfully', 'result': result})
        }

    except Exception as e:
        logger.error(f"Error in lambda_sender: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }

def send_alimtalk(phone_number, template_code, params):
    """
    Mock 알림톡 발송 함수
    실제로는 `urllib.request` 등을 사용하여 세종텔레콤 API에 POST 요청을 보냄.
    """
    payload = {
        'to': phone_number,
        'type': 'ALIMTALK',
        'template_code': template_code,
        'content': params # 템플릿 변수에 들어갈 실제 데이터 
    }
    logger.info(f"Sending Alimtalk payload: {payload}")
    
    # ------------------------------------------------------------------
    # 실제 API 호출 코드 예시 (주석 처리)
    # headers = {
    #     'Content-Type': 'application/json',
    #     'Authorization': f'Bearer {get_access_token()}'
    # }
    # req = urllib.request.Request(SEJONG_API_URL, data=json.dumps(payload).encode('utf-8'), headers=headers)
    # try:
    #     response = urllib.request.urlopen(req)
    #     return {'status': 'success'}
    # except urllib.error.HTTPError as e:
    #     return {'status': 'fail', 'error_msg': str(e)}
    # ------------------------------------------------------------------
    
    # Mock 성공 처리
    return {'status': 'success'}

def send_sms(phone_number, message):
    """
    Mock SMS 발송 함수
    """
    payload = {
        'to': phone_number,
        'type': 'SMS', # 길이가 길면 LMS로 자동 전환하도록 설정 필요
        'content': message
    }
    logger.info(f"Sending SMS payload: {payload}")
    
    # Mock 성공 처리
    return {'status': 'success'}

