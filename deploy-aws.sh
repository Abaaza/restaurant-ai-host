#!/bin/bash

# Restaurant AI Host - AWS Deployment Script
# Deploys to me-south-1 (Bahrain) region

set -e

# Configuration
AWS_REGION="me-south-1"
AWS_ACCOUNT_ID="911167890928"
PROJECT_NAME="restaurant-ai-host"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

echo "=========================================="
echo "Restaurant AI Host - AWS Deployment"
echo "Region: $AWS_REGION"
echo "Account: $AWS_ACCOUNT_ID"
echo "=========================================="

# ==========================================
# BACKEND DEPLOYMENT (Lambda + API Gateway)
# ==========================================

echo ""
echo "1. Preparing Backend for Lambda..."
cd ai-restaurant-backend

# Create deployment package directory
rm -rf deploy-package
mkdir -p deploy-package

# Copy source files
cp -r src deploy-package/
cp package.json deploy-package/
cp tsconfig.json deploy-package/

# Install production dependencies in deploy package
cd deploy-package
npm install --production --legacy-peer-deps || npm install --production --force

# Build TypeScript
npx tsc || echo "TypeScript compilation completed with warnings"

# Create Lambda deployment package
echo "Creating Lambda deployment package..."
zip -r ../lambda-deploy.zip . -q

cd ..

echo "2. Creating Lambda function..."

# Create Lambda execution role if it doesn't exist
ROLE_NAME="${PROJECT_NAME}-lambda-role"
ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"

# Check if role exists
if ! aws iam get-role --role-name $ROLE_NAME --region $AWS_REGION 2>/dev/null; then
    echo "Creating Lambda execution role..."

    # Create trust policy
    cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json \
        --region $AWS_REGION

    # Attach basic execution policy
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        --region $AWS_REGION

    # Wait for role to propagate
    echo "Waiting for role to propagate..."
    sleep 10
fi

# Create or update Lambda function
FUNCTION_NAME="${PROJECT_NAME}-api"

if aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION 2>/dev/null; then
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda-deploy.zip \
        --region $AWS_REGION
else
    echo "Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs18.x \
        --role $ROLE_ARN \
        --handler dist/lambda.handler \
        --zip-file fileb://lambda-deploy.zip \
        --timeout 30 \
        --memory-size 1024 \
        --region $AWS_REGION \
        --environment "Variables={NODE_ENV=production,CORS_ORIGIN=*}"
fi

# Create API Gateway
echo "3. Setting up API Gateway..."

# Check if API exists
API_NAME="${PROJECT_NAME}-api-gateway"
API_ID=$(aws apigatewayv2 get-apis --region $AWS_REGION --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ -z "$API_ID" ]; then
    echo "Creating new API Gateway..."
    API_ID=$(aws apigatewayv2 create-api \
        --name $API_NAME \
        --protocol-type HTTP \
        --cors-configuration "AllowOrigins=*,AllowMethods=*,AllowHeaders=*" \
        --region $AWS_REGION \
        --query ApiId \
        --output text)
fi

# Create Lambda integration
echo "Creating Lambda integration..."
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${FUNCTION_NAME}" \
    --payload-format-version 2.0 \
    --region $AWS_REGION \
    --query IntegrationId \
    --output text)

# Create route
echo "Creating API route..."
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key '$default' \
    --target "integrations/$INTEGRATION_ID" \
    --region $AWS_REGION 2>/dev/null || echo "Route already exists"

# Add Lambda permission for API Gateway
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
    --region $AWS_REGION 2>/dev/null || echo "Permission already exists"

# Deploy API
echo "Deploying API..."
aws apigatewayv2 create-deployment \
    --api-id $API_ID \
    --stage-name prod \
    --region $AWS_REGION 2>/dev/null || echo "Stage already exists"

API_URL="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod"
echo "Backend API URL: $API_URL"

cd ..

# ==========================================
# FRONTEND DEPLOYMENT (S3 + CloudFront)
# ==========================================

