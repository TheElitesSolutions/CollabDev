# Codebase Structure

## Root Directory
```
CollabDev+/
├── .serena/              # Serena MCP configuration
├── apps/                 # Monorepo applications
│   ├── api/             # Backend NestJS application
│   └── web/             # Frontend Next.js application
├── docs/                # Project documentation
└── ProjectProposal.md   # Project overview and goals
```

## Frontend Structure (`apps/web`)
```
apps/web/
├── .next/                    # Next.js build output (auto-generated)
├── .vscode/                  # VSCode workspace settings
├── node_modules/             # Dependencies
├── public/                   # Static assets
├── src/                      # Source code
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   │   └── ui/             # shadcn/ui components
│   ├── config/             # Configuration files
│   ├── env/                # Environment variable definitions
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── styles/             # Global styles
│   └── types/              # TypeScript type definitions
├── .env.example             # Environment variables template
├── .env.local               # Local environment (gitignored)
├── .eslintrc.json           # ESLint configuration
├── .gitignore               # Git ignore rules
├── .prettierignore          # Prettier ignore rules
├── components.json          # shadcn/ui configuration
├── next-env.d.ts            # Next.js TypeScript definitions
├── next.config.js           # Next.js configuration
├── package.json             # Dependencies and scripts
├── postcss.config.js        # PostCSS configuration
├── prettier.config.js       # Prettier configuration
├── README.md                # Frontend documentation
├── tailwind.config.js       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

## Backend Structure (`apps/api`)
```
apps/api/
├── .docker/                     # Docker-related files
├── .git/                        # Git repository
├── .github/                     # GitHub workflows and configs
│   └── workflows/              # CI/CD workflows
├── .husky/                      # Git hooks
├── .vscode/                     # VSCode workspace settings
├── bin/                         # Executable scripts
│   └── deploy.sh               # Deployment script
├── github-assets/               # Assets for GitHub README
├── node_modules/                # Dependencies
├── prisma/                      # Prisma ORM files
│   ├── migrations/             # Database migrations
│   └── schema.prisma           # Database schema
├── scripts/                     # Build and utility scripts
│   └── mail.build.ts           # Email template builder
├── src/                         # Source code
│   ├── app.module.ts           # Root application module
│   ├── main.ts                 # Application entry point
│   ├── config/                 # Configuration modules
│   ├── database/               # Database-related code
│   │   └── seeds/              # Database seeding
│   ├── modules/                # Feature modules
│   │   ├── auth/              # Authentication
│   │   ├── users/             # User management
│   │   └── ...                # Other feature modules
│   └── shared/                 # Shared utilities
│       ├── guards/            # Authorization guards
│       ├── interceptors/      # Request/response interceptors
│       ├── pipes/             # Validation pipes
│       ├── decorators/        # Custom decorators
│       ├── filters/           # Exception filters
│       └── mail/              # Email templates
│           └── templates/     # React Email templates
├── test/                        # E2E tests
│   └── jest-e2e.json           # E2E test configuration
├── .dockerignore                # Docker ignore rules
├── .editorconfig                # Editor configuration
├── .env.example                 # Environment variables template
├── .env.docker.example          # Docker environment template
├── .gitignore                   # Git ignore rules
├── .npmrc                       # npm configuration
├── .nvmrc                       # Node version
├── .prettierignore              # Prettier ignore rules
├── .prettierrc                  # Prettier configuration
├── commitlint.config.mjs        # Commit message linting
├── docker-compose.yml           # Base Docker configuration
├── docker-compose.dev.yml       # Development Docker config
├── docker-compose.prod.yml      # Production Docker config
├── Dockerfile                   # Production Dockerfile
├── Dockerfile.dev               # Development Dockerfile
├── Dockerfile.maildev           # MailPit Dockerfile
├── eslint.config.mjs            # ESLint configuration
├── jest.config.json             # Jest testing configuration
├── lint-staged.config.mjs       # Lint-staged configuration
├── nest-cli.json                # NestJS CLI configuration
├── package.json                 # Dependencies and scripts
├── pm2.config.json              # PM2 process manager config
├── pnpm-lock.yaml               # pnpm lockfile
├── pnpm-workspace.yaml          # pnpm workspace config
├── prometheus.config.yml        # Prometheus monitoring config
├── README.md                    # Backend documentation
├── renovate.json                # Renovate bot config
├── setup-jest.mjs               # Jest setup file
├── tsconfig.build.json          # Build TypeScript config
└── tsconfig.json                # TypeScript configuration
```

## Key Directory Purposes

### Frontend
- **`src/app/`**: Next.js pages using App Router (file-based routing)
- **`src/components/`**: Reusable React components
- **`src/components/ui/`**: shadcn/ui base components
- **`src/lib/`**: Utility functions and helpers
- **`src/hooks/`**: Custom React hooks
- **`src/types/`**: TypeScript type definitions
- **`public/`**: Static files (images, fonts, etc.)

### Backend
- **`src/modules/`**: Feature modules (auth, users, etc.)
- **`src/shared/`**: Shared utilities, guards, interceptors
- **`src/config/`**: Application configuration
- **`src/database/`**: Database-related code (seeds, utilities)
- **`prisma/`**: Database schema and migrations
- **`test/`**: Integration and E2E tests
- **`scripts/`**: Build and utility scripts
- **`.docker/`**: Docker-related configurations

## Module Pattern (Backend)
Each feature module typically contains:
```
module-name/
├── dto/                 # Data Transfer Objects
│   ├── create-*.dto.ts
│   ├── update-*.dto.ts
│   └── query-*.dto.ts
├── entities/            # (Optional) Entity definitions
├── module-name.controller.ts   # HTTP request handlers
├── module-name.service.ts      # Business logic
├── module-name.module.ts       # Module definition
└── module-name.spec.ts         # Unit tests
```

## Configuration Files

### Frontend
- **`next.config.js`**: Next.js framework configuration
- **`tailwind.config.js`**: Tailwind CSS customization
- **`tsconfig.json`**: TypeScript compiler options
- **`components.json`**: shadcn/ui component configuration

### Backend
- **`nest-cli.json`**: NestJS CLI configuration
- **`tsconfig.json`**: TypeScript compiler options
- **`prisma/schema.prisma`**: Database schema definition
- **`docker-compose.yml`**: Container orchestration

## Build Outputs
- **Frontend**: `.next/` directory (gitignored)
- **Backend**: `dist/` directory (gitignored)
- **Email Templates**: Built HTML files in `dist/shared/mail/templates/`
