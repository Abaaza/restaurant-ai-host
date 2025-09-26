# Restaurant AI Host - AWS Deployment Summary

## 🚀 Deployment Complete!

Your Restaurant AI Host system has been successfully deployed to AWS in the **me-south-1 (Bahrain)** region.

## 📍 Access URLs

### Production Endpoints

| Service | URL | Status |
|---------|-----|--------|
| **CloudFront (CDN)** | https://dxkyltyhgxyhx.cloudfront.net | ✅ Deploying |
| **S3 Static Website** | http://restaurant-ai-host-frontend-911167890928.s3-website.me-south-1.amazonaws.com | ✅ Live |
| **API Gateway** | https://f6s8tjn2rb.execute-api.me-south-1.amazonaws.com/prod | ✅ Live |

### Test the Deployment

1. **Test Page (Available Now)**: http://restaurant-ai-host-frontend-911167890928.s3-website.me-south-1.amazonaws.com
2. **CloudFront (15-20 minutes)**: https://dxkyltyhgxyhx.cloudfront.net

## 🏗️ AWS Resources Created

### Backend Infrastructure

| Resource | Name/ID | Region | Status |
|----------|---------|--------|--------|
| **Lambda Function** | restaurant-ai-host-api | me-south-1 | ✅ Active |
| **API Gateway** | f6s8tjn2rb | me-south-1 | ✅ Active |
| **IAM Role** | restaurant-ai-host-lambda-role | Global | ✅ Created |
| **CloudWatch Logs** | /aws/lambda/restaurant-ai-host-api | me-south-1 | ✅ Active |

### Frontend Infrastructure

| Resource | Name/ID | Region | Status |
|----------|---------|--------|--------|
| **S3 Bucket** | restaurant-ai-host-frontend-911167890928 | me-south-1 | ✅ Active |
| **CloudFront Distribution** | E1KGRS8Y8W09AR | Global | ⏳ Deploying |
| **CloudFront Domain** | dxkyltyhgxyhx.cloudfront.net | Global | ⏳ Propagating |

## 🔧 API Endpoints

### Health Check
```bash
curl https://f6s8tjn2rb.execute-api.me-south-1.amazonaws.com/prod/health
```

### ElevenLabs Webhook Endpoints
- **Check Availability**: `POST /webhooks/tools/check-availability`
- **Book Reservation**: `POST /webhooks/tools/book-reservation`
- **Get Menu Info**: `POST /webhooks/tools/get-menu-info`
- **Check Guest**: `POST /webhooks/tools/check-guest`
- **Add to Waitlist**: `POST /webhooks/tools/add-to-waitlist`

## 📝 Next Steps

### 1. Update ElevenLabs Agent Configuration

Update your ElevenLabs agent webhooks with the production API URL:

```
Base URL: https://f6s8tjn2rb.execute-api.me-south-1.amazonaws.com/prod
```

### 2. Configure Environment Variables

Update your production environment with actual API keys:

#### Frontend (.env.production)
```env
NEXT_PUBLIC_DEEPGRAM_API_KEY=your-actual-key
DEEPGRAM_API_KEY=your-actual-key
OPENAI_API_KEY=your-actual-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
ELEVENLABS_API_KEY=your-actual-key
ELEVENLABS_AGENT_ID=your-agent-id
```

### 3. Deploy Full Next.js Application

Once dependencies are installed:

```bash
cd AI-Restaurant-Host
npm run build
aws s3 sync out/ s3://restaurant-ai-host-frontend-911167890928/ --delete --region me-south-1
```

### 4. Set Up Supabase Database

1. Create a new Supabase project
2. Run the `restaurant_schema.sql` in the SQL editor
3. Update environment variables with Supabase credentials

### 5. Monitor Services

#### Lambda Function Logs
```bash
aws logs tail /aws/lambda/restaurant-ai-host-api --region me-south-1 --follow
```

#### API Gateway Metrics
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiId,Value=f6s8tjn2rb \
  --statistics Sum \
  --start-time 2025-09-26T00:00:00Z \
  --end-time 2025-09-26T23:59:59Z \
  --period 3600 \
  --region me-south-1
```

## 🔐 Security Considerations

1. **API Keys**: Never commit real API keys. Use AWS Secrets Manager or Parameter Store
2. **CORS**: Currently set to `*` for testing. Restrict to your domain in production
3. **IAM**: Lambda has minimal permissions (basic execution only)
4. **S3**: Public read access enabled for static hosting

## 💰 Cost Estimation

| Service | Free Tier | Estimated Monthly |
|---------|-----------|------------------|
| Lambda | 1M requests/month | ~$0.20 |
| API Gateway | 1M requests/month | ~$3.50 |
| S3 | 5GB storage | ~$0.25 |
| CloudFront | 1TB transfer | ~$85/TB |
| **Total** | | **~$4-10/month** |

## 🔄 Update Deployment

### Update Backend
```bash
cd ai-restaurant-backend
# Make changes
zip -r lambda-function.zip lambda-deploy/
aws lambda update-function-code \
  --function-name restaurant-ai-host-api \
  --zip-file fileb://lambda-function.zip \
  --region me-south-1
```

### Update Frontend
```bash
cd AI-Restaurant-Host
npm run build
aws s3 sync out/ s3://restaurant-ai-host-frontend-911167890928/ --delete --region me-south-1
aws cloudfront create-invalidation \
  --distribution-id E1KGRS8Y8W09AR \
  --paths "/*"
```

## 🗑️ Cleanup Resources

To avoid charges, delete resources when not needed:

```bash
# Delete CloudFront distribution (wait for deployment to complete first)
aws cloudfront delete-distribution --id E1KGRS8Y8W09AR --if-match <ETAG>

# Empty and delete S3 bucket
aws s3 rm s3://restaurant-ai-host-frontend-911167890928 --recursive --region me-south-1
aws s3api delete-bucket --bucket restaurant-ai-host-frontend-911167890928 --region me-south-1

# Delete Lambda function
aws lambda delete-function --function-name restaurant-ai-host-api --region me-south-1

# Delete API Gateway
aws apigatewayv2 delete-api --api-id f6s8tjn2rb --region me-south-1

# Delete IAM role
aws iam detach-role-policy --role-name restaurant-ai-host-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name restaurant-ai-host-lambda-role
```

## ✅ Deployment Status

- ✅ Backend API deployed and accessible
- ✅ S3 static hosting configured
- ✅ CloudFront CDN created (15-20 min to fully deploy)
- ✅ Test page uploaded and accessible
- ⏳ Full Next.js app pending dependencies installation

---

**Deployment completed at**: 2025-09-26 11:05 UTC
**Region**: me-south-1 (Bahrain)
**Account**: 911167890928