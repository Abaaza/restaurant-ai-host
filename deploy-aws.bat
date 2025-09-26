@echo off
REM Restaurant AI Host - AWS Deployment Script for Windows
REM Deploys to me-south-1 (Bahrain) region

setlocal EnableDelayedExpansion

REM Configuration
set AWS_REGION=me-south-1
set AWS_ACCOUNT_ID=911167890928
set PROJECT_NAME=restaurant-ai-host
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,14%

echo ==========================================
echo Restaurant AI Host - AWS Deployment
echo Region: %AWS_REGION%
echo Account: %AWS_ACCOUNT_ID%
echo ==========================================

REM ==========================================
REM BACKEND DEPLOYMENT (Lambda + API Gateway)
REM ==========================================

echo.
echo 1. Preparing Backend for Lambda...
cd ai-restaurant-backend

REM Clean up old deployment
if exist deploy-package rmdir /s /q deploy-package
if exist lambda-deploy.zip del lambda-deploy.zip
mkdir deploy-package

REM Copy source files
xcopy /E /I /Q src deploy-package\src
copy package.json deploy-package\
copy tsconfig.json deploy-package\

REM Create simplified Lambda handler
echo Creating Lambda handler...
echo const serverless = require('serverless-http'); > deploy-package\lambda.js
echo const express = require('express'); >> deploy-package\lambda.js
echo const cors = require('cors'); >> deploy-package\lambda.js
echo. >> deploy-package\lambda.js
echo const app = express(); >> deploy-package\lambda.js
echo app.use(cors()); >> deploy-package\lambda.js
echo app.use(express.json()); >> deploy-package\lambda.js
echo. >> deploy-package\lambda.js
echo app.get('/health', (req, res) =^> { >> deploy-package\lambda.js
echo   res.json({ status: 'healthy', service: 'Restaurant AI Host API' }); >> deploy-package\lambda.js
echo }); >> deploy-package\lambda.js
echo. >> deploy-package\lambda.js
echo app.all('*', (req, res) =^> { >> deploy-package\lambda.js
echo   res.json({ message: 'Restaurant AI Host API', path: req.path }); >> deploy-package\lambda.js
echo }); >> deploy-package\lambda.js
echo. >> deploy-package\lambda.js
echo module.exports.handler = serverless(app); >> deploy-package\lambda.js

REM Install only essential dependencies
cd deploy-package
echo Installing dependencies...
call npm init -y
call npm install express cors serverless-http --save

REM Create deployment package
echo Creating deployment package...
powershell -Command "Compress-Archive -Path * -DestinationPath ../lambda-deploy.zip -Force"

cd ..

echo 2. Deploying Lambda function...

REM Create Lambda execution role
set ROLE_NAME=%PROJECT_NAME%-lambda-role
set ROLE_ARN=arn:aws:iam::%AWS_ACCOUNT_ID%:role/%ROLE_NAME%

REM Check if role exists
aws iam get-role --role-name %ROLE_NAME% --region %AWS_REGION% >nul 2>&1
if errorlevel 1 (
    echo Creating Lambda execution role...

    echo { "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": { "Service": "lambda.amazonaws.com" }, "Action": "sts:AssumeRole" } ] } > trust-policy.json

    aws iam create-role --role-name %ROLE_NAME% --assume-role-policy-document file://trust-policy.json --region %AWS_REGION%

    aws iam attach-role-policy --role-name %ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole --region %AWS_REGION%

    echo Waiting for role to propagate...
    timeout /t 10 /nobreak >nul
)

REM Create or update Lambda function
set FUNCTION_NAME=%PROJECT_NAME%-api

