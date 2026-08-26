from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_sqs as sqs,
    Duration
)
from constructs import Construct

class SejongAwsPrototypeStack(Stack):
    """
    세종텔레콤 비즈메시지 API 연동을 위한 AWS 인프라(Mock)
    (AWS CDK v2 기준 작성)
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. VPC 설정 (가장 중요)
        # 세종텔레콤은 고정 IP 화이트리스트 정책을 사용하므로, 
        # Lambda가 외부로 나갈 때 고정 IP를 가지려면 NAT Gateway가 필수입니다.
        vpc = ec2.Vpc(
            self, "SejongVpc",
            max_azs=2,
            nat_gateways=1, # EIP를 할당받은 NAT Gateway 1개 생성
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS # 이 서브넷 내 리소스는 NAT를 거쳐 외부로 나감
                )
            ]
        )

        # 2. 발송 Lambda (VPC 내부 프라이빗 서브넷에 배치)
        sender_lambda = _lambda.Function(
            self, "SejongSenderLambda",
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler="lambda_sender.lambda_handler",
            code=_lambda.Code.from_asset("."), 
            vpc=vpc, # VPC 지정
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS # 프라이빗 서브넷 배치 -> 고정 EIP(NAT) 통해 외부 통신
            ),
            timeout=Duration.seconds(10)
        )

        # 3. 비동기 콜백 수신용 SQS 큐
        webhook_queue = sqs.Queue(
            self, "WebhookQueue",
            visibility_timeout=Duration.seconds(30)
        )

        # 4. 웹훅 수신 Lambda (외부 통신이 필요 없으므로 굳이 VPC 내부에 둘 필요 없음)
        webhook_lambda = _lambda.Function(
            self, "SejongWebhookLambda",
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler="lambda_webhook.lambda_handler",
            code=_lambda.Code.from_asset("."),
            environment={
                "SQS_QUEUE_URL": webhook_queue.queue_url
            }
        )
        
        # 큐에 대한 쓰기 권한 부여
        webhook_queue.grant_send_messages(webhook_lambda)

        # 5. 웹훅 API Gateway 설정 (세종텔레콤 서버가 호출할 엔드포인트)
        api = apigw.RestApi(
            self, "SejongWebhookApi",
            rest_api_name="Sejong Webhook Service"
        )
        
        webhook_integration = apigw.LambdaIntegration(webhook_lambda)
        api.root.add_resource("webhook").add_method("POST", webhook_integration)
