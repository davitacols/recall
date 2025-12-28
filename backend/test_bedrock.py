import boto3
import json
import os
from decouple import config

client = boto3.client(
    'bedrock-runtime',
    region_name='us-east-1',
    aws_access_key_id=config('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=config('AWS_SECRET_ACCESS_KEY')
)

body = {
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Say hello"}]
}

response = client.invoke_model(
    modelId="anthropic.claude-3-haiku-20240307-v1:0",
    body=json.dumps(body)
)

result = json.loads(response['body'].read())
print(json.dumps(result, indent=2))