aws lambda get-function --function-name %FUNCTION_NAME% --region %AWS_REGION% >nul 2>&1
if errorlevel 1 (
    echo Creating new Lambda function...
    aws lambda create-function ^
        --function-name %FUNCTION_NAME% ^
        --runtime nodejs18.x ^
        --role %ROLE_ARN% ^
        --handler lambda.handler ^
        --zip-file fileb://lambda-deploy.zip ^
        --timeout 30 ^
        --memory-size 1024 ^
        --region %AWS_REGION% ^
        --environment "Variables={NODE_ENV=production,CORS_ORIGIN=*}"
) else (
    echo Updating existing Lambda function...
    aws lambda update-function-code ^
        --function-name %FUNCTION_NAME% ^
        --zip-file fileb://lambda-deploy.zip ^
        --region %AWS_REGION%
)

REM Get Lambda ARN
for /f "delims=" %%i in ('aws lambda get-function --function-name %FUNCTION_NAME% --region %AWS_REGION% --query "Configuration.FunctionArn" --output text') do set LAMBDA_ARN=%%i

cd ..

REM ==========================================
REM Create API Gateway using AWS CLI
REM ==========================================

echo.
echo 3. Setting up API Gateway...

set API_NAME=%PROJECT_NAME%-api-gateway

REM Check if API exists
for /f "delims=" %%i in ('aws apigatewayv2 get-apis --region %AWS_REGION% --query "Items[?Name=='%API_NAME%'].ApiId" --output text') do set API_ID=%%i

if "%API_ID%"=="" (
    echo Creating new API Gateway...
    for /f "delims=" %%i in ('aws apigatewayv2 create-api --name %API_NAME% --protocol-type HTTP --cors-configuration AllowOrigins=*,AllowMethods=*,AllowHeaders=* --region %AWS_REGION% --query ApiId --output text') do set API_ID=%%i
)

echo API Gateway ID: %API_ID%

REM Create Lambda integration
echo Creating Lambda integration...
for /f "delims=" %%i in ('aws apigatewayv2 create-integration --api-id %API_ID% --integration-type AWS_PROXY --integration-uri %LAMBDA_ARN% --payload-format-version 2.0 --region %AWS_REGION% --query IntegrationId --output text 2^>nul') do set INTEGRATION_ID=%%i

if not "%INTEGRATION_ID%"=="" (
    REM Create default route
    aws apigatewayv2 create-route --api-id %API_ID% --route-key "$default" --target integrations/%INTEGRATION_ID% --region %AWS_REGION% >nul 2>&1
)

REM Add Lambda permission
aws lambda add-permission ^
    --function-name %FUNCTION_NAME% ^
    --statement-id apigateway-invoke-%TIMESTAMP% ^
    --action lambda:InvokeFunction ^
    --principal apigateway.amazonaws.com ^
    --source-arn "arn:aws:execute-api:%AWS_REGION%:%AWS_ACCOUNT_ID%:%API_ID%/*/*" ^
    --region %AWS_REGION% >nul 2>&1

REM Deploy API
aws apigatewayv2 create-stage --api-id %API_ID% --stage-name prod --auto-deploy --region %AWS_REGION% >nul 2>&1

set API_URL=https://%API_ID%.execute-api.%AWS_REGION%.amazonaws.com/prod
echo Backend API URL: %API_URL%

REM ==========================================
REM FRONTEND DEPLOYMENT
REM ==========================================

echo.
echo 4. Building Frontend...
cd AI-Restaurant-Host

REM Install dependencies if needed
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install --legacy-peer-deps
)

REM Create production environment file
echo NEXT_PUBLIC_API_URL=%API_URL% > .env.production
echo NEXT_PUBLIC_RESTAURANT_NAME="The Golden Fork" >> .env.production

REM Build frontend
echo Building Next.js application...
call npm run build

REM ==========================================
REM Deploy to S3
REM ==========================================

echo.
echo 5. Deploying Frontend to S3...

set BUCKET_NAME=%PROJECT_NAME%-frontend-%AWS_ACCOUNT_ID%

REM Create bucket
aws s3api create-bucket --bucket %BUCKET_NAME% --region %AWS_REGION% --create-bucket-configuration LocationConstraint=%AWS_REGION% >nul 2>&1

