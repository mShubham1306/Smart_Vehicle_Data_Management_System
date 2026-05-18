# Deploy Optimized SmartInsure Stack

## Option 1: Docker Compose (Current Setup)

### Quick Start (5 minutes)
```bash
cd c:\Users\nayan\Desktop\pr

# Option A: Use updated docker-compose.yml (already modified)
docker-compose up -d

# Option B: Use full optimized version (with monitoring)
docker-compose -f docker-compose-optimized.yml up -d
```

### Verify Services
```bash
# Check all containers running
docker ps

# Should see:
# - smart_vehicle_api (port 8000)
# - smart_vehicle_mongo (port 27017)
# - smart_vehicle_redis (port 6379)
# - smart_vehicle_celery (background worker)
# - (optional) prometheus (port 9090), grafana (port 3000), flower (port 5555)

# Test API
curl http://localhost:8000/health
curl http://localhost:8000/ready
```

---

## Option 2: Kubernetes (Production Ready)

### Prerequisites
```bash
# Install kubectl
choco install kubernetes-cli -y

# Install Minikube (for local testing) OR connect to cloud cluster
choco install minikube -y
minikube start

# Or use AWS EKS, GCP GKE, Azure AKS
```

### Deploy to Kubernetes
```bash
# 1. Create namespace
kubectl create namespace smartinsure

# 2. Create secrets
kubectl create secret generic db-secrets \
  --from-literal=mongo-uri='mongodb://admin:password@mongodb:27017/vehicle_insurance?authSource=admin' \
  --from-literal=redis-url='redis://redis-cluster:6379/0' \
  --from-literal=celery-broker-url='redis://redis-cluster:6379/0' \
  -n smartinsure

# 3. Deploy API
kubectl apply -f k8s-deployment.yaml

# 4. Check deployment
kubectl get pods -n smartinsure
kubectl logs -f deployment/smartinsure-api -n smartinsure

# 5. Port forward for testing
kubectl port-forward -n smartinsure svc/smartinsure-api-service 8000:8000
curl http://localhost:8000/health
```

### Scale Up
```bash
# HPA (Horizontal Pod Autoscaler) will automatically scale based on CPU/Memory
# View current scaled pods
kubectl get hpa -n smartinsure

# Manually scale if needed
kubectl scale deployment/smartinsure-api --replicas=10 -n smartinsure
```

---

## Option 3: Cloud Providers

### AWS (Recommended for production)

#### Using AWS ECS
```bash
# 1. Push image to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ECR_REPO_URL

docker tag smartinsure-api:v1 YOUR_ECR_REPO_URL/smartinsure-api:v1
docker push YOUR_ECR_REPO_URL/smartinsure-api:v1

# 2. Create ECS task definition
# 3. Create ECS service with load balancer

# 4. Setup RDS (MongoDB Atlas or DocumentDB)
# 5. Setup ElastiCache (for Redis)
```

#### Using AWS Fargate + RDS + ElastiCache
```bash
# Cost-optimized, fully managed
# ~$1,500/month for 200K users
```

### Google Cloud (GCP)

```bash
# Using Cloud Run + Firestore/MongoDB Atlas + Memorystore
gcloud run deploy smartinsure-api \
  --image gcr.io/YOUR_PROJECT/smartinsure-api \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --cpu 2 \
  --concurrency 100

# Setup auto-scaling
gcloud run services update-traffic smartinsure-api \
  --to-revisions LATEST=100
```

### Azure

```bash
# Using Container Instances + Cosmos DB + Cache for Redis
az container create \
  --resource-group myResourceGroup \
  --name smartinsure-api \
  --image smartinsure-api:v1 \
  --memory 1 \
  --cpu 2
```

---

## Post-Deployment Checklist

### 1. Verify All Services
```bash
# API Health
curl http://api.smartinsure.com/health

# Readiness (DB + Cache)
curl http://api.smartinsure.com/ready

# Frontend works
curl http://smartinsure.com

# Admin panel
curl http://smartinsure.com/admin
```

### 2. Setup Monitoring

#### Option A: Docker Stack (Prometheus + Grafana)
```bash
# Already included in docker-compose-optimized.yml
# Access: http://localhost:3000 (admin/admin)
```

#### Option B: Cloud Native Monitoring
- AWS: CloudWatch
- GCP: Stackdriver
- Azure: Application Insights

### 3. Database Verification
```bash
# Connect to MongoDB
mongosh "mongodb://admin:password@mongodb:27017/vehicle_insurance"

# List indexes
db.vehicles.getIndexes()
db.vehicles.stats()

# Check connection pool status
db.serverStatus()
```

