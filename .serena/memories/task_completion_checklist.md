# Task Completion Checklist

When completing a development task, ensure the following steps are performed:

## Code Quality
- [ ] **Linting**: Run `pnpm lint` in the appropriate app directory
  - Frontend: `cd apps/web && pnpm lint`
  - Backend: `cd apps/api && pnpm lint`
- [ ] **Formatting**: Run `pnpm format` or `pnpm format:check`
  - Frontend: `cd apps/web && pnpm format`
  - Backend: `cd apps/api && pnpm format`
- [ ] **Type Checking**: Ensure TypeScript compiles without errors
  - Frontend: `cd apps/web && pnpm build` (Next.js includes type checking)
  - Backend: `cd apps/api && pnpm build`

## Testing
- [ ] **Unit Tests**: Write and run tests for new functionality
  - `pnpm test` (in apps/api)
- [ ] **Test Coverage**: Verify coverage for critical paths
  - `pnpm test:cov` (in apps/api)
- [ ] **E2E Tests**: Update or add integration tests if needed
  - `pnpm test:e2e` (in apps/api)

## Database Changes
- [ ] **Prisma Migrations**: If database schema changed
  - Create migration: `pnpm prisma:migrate`
  - Verify migration: Check `prisma/migrations/` directory
  - Update seed if needed: Modify `src/database/seeds/seed.ts`
- [ ] **Prisma Client**: Regenerate client if schema changed
  - `pnpm prisma:generate`

## API Changes (Backend)
- [ ] **Swagger Documentation**: Update API documentation
  - Add appropriate decorators (`@ApiOperation`, `@ApiResponse`, etc.)
  - Verify at `/api` endpoint
- [ ] **DTOs**: Create or update Data Transfer Objects
  - Add validation decorators (`@IsString()`, `@IsEmail()`, etc.)
- [ ] **Versioning**: Consider API versioning if breaking changes

## Environment Variables
- [ ] **New Variables**: Update `.env.example` files
  - Frontend: `apps/web/.env.example`
  - Backend: `apps/api/.env.example` and `.env.docker.example`
- [ ] **Documentation**: Document new environment variables in README or docs

## Git & Commits
- [ ] **Conventional Commits**: Use proper commit format
  - `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
  - Example: `feat: add user profile page`
- [ ] **Commit Message**: Clear and descriptive
- [ ] **Git Hooks**: Let Husky run pre-commit checks (backend)
  - Commitlint validates message format
  - Lint-staged runs linting on staged files

## Code Review Preparation
- [ ] **Self Review**: Review your own changes
- [ ] **Remove Debug Code**: Remove console.logs, commented code, etc.
- [ ] **Check Dependencies**: Ensure no unnecessary dependencies added
- [ ] **Update Documentation**: Update README or docs if needed

## Build & Deployment Verification
- [ ] **Build Success**: Verify production build works
  - Frontend: `cd apps/web && pnpm build`
  - Backend: `cd apps/api && pnpm build`
- [ ] **Docker Build** (if applicable): Test Docker build
  - `pnpm docker:dev:up` (development)
  - `pnpm docker:prod:up` (production)

## Performance & Security
- [ ] **Security Review**: Check for security vulnerabilities
  - No hardcoded secrets
  - Proper input validation
  - Authentication/authorization checks
- [ ] **Performance**: Consider performance implications
  - Optimize queries if database-heavy
  - Check for N+1 queries
  - Consider caching if appropriate

## Frontend-Specific
- [ ] **Accessibility**: Ensure UI is accessible
  - Semantic HTML
  - Keyboard navigation
  - ARIA labels where needed
- [ ] **Responsive Design**: Test on different screen sizes
- [ ] **Browser Compatibility**: Test on major browsers

## Backend-Specific
- [ ] **Error Handling**: Proper error handling and logging
- [ ] **Rate Limiting**: Consider rate limiting for new endpoints
- [ ] **Email Templates**: Build email templates if changed
  - Templates auto-build with `pnpm build`
  - Test with MailPit: http://localhost:18025

## Documentation
- [ ] **Code Comments**: Add comments for complex logic
- [ ] **README Updates**: Update README if public API changed
- [ ] **API Documentation**: Ensure Swagger docs are complete

## Final Checklist
- [ ] All tests passing
- [ ] No linting errors
- [ ] Code formatted correctly
- [ ] Builds successfully
- [ ] Documentation updated
- [ ] Git commit follows conventions
- [ ] Ready for code review