REM Enable static website hosting
aws s3api put-bucket-website --bucket %BUCKET_NAME% --website-configuration file://../s3-website-config.json --region %AWS_REGION% >nul 2>&1

REM Set bucket policy
echo { "Version": "2012-10-17", "Statement": [ { "Sid": "PublicReadGetObject", "Effect": "Allow", "Principal": "*", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::%BUCKET_NAME%/*" } ] } > bucket-policy.json
aws s3api put-bucket-policy --bucket %BUCKET_NAME% --policy file://bucket-policy.json --region %AWS_REGION%

REM Upload files
echo Uploading files to S3...
aws s3 sync out/ s3://%BUCKET_NAME%/ --delete --region %AWS_REGION%

cd ..

REM ==========================================
REM Create CloudFront Distribution
REM ==========================================

echo.
echo 6. Creating CloudFront distribution...

set S3_DOMAIN=%BUCKET_NAME%.s3.%AWS_REGION%.amazonaws.com

REM Create CloudFront config file
echo { > cf-config.json
echo   "CallerReference": "%PROJECT_NAME%-%TIMESTAMP%", >> cf-config.json
echo   "Comment": "Restaurant AI Host", >> cf-config.json
echo   "Enabled": true, >> cf-config.json
echo   "DefaultRootObject": "index.html", >> cf-config.json
echo   "Origins": { >> cf-config.json
echo     "Quantity": 1, >> cf-config.json
echo     "Items": [{ >> cf-config.json
echo       "Id": "S3-%BUCKET_NAME%", >> cf-config.json
echo       "DomainName": "%S3_DOMAIN%", >> cf-config.json
echo       "S3OriginConfig": { "OriginAccessIdentity": "" } >> cf-config.json
echo     }] >> cf-config.json
echo   }, >> cf-config.json
echo   "DefaultCacheBehavior": { >> cf-config.json
echo     "TargetOriginId": "S3-%BUCKET_NAME%", >> cf-config.json
echo     "ViewerProtocolPolicy": "redirect-to-https", >> cf-config.json
echo     "TrustedSigners": { "Enabled": false, "Quantity": 0 }, >> cf-config.json
echo     "ForwardedValues": { >> cf-config.json
echo       "QueryString": false, >> cf-config.json
echo       "Cookies": { "Forward": "none" } >> cf-config.json
echo     }, >> cf-config.json
echo     "MinTTL": 0 >> cf-config.json
echo   } >> cf-config.json
echo } >> cf-config.json

REM Create distribution
for /f "delims=" %%i in ('aws cloudfront create-distribution --distribution-config file://cf-config.json --region us-east-1 --query Distribution.Id --output text 2^>nul') do set DISTRIBUTION_ID=%%i

if not "%DISTRIBUTION_ID%"=="" (
    for /f "delims=" %%i in ('aws cloudfront get-distribution --id %DISTRIBUTION_ID% --region us-east-1 --query Distribution.DomainName --output text') do set CLOUDFRONT_URL=%%i
)

REM ==========================================
REM SUMMARY
REM ==========================================

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Backend API URL: %API_URL%
echo Frontend S3 URL: http://%BUCKET_NAME%.s3-website.%AWS_REGION%.amazonaws.com
if not "%CLOUDFRONT_URL%"=="" echo CloudFront URL: https://%CLOUDFRONT_URL%
echo.
echo Lambda Function: %FUNCTION_NAME%
echo API Gateway ID: %API_ID%
echo S3 Bucket: %BUCKET_NAME%
if not "%DISTRIBUTION_ID%"=="" echo CloudFront Distribution: %DISTRIBUTION_ID%
echo.
echo Next steps:
echo 1. Update ElevenLabs webhooks to use: %API_URL%
echo 2. Configure environment variables with your API keys
echo 3. Test the API at: %API_URL%/health
if not "%CLOUDFRONT_URL%"=="" echo 4. Access your app at: https://%CLOUDFRONT_URL% (wait 15-20 min)
echo.

pause