### 4. Cache Verification
```bash
# Check Redis
redis-cli -h redis info stats

# Check memory usage
redis-cli -h redis info memory

# Check connected clients
redis-cli -h redis client list
```

### 5. Load Testing
```bash
# Install hey (HTTP load generator)
go install github.com/rakyll/hey@latest

# Run 10,000 requests with 100 concurrent
hey -n 10000 -c 100 http://localhost:8000/api/sheets

# Expected with Phase 1:
# - Average latency: <500ms
# - Success rate: >99.9%
# - 30-40 RPS capacity
```

---

## Environment Variables Setup

### For docker-compose.yml
```bash
# Create .env file
MONGO_URI=mongodb://mongodb:27017/vehicle_insurance?maxPoolSize=500&minPoolSize=50
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
LOG_LEVEL=INFO
AWS_ACCESS_KEY=your_key
AWS_SECRET_KEY=your_secret
S3_BUCKET=smartinsure-uploads
```

### For Kubernetes
```bash
# Create secrets
kubectl create secret generic api-secrets \
  --from-literal=mongo-uri='...' \
  --from-literal=redis-url='...' \
  -n smartinsure

# Reference in pod template:
# valueFrom:
#   secretKeyRef:
#     name: api-secrets
#     key: mongo-uri
```

---

## Scaling Timeline

| Phase | Duration | Action | Impact |
|-------|----------|--------|--------|
| **Phase 1** | Week 1-2 | Current (Docker Compose optimized) | 2-4x throughput |
| **Phase 2** | Week 3-5 | Add caching + query optimization | 10-50x faster |
| **Phase 3** | Week 6-9 | Kubernetes + auto-scaling | Unlimited capacity |
| **Phase 4** | Week 10-12 | S3 storage + databases | Multi-region |
| **Phase 5** | Week 13-14 | CDN + frontend optimization | Global speed |
| **Phase 6+** | Ongoing | Monitoring + tuning | 99.99% uptime |

---

## Rollback Procedure

If something breaks:

```bash
# Stop current deployment
docker-compose down
# OR
kubectl delete namespace smartinsure

# Verify stopped
docker ps

# Restore from backup (if any)
# Or redeploy original version

# Check logs for issues
docker logs smart_vehicle_api
# OR
kubectl logs deployment/smartinsure-api -n smartinsure

# Clear Redis cache if corrupted
redis-cli FLUSHDB

# Clear MongoDB if needed
docker exec smart_vehicle_mongo mongosh --eval "db.dropDatabase()"
```

---

## Performance Benchmarks

### Before Optimization
- API Workers: 4
- Response Time (p95): 2-3 seconds
- Throughput: ~10 RPS
- Database Connections: 100 max
- Uptime: 95%

### After Phase 1 (you are here!)
- API Workers: 16
- Response Time (p95): <1 second
- Throughput: 30-40 RPS
- Database Connections: 500 max
- Uptime: 99%

### Target After Phase 3 (Kubernetes)
- API Instances: 10-50 (auto-scaling)
- Response Time (p95): <500ms
- Throughput: 100+ RPS
- Database: Replica Set (3 nodes)
- Cache: 6+ Redis nodes
- Uptime: 99.99%

### Target After All Phases (200K users)
- API Instances: 50-100+
- Response Time (p95): <200ms
- Throughput: 200+ RPS
- Database: Sharded (32+ shards)
- Cache: Redis Cluster
- Storage: Multi-region S3
- Uptime: 99.99%

---

## Support & Troubleshooting

### Common Issues

**1. Containers not starting**
```bash
docker-compose logs
# Check MONGO_URI and REDIS_URL
```

**2. Database connection timeout**
```bash
# Increase pool size or reduce timeouts
MONGO_URI=mongodb://...?maxPoolSize=600&waitQueueTimeoutMS=20000
```

**3. Out of memory**
```bash
# Reduce Redis memory or add more RAM
redis-server --maxmemory 4gb  # Increase
```

**4. Pod won't start in Kubernetes**
```bash
kubectl describe pod POD_NAME -n smartinsure
kubectl logs POD_NAME -n smartinsure
# Check resource requests/limits
```

---

## Next Actions

1. ✅ **Now:** Deploy Phase 1 (you just did this!)
2. 📅 **Week 1:** Monitor performance, collect metrics
3. 📅 **Week 2:** Implement Phase 2 (caching)
4. 📅 **Week 3:** Test at load, optimize queries
5. 📅 **Week 4+:** Move to Kubernetes

---

**Questions? Check SCALABILITY_PLAN.md for detailed architecture.**