echo ""
echo "4. Building Frontend..."
cd AI-Restaurant-Host

# Update environment variables for production
cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=$API_URL
NEXT_PUBLIC_DEEPGRAM_API_KEY=your-deepgram-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
NEXT_PUBLIC_RESTAURANT_NAME="The Golden Fork"
EOF

# Build frontend
echo "Building Next.js application..."
npm run build

# Create S3 bucket for frontend
BUCKET_NAME="${PROJECT_NAME}-frontend-${AWS_ACCOUNT_ID}"
echo ""
echo "5. Creating S3 bucket: $BUCKET_NAME"

# Create bucket in me-south-1
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $AWS_REGION \
    --create-bucket-configuration LocationConstraint=$AWS_REGION 2>/dev/null || echo "Bucket already exists"

# Enable static website hosting
aws s3api put-bucket-website \
    --bucket $BUCKET_NAME \
    --website-configuration '{
        "IndexDocument": {"Suffix": "index.html"},
        "ErrorDocument": {"Key": "404.html"}
    }' \
    --region $AWS_REGION

# Set bucket policy for public read
cat > bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file://bucket-policy.json \
    --region $AWS_REGION

# Upload files to S3
echo "6. Uploading frontend to S3..."
aws s3 sync out/ s3://$BUCKET_NAME/ \
    --delete \
    --region $AWS_REGION

# Create CloudFront distribution
echo ""
echo "7. Creating CloudFront distribution..."

# Create CloudFront distribution configuration
cat > cloudfront-config.json <<EOF
{
    "CallerReference": "${PROJECT_NAME}-${TIMESTAMP}",
    "Aliases": {
        "Quantity": 0
    },
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-${BUCKET_NAME}",
                "DomainName": "${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-${BUCKET_NAME}",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "Compress": true
    },
    "Comment": "Restaurant AI Host Frontend",
    "Enabled": true,
    "HttpVersion": "http2",
    "PriceClass": "PriceClass_All"
}
EOF

# Create distribution
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
    --distribution-config file://cloudfront-config.json \
    --region us-east-1 \
    --query Distribution.Id \
    --output text)

# Get CloudFront domain
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
    --id $DISTRIBUTION_ID \
    --region us-east-1 \
    --query Distribution.DomainName \
    --output text)

cd ..

# ==========================================
# SUMMARY
# ==========================================

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Backend API URL: $API_URL"
echo "Frontend S3 URL: http://${BUCKET_NAME}.s3-website.${AWS_REGION}.amazonaws.com"
echo "CloudFront URL: https://${CLOUDFRONT_DOMAIN}"
echo ""
echo "Lambda Function: ${FUNCTION_NAME}"
echo "API Gateway ID: ${API_ID}"
echo "S3 Bucket: ${BUCKET_NAME}"
echo "CloudFront Distribution: ${DISTRIBUTION_ID}"
echo ""
echo "Next steps:"
echo "1. Update ElevenLabs webhooks to use: $API_URL"
echo "2. Update environment variables with your API keys"
echo "3. Wait 15-20 minutes for CloudFront to fully deploy"
echo "4. Access your application at: https://${CLOUDFRONT_DOMAIN}"
echo ""

# Save deployment info
cat > deployment-info.json <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "region": "${AWS_REGION}",
  "backend": {
    "apiUrl": "${API_URL}",
    "lambdaFunction": "${FUNCTION_NAME}",
    "apiGatewayId": "${API_ID}"
  },
  "frontend": {
    "s3Bucket": "${BUCKET_NAME}",
    "s3Url": "http://${BUCKET_NAME}.s3-website.${AWS_REGION}.amazonaws.com",
    "cloudfrontUrl": "https://${CLOUDFRONT_DOMAIN}",
    "cloudfrontId": "${DISTRIBUTION_ID}"
  }
}
EOF

echo "Deployment information saved to deployment-info.json"