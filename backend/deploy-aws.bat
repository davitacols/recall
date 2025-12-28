@echo off
echo Building and deploying to AWS...

set AWS_ACCOUNT_ID=290958055168
set AWS_REGION=us-east-1
set IMAGE_NAME=recall-backend

echo Step 1: Login to ECR
aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com

echo Step 2: Create ECR repository (if not exists)
aws ecr create-repository --repository-name %IMAGE_NAME% --region %AWS_REGION% 2>nul

echo Step 3: Build Docker image
docker build -t %IMAGE_NAME% .

echo Step 4: Tag image
docker tag %IMAGE_NAME%:latest %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%IMAGE_NAME%:latest

echo Step 5: Push to ECR
docker push %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%IMAGE_NAME%:latest

echo.
echo ========================================
echo Image pushed successfully!
echo ECR URI: %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%IMAGE_NAME%:latest
echo.
echo Next steps:
echo 1. Go to AWS Console -^> App Runner
echo 2. Create service from ECR
echo 3. Use the ECR URI above
echo 4. Add these environment variables:
echo.
echo DATABASE_URL=postgresql://neondb_owner:npg_TBtxv7d8LAEs@ep-rough-thunder-a44a4ps0-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
echo REDIS_URL=rediss://default:AR3KAAImcDFlNzhmYmViNTRkNTQ0YWJjYTQwN2MxNDMwOWYwOTgxY3AxNzYyNg@steady-collie-7626.upstash.io:6379
echo SECRET_KEY=django-insecure-prod-key-change-this
echo AWS_ACCESS_KEY_ID=AKIAUHPTTS4AJTY5KHPF
echo AWS_SECRET_ACCESS_KEY=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
echo AWS_REGION=us-east-1
echo DEBUG=False
echo ALLOWED_HOSTS=*
echo ========================================
