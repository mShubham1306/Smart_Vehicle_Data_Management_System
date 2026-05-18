# AWS ECS Fargate Deployment Guide

## Updated Deployment Path

**Instead of:** Complex Kubernetes setup
**Now using:** AWS ECS Fargate + ALB (realistic startup approach)

---

## Quick Overview

```
Your Code (Docker) → AWS ECR → ECS Fargate → ALB → Your Users
                                 (auto-scales)      (load balanced)
```

You push Docker image. AWS runs it. Auto-scales as traffic grows. Pay only for what you use.

---

## Step 1: Prepare Docker Image

### Update Dockerfile

Ensure you have a `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
```

### Build Locally

```bash
cd c:\Users\nayan\Desktop\pr\backend
docker build -t smartinsure-api:v1 .
docker run -p 8000:8000 smartinsure-api:v1
# Test: curl http://localhost:8000/health
```

---

## Step 2: AWS Setup

### 2.1 Create AWS Account

1. Go to https://aws.amazon.com
2. Click "Create AWS Account"
3. Sign up with email
4. Verify email
5. Add payment method (free tier: $300 credit for first 12 months)

### 2.2 Create IAM User

```bash
# Use AWS Management Console

1. Go to IAM dashboard
2. Users → Create User → "smartinsure-deployer"
3. Attach policies:
   - AmazonEC2ContainerRegistryPowerUser (ECR access)
   - AmazonECS_FullAccess (ECS access)
   - ElasticLoadBalancingFullAccess (ALB access)
   - AmazonElastiCacheFullAccess (Redis access)
4. Create access key:
   - Store Access Key ID
   - Store Secret Access Key
```

### 2.3 Install AWS CLI

```bash
# Windows
choco install awscli -y

# Or download from:
# https://aws.amazon.com/cli/

# Verify
aws --version
```

### 2.4 Configure AWS CLI

```bash
aws configure

# Enter:
# AWS Access Key ID: [paste from IAM]
# AWS Secret Access Key: [paste from IAM]
# Default region name: us-east-1
# Default output format: json
```

---

## Step 3: Create ECR Repository

```bash
# List existing repos
aws ecr describe-repositories

# Create new repo
aws ecr create-repository \
    --repository-name smartinsure-api \
    --region us-east-1

# Output will include:
# "repositoryUri": "123456789.dkr.ecr.us-east-1.amazonaws.com/smartinsure-api"
# Save this for later
```

---

## Step 4: Push Docker Image to ECR

```bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag smartinsure-api:v1 123456789.dkr.ecr.us-east-1.amazonaws.com/smartinsure-api:v1

# Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/smartinsure-api:v1

# Verify
aws ecr describe-images --repository-name smartinsure-api
```

---

## Step 5: Setup Networking (VPC)

The easiest way is through AWS Console, but here's what you need:

### VPC Setup

```
1. Go to VPC Dashboard
2. Create VPC:
   - Name: smartinsure-vpc
   - CIDR: 10.0.0.0/16
3. Create 2 Public Subnets:
   - Subnet 1: 10.0.1.0/24 (us-east-1a)
   - Subnet 2: 10.0.2.0/24 (us-east-1b)
4. Create Internet Gateway:
   - Attach to VPC
5. Create Route Table:
   - Route: 0.0.0.0/0 → Internet Gateway
```

### Security Groups

```
1. For ALB (inbound):
   - Port 80 (HTTP) from 0.0.0.0/0
   - Port 443 (HTTPS) from 0.0.0.0/0

2. For Fargate Containers:
   - Port 8000 from ALB security group
   - Port 443 outbound (HTTPS, for dependencies)

3. For MongoDB Atlas:
   - Fargate security group IP ranges (ALB)

4. For ElastiCache:
   - Fargate security group on port 6379
```

---

## Step 6: Create ECS Cluster

### Via Console

```
1. ECS Dashboard → Clusters → Create Cluster
2. Name: smartinsure-prod
3. Infrastructure: AWS Fargate (recommended)
4. Networking:
   - VPC: smartinsure-vpc
   - Subnets: Both (10.0.1.0/24 and 10.0.2.0/24)
5. Create
```

### Via CLI

```bash
aws ecs create-cluster \
    --cluster-name smartinsure-prod \
    --region us-east-1

# Verify
aws ecs describe-clusters --clusters smartinsure-prod
```

---

## Step 7: Create Task Definition

### Via Console

```
1. ECS → Task Definitions → Create New Task Definition
2. Launch type: Fargate
3. Task Definition Name: smartinsure-api
4. Task size:
   - CPU: 512 (.5 vCPU)
   - Memory: 1024 (1 GB)
5. Container:
   - Name: smartinsure-api
   - Image: 123456789.dkr.ecr.us-east-1.amazonaws.com/smartinsure-api:v1
   - Port: 8000
   - Environment Variables:
     - MONGO_URI: mongodb+srv://user:pass@cluster.mongodb.net/vehicle_insurance
     - REDIS_URL: redis://cache-endpoint.ng.0001.use1.cache.amazonaws.com:6379
6. Logging:
   - awslogs-group: /ecs/smartinsure-api
   - awslogs-region: us-east-1
7. Register
```

