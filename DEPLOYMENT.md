# CollabDev+ Deployment Guide

This guide covers deploying CollabDev+ to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start (Development)](#quick-start-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 20+ (for local development)
- pnpm 8+
- Docker and Docker Compose (for containerized deployment)
- PostgreSQL 15+
- Redis 7+

## Quick Start (Development)

### 1. Start Infrastructure Services

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Optional: Start database management tools
docker-compose -f docker-compose.dev.yml --profile tools up -d
```

### 2. Configure Environment

```bash
# API Configuration
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your settings

# Web Configuration
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local with your settings
```

### 3. Setup Database

```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed
```

### 4. Start Applications

```bash
# Start API (from apps/api)
pnpm start:dev

# Start Web (from apps/web, in another terminal)
pnpm dev
```

Access:
- Web: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

## Docker Deployment

### Development with Docker

```bash
# Start all services including databases
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production with Docker

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with production values

# 2. Build and start
docker-compose up -d --build

# 3. Run database migrations
docker-compose exec api npx prisma migrate deploy

# 4. View logs
docker-compose logs -f
```

### Docker Profiles

```bash
# Default: postgres, redis, api, web
docker-compose up -d

# Full: Includes Neo4j
docker-compose --profile full up -d

# Development tools: Includes Adminer and Redis Commander
docker-compose -f docker-compose.dev.yml --profile tools up -d
```

## Production Deployment

### Cloud Platforms

#### AWS (ECS/Fargate)

1. Push images to ECR:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag collabdev-api:latest <account>.dkr.ecr.us-east-1.amazonaws.com/collabdev-api:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/collabdev-api:latest
```

2. Create ECS task definitions using the Dockerfiles
3. Configure Application Load Balancer
4. Use RDS for PostgreSQL and ElastiCache for Redis

#### Digital Ocean (App Platform)

1. Connect your GitHub repository
2. Configure environment variables in App Platform
3. Set build commands:
   - API: `cd apps/api && pnpm install && pnpm build`
   - Web: `cd apps/web && pnpm install && pnpm build`

#### Kubernetes

```yaml
# Example deployment (api)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: collabdev-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: collabdev-api
  template:
    metadata:
      labels:
        app: collabdev-api
    spec:
      containers:
      - name: api
        image: ghcr.io/your-org/collabdev-api:latest
        ports:
        - containerPort: 3001
        envFrom:
        - secretRef:
            name: collabdev-secrets
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
```

### Reverse Proxy (Nginx)

```nginx
upstream api {
    server localhost:3001;
}

upstream web {
    server localhost:3000;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    # Web application
    location / {
        proxy_pass http://web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://:pass@host:6379` |
| `BETTER_AUTH_SECRET` | Auth secret (32+ chars) | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | API URL for auth | `https://api.domain.com` |
| `CORS_ORIGIN` | Allowed CORS origins | `https://domain.com` |

### Security Recommendations

1. **Generate Strong Secrets**:
   ```bash
   openssl rand -base64 32
   ```

2. **Use Managed Databases**: AWS RDS, Azure Database, or similar

3. **Enable SSL/TLS**: Always use HTTPS in production

4. **Rate Limiting**: Enable throttling for API endpoints
   ```env
   THROTTLER_ENABLED=true
   THROTTLER_LIMIT=100
   THROTTLER_TTL=60
   ```

5. **Error Monitoring**: Configure Sentry
   ```env
   SENTRY_DSN=https://your-sentry-dsn
   ```

## Health Checks

### API Health Endpoint

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### Docker Health Checks

Both services have built-in health checks:
- API: Checks `/api/health` every 30 seconds
- Web: Checks `/` every 30 seconds

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
docker-compose exec postgres pg_isready -U collabdev
```

#### Redis Connection Failed
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
```

#### Build Failures

```bash
# Clear build caches
rm -rf apps/api/dist apps/web/.next node_modules/.cache

# Reinstall dependencies
pnpm install --frozen-lockfile

# Rebuild
pnpm build
```

#### Container Won't Start

```bash
# Check logs
docker-compose logs api
docker-compose logs web

# Check resource usage
docker stats
```

### Logs

```bash
# API logs
docker-compose logs -f api

# Web logs
docker-compose logs -f web

# All logs
docker-compose logs -f
```

### Database Migrations

```bash
# Check migration status
docker-compose exec api npx prisma migrate status

# Apply pending migrations
docker-compose exec api npx prisma migrate deploy

# Reset database (development only!)
docker-compose exec api npx prisma migrate reset
```

## CI/CD

The project includes GitHub Actions workflows:

- **CI Pipeline** (`.github/workflows/ci.yml`):
  - Runs on every push/PR
  - Linting, testing, building
  - Security scanning

- **Deploy Pipeline** (`.github/workflows/deploy.yml`):
  - Builds Docker images
  - Pushes to GitHub Container Registry
  - Deploys to staging/production

### Required Secrets

Configure these in GitHub repository settings:
- `GHCR_TOKEN`: GitHub Container Registry token
- `SENTRY_DSN`: Sentry DSN for error tracking
- `DEPLOY_SSH_KEY`: SSH key for deployment server (if applicable)
