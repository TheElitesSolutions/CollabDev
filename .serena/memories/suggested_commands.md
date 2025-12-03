# Suggested Commands

## Frontend (`apps/web`)

### Development
```bash
cd apps/web
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm start            # Start production server
```

### Code Quality
```bash
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting without fixing
```

### Environment Setup
```bash
cp .env.example .env.local    # Create local environment file
```

## Backend (`apps/api`)

### Development
```bash
cd apps/api
pnpm start:dev        # Start NestJS dev server with watch mode
pnpm start:debug      # Start in debug mode
pnpm start            # Start production server
pnpm build            # Build for production
```

### Database Management
```bash
# Prisma commands
pnpm prisma:generate         # Generate Prisma client
pnpm prisma:migrate          # Run migrations in dev
pnpm prisma:migrate:deploy   # Deploy migrations (production)
pnpm prisma:migrate:reset    # Reset database
pnpm prisma:seed             # Seed database with test data
pnpm prisma:studio           # Open Prisma Studio (GUI)
pnpm prisma:db:push          # Push schema changes (dev only)
```

### Docker Commands
```bash
# Development with Docker
pnpm docker:dev:up           # Start dev containers
pnpm docker:dev:down         # Stop dev containers

# Production with Docker
pnpm docker:prod:up          # Start prod containers
pnpm docker:prod:down        # Stop prod containers

# Access running container
docker exec -it nestjs-boilerplate-server sh
```

### Email Development
```bash
pnpm email:dev               # Start React Email dev server (http://localhost:3002)
pnpm email:build             # Build email templates to HTML (auto in build)
pnpm email:watch             # Watch email templates (auto in dev)
```

### Testing
```bash
pnpm test                    # Run all tests
pnpm test:watch              # Run tests in watch mode
pnpm test:cov                # Run tests with coverage
pnpm test:debug              # Run tests in debug mode
pnpm test:e2e                # Run end-to-end tests
```

### Code Quality
```bash
pnpm lint                    # Run ESLint and fix issues
pnpm format                  # Format code with Prettier
```

### Monitoring (Docker only)
- **MailPit SMTP**: http://localhost:18025 (local email testing)
- **Bull Board**: Access via API endpoint (job queue inspection)
- **Prisma Studio**: `pnpm prisma:studio` (database GUI)
- **Prometheus**: Enabled with `COMPOSE_PROFILES=monitoring` in `.env`
- **Grafana**: Enabled with `COMPOSE_PROFILES=monitoring` in `.env`

## Environment Setup

### Frontend
```bash
cd apps/web
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Backend
```bash
cd apps/api
cp .env.example .env
cp .env.docker.example .env.docker
# Edit .env and .env.docker with your configuration
```

## Git Workflow
```bash
git status                   # Check current status
git add .                    # Stage changes
git commit                   # Commit (Commitlint validates message)
git push                     # Push to remote
```

## Package Management
```bash
pnpm install                 # Install dependencies
pnpm add <package>           # Add dependency
pnpm add -D <package>        # Add dev dependency
pnpm remove <package>        # Remove dependency
```

## Quick Start (Full Stack)

### Option 1: With Docker (Recommended)
```bash
# 1. Setup environment files
cd apps/api
cp .env.example .env
cp .env.docker.example .env.docker

# 2. Start Docker containers
pnpm docker:dev:up

# 3. Run migrations (in container)
docker exec -it nestjs-boilerplate-server sh
pnpm prisma:migrate

# 4. Start frontend (in new terminal)
cd apps/web
cp .env.example .env.local
pnpm dev
```

### Option 2: Without Docker
```bash
# Backend
cd apps/api
cp .env.example .env
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm start:dev

# Frontend (in new terminal)
cd apps/web
cp .env.example .env.local
pnpm install
pnpm dev
```

## Deployment
```bash
# Using deployment script
sh ./bin/deploy.sh

# Or via GitHub Actions
# Commit to main branch to trigger .github/workflows/main.yml
```