---

## Step 8: Create Application Load Balancer

### Via Console

```
1. EC2 → Load Balancers → Create Load Balancer
2. ALB → ALB (Application Load Balancer)
3. Name: smartinsure-alb
4. Scheme: Internet-facing
5. IP address type: IPv4
6. Network mapping:
   - VPC: smartinsure-vpc
   - Subnets: Both (us-east-1a, us-east-1b)
7. Security group:
   - Create or select ALB security group
   - Inbound: 80, 443 from 0.0.0.0/0
8. Listeners:
   - HTTP:80 → Redirect to HTTPS:443
   - HTTPS:443 → Forward to new target group
9. Target group:
   - Name: smartinsure-api
   - Type: IP
   - Port: 8000
   - Health check: /health
   - Interval: 30s
   - Threshold: 2 healthy, 3 unhealthy
10. SSL Certificate: Create or import (ACM)
11. Create
```

---

## Step 9: Create ECS Service

### Via Console

```
1. ECS → Clusters → smartinsure-prod → Create Service
2. Launch type: Fargate
3. Task definition: smartinsure-api (latest)
4. Desired count: 1 (start with 1 container)
5. Network:
   - VPC: smartinsure-vpc
   - Subnets: Both
   - Security group: Fargate security group
6. Load balancing:
   - ALB
   - Target group: smartinsure-api
   - Container port: 8000
7. Auto Scaling:
   - Enable auto scaling
   - Min: 1, Max: 50
   - CPU target: 70%
   - Memory target: 80%
8. Create
```

---

## Step 10: Setup MongoDB Atlas

```bash
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create organization, create project
# 3. Build cluster:
#    - Cloud: AWS
#    - Region: N. Virginia (us-east-1)
#    - Tier: M10 ($57/month)
#    - Replica Set: 3 nodes
#    - Backup: Daily
#    - Encryption: Yes
# 4. Add database user:
#    - Username: admin
#    - Password: [strong password]
# 5. Whitelist IPs:
#    - All (0.0.0.0/0) for now, restrict later
# 6. Copy connection string:
#    mongodb+srv://admin:PASSWORD@cluster.mongodb.net/vehicle_insurance
# 7. Update ECS Task Definition environment variable
```

---

## Step 11: Setup ElastiCache Redis

### Via Console

```
1. ElastiCache → Create Cluster
2. Engine: Redis
3. Cluster mode: Disabled (for simplicity)
4. Name: smartinsure-redis
5. Engine version: 7.0+
6. Node type: cache.t3.micro (~$19/month)
7. Number of replicas: 1 (for failover)
8. Multi-AZ: Yes
9. Automatic failover: Enable
10. Subnet group: Create or select
11. Security group: Fargate security group
12. Backup & Maintenance:
    - Automatic backup: Enable
    - Backup retention: 5 days
    - Maintenance window: 3am UTC
13. Create
14. Get endpoint: [endpoint].cache.amazonaws.com:6379
```

### Update ECS Task Definition

```
Update Environment Variables:
- REDIS_URL: redis://smartinsure-redis.cache.amazonaws.com:6379/0
```

---

## Step 12: Deploy Frontend

### Build Angular App

```bash
cd frontend
npm run build
# Creates dist/frontend/browser/ directory
```

### Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://smartinsure-frontend-prod

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket smartinsure-frontend-prod \
    --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
    --bucket smartinsure-frontend-prod \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### Upload Files

```bash
# Sync build output to S3
aws s3 sync dist/frontend/browser s3://smartinsure-frontend-prod/

# Set cache headers
aws s3 cp dist/frontend/browser/index.html \
    s3://smartinsure-frontend-prod/index.html \
    --cache-control "max-age=0, no-cache, no-store, must-revalidate" \
    --content-type "text/html"
```

### Create CloudFront Distribution

```
1. CloudFront → Create Distribution
2. Origin Settings:
   - Origin domain: smartinsure-frontend-prod.s3.us-east-1.amazonaws.com
   - S3 Bucket access: OAC (Origin Access Control)
3. Behavior:
   - Path pattern: /api/*
   - Origin: ALB (forward to ECS)
   - Viewer protocol: HTTPS only
   - Cache policy: Managed-CachingDisabled
4. Default behavior:
   - Origin: S3 bucket
   - Viewer protocol: HTTPS only
   - Cache policy: Managed-CachingOptimized
   - Compress objects: Yes
5. Create
```

---

## Step 13: Setup Domain & SSL

### Register Domain

```bash
# Option 1: Use Route 53
aws route53 create-hosted-zone \
    --name smartinsure.com \
    --caller-reference $(date +%s)

# Option 2: Use external registrar (GoDaddy, Namecheap)
# Point nameservers to Route 53
```

### Create SSL Certificate

