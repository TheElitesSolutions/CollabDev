# Code Style & Conventions

## General Principles
- **Type Safety**: Use TypeScript strict mode
- **Consistency**: Follow existing patterns in the codebase
- **Clean Code**: Meaningful names, single responsibility, DRY principles

## Frontend (`apps/web`)

### TypeScript Configuration
- Strict mode enabled
- Path aliases configured via `@/` prefix
- Type-safe environment variables using `@t3-oss/env-nextjs`

### Prettier Configuration
- **Semicolons**: No semicolons (`semi: false`)
- **Quotes**: Double quotes (`singleQuote: false`)
- **Tab Width**: 2 spaces
- **Line Endings**: LF (`endOfLine: "lf"`)
- **Trailing Commas**: ES5 style (`trailingComma: "es5"`)

### Import Order (Auto-sorted by Prettier)
1. React imports
2. Next.js imports
3. Third-party modules
4. Types
5. Environment config (`@/env`)
6. Types (`@/types`)
7. Config (`@/config`)
8. Lib utilities (`@/lib`)
9. Hooks (`@/hooks`)
10. UI components (`@/components/ui`)
11. Components (`@/components`)
12. Styles (`@/styles`)
13. App-specific (`@/app`)
14. Relative imports (`./`)

### File Naming
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Config files**: kebab-case (e.g., `prettier.config.js`)

### Component Structure
- Use functional components with hooks
- shadcn/ui components for consistent UI
- Tailwind CSS for styling

## Backend (`apps/api`)

### TypeScript Configuration
- Strict mode enabled
- Path aliases configured
- Decorators enabled (for NestJS)

### Prettier Configuration
- **Semicolons**: Required (`default`)
- **Quotes**: Single quotes (`singleQuote: true`)
- **Tab Width**: 2 spaces (default)
- **Trailing Commas**: All (`trailingComma: "all"`)
- **Import Organization**: Auto-organized via `prettier-plugin-organize-imports`

### NestJS Conventions
- **Controllers**: Handle HTTP requests, use decorators
- **Services**: Business logic, injectable
- **Modules**: Organize features
- **DTOs**: Data Transfer Objects with class-validator
- **Guards**: Authentication/Authorization
- **Interceptors**: Request/Response transformation
- **Pipes**: Data validation and transformation

### File Naming
- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Modules**: `*.module.ts`
- **DTOs**: `*.dto.ts`
- **Entities**: `*.entity.ts` (Prisma models in `schema.prisma`)
- **Tests**: `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e)

### Database Conventions
- **Prisma Schema**: Define models in `prisma/schema.prisma`
- **Migrations**: Use Prisma migrations (`prisma migrate dev`)
- **Seeding**: Define seeds in `src/database/seeds/seed.ts`

### API Documentation
- Use Swagger decorators (`@ApiTags`, `@ApiOperation`, etc.)
- Document all endpoints
- Version APIs appropriately

## Commit Conventions
- **Format**: Conventional Commits (enforced by Commitlint)
- **Examples**:
  - `feat: add user authentication`
  - `fix: resolve login bug`
  - `docs: update README`
  - `refactor: simplify validation logic`
  - `test: add unit tests for auth service`

## Testing Conventions
- **Unit Tests**: `*.spec.ts` files next to source
- **E2E Tests**: `test/*.e2e-spec.ts`
- **Coverage**: Aim for meaningful coverage, not just metrics
- **Mocking**: Use Jest mocks for external dependencies

## Docker Conventions
- **Development**: Use `docker-compose.dev.yml`
- **Production**: Use `docker-compose.prod.yml`
- **Environment**: Separate `.env` and `.env.docker` files