```bash
# In AWS Console → ACM (Certificate Manager)
1. Request certificate
2. Domain name: api.smartinsure.com
3. Validation: Email or DNS
4. Approve
5. Use in ALB
```

### Route 53 Records

```
Record 1:
  Name: api.smartinsure.com
  Type: A
  Alias: smartinsure-alb
  
Record 2:
  Name: smartinsure.com
  Type: A
  Alias: cloudfront distribution
```

---

## Step 14: Environment Configuration

### Create .env file for Fargate

In AWS Systems Manager → Parameter Store:

```
/smartinsure/prod/MONGO_URI
  Value: mongodb+srv://admin:PASSWORD@cluster.mongodb.net/vehicle_insurance

/smartinsure/prod/REDIS_URL
  Value: redis://smartinsure-redis.cache.amazonaws.com:6379/0

/smartinsure/prod/LOG_LEVEL
  Value: INFO
```

### Or use Task Definition Env Vars

Edit Task Definition → Add environment variables directly

---

## Testing

### Test API Health

```bash
# Get ALB DNS
aws elbv2 describe-load-balancers --query 'LoadBalancers[0].DNSName'

# Test health check
curl http://[ALB-DNS]/health
# Expected: {"status":"healthy","service":"SmartInsure API","timestamp":...}

# Test readiness
curl http://[ALB-DNS]/ready
# Expected: {"status":"ready","timestamp":...}
```

### Test Full Request

```bash
# Through CloudFront
curl https://smartinsure.com/api/sheets

# Check response
# Should get your vehicle sheets
```

### Check Logs

```bash
# View ECS logs
aws logs tail /ecs/smartinsure-api --follow

# View specific container
aws ecs describe-tasks \
    --cluster smartinsure-prod \
    --tasks [task-id] \
    --query 'tasks[0]'
```

---

## Monitoring

### CloudWatch Dashboard

```
Dashboard: smartinsure-prod

Widgets:
1. ECS Task Count
2. CPU Utilization
3. Memory Utilization
4. ALB Request Count
5. ALB Target Response Time
6. ALB Unhealthy Host Count
7. MongoDB Atlas Connections
```

### Create Alarms

```bash
# CPU High Alert
aws cloudwatch put-metric-alarm \
    --alarm-name smartinsure-cpu-high \
    --alarm-description "Alert if CPU > 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions [SNS-topic-arn]  # Email notification
```

---

## Auto Scaling

Already configured in ECS Service:
- Min replicas: 1
- Max replicas: 50
- CPU target: 70%
- Memory target: 80%

AWS automatically:
- Adds containers if CPU > 70% for 3 min
- Removes containers if CPU < 30% for 5 min
- Never goes below 1 or above 50

**You don't need to manage this manually.**

---

## Cost Breakdown

```
Phase 1 (MVP):
- ECS Fargate (1 container):      $10/month
- ALB:                            $16/month
- MongoDB Atlas M10:              $57/month
- ElastiCache (micro):            $19/month
- S3 + CloudFront:                $50/month
- Extras (Route 53, data transfer): $20/month
Total: ~$172/month
```

Can fit in free tier if you keep usage low initially.

---

## Deployment Checklist

- ✅ AWS Account created
- ✅ IAM User setup
- ✅ AWS CLI configured
- ✅ Docker image built & pushed to ECR
- ✅ VPC & Subnets created
- ✅ Security groups configured
- ✅ ECS Cluster created
- ✅ Task Definition created
- ✅ ALB created & configured
- ✅ ECS Service created (1 container)
- ✅ MongoDB Atlas cluster running
- ✅ ElastiCache Redis running
- ✅ S3 bucket & CloudFront setup
- ✅ Domain configured
- ✅ SSL certificate issued
- ✅ Route 53 records added
- ✅ Environment variables set
- ✅ Health checks verified
- ✅ Monitoring dashboard created
- ✅ Auto scaling enabled

---

## Troubleshooting

### Task won't start

```bash
# Check task logs
aws logs tail /ecs/smartinsure-api

# Check task details
aws ecs describe-tasks \
    --cluster smartinsure-prod \
    --tasks [task-arn]

# Restart task
aws ecs update-service \
    --cluster smartinsure-prod \
    --service smartinsure-api \
    --force-new-deployment
```

### Health check failing

```
1. Verify /health endpoint exists in code
2. Check security group allows 8000
3. Check container port mapping
4. Check logs for errors
```

### High CPU usage

```
1. View CloudWatch metrics
2. Check if query needs optimization
3. Add more compute (scale up containers)
4. Implement caching
```

---

## Next Steps

1. **Today:** Create AWS account
2. **Day 1-2:** ECR + Docker setup
3. **Day 2-3:** Fargate + ALB + ECS
4. **Day 3-4:** MongoDB + Redis
5. **Day 4-5:** Frontend deployment
6. **Day 5:** Test everything
7. **Week 1+:** Monitor and optimize

**Total time: ~1 week to production**

**Cost: ~$170/month for startup**

**Scaling: Automatic as you grow**

This is the way. 🚀
