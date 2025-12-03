# CollabDev+ Project Index

**Last Updated**: 2025-12-02
**Project Status**: Planning & Setup Phase
**Estimated Timeline**: 16-18 weeks
**Team Size**: 2-3 developers

---

## 📋 Quick Navigation

### 🎯 Getting Started
- [Project Overview](docs/01-product-narrative-and-use-cases.md) - Vision, personas, demo flows
- [MVP Features](docs/02-mvp-feature-checklist.md) - Required functionality
- [Development Timeline](docs/09%20–%20Project%20Timeline%20-%20Gantt%20Overview.md) - 12-week plan
- [Estimation Validation](#estimation-validation) - Realistic 16-18 week assessment

### 🏗️ Technical Architecture
- [System Architecture](docs/08%20-%20System%20Architecture.md) - High-level overview
- [Tech Stack](docs/03-tech-stack-and-architecture-shape.md) - Technology decisions
- [System Components](docs/04-system-components-and-responsibilities.md) - Module breakdown
- [System Design](docs/05-system-design-and-diagram.md) - Detailed diagrams

### 💾 Data & APIs
- [Database Schema](docs/06-database-schema-draft.md) - PostgreSQL, Redis, Neo4j
- [API Endpoints](docs/07-api-endpoints-spec.md) - REST & WebSocket specs

### 👨‍💻 Development
- [Getting Started](#development-setup) - Setup instructions
- [Code Conventions](#code-style-conventions) - Style guide
- [Suggested Commands](#suggested-commands) - Common operations
- [Task Completion Checklist](#task-completion-checklist) - Quality gates

---

## 📚 Documentation Categories

### 1. Planning & Product

#### [Product Narrative](docs/01-product-narrative-and-use-cases.md)
**Purpose**: Define product vision, personas, and hero demo flows

**Key Content**:
- Elevator pitch: Web-based collaborative development platform
- Primary personas: Developer, Designer, Project Owner
- Hero Demo Flow 1: Real-time sprint setup & pair programming
- Hero Demo Flow 2: Designer-developer collaboration on landing page
- Out-of-scope features (AI, cloud deployment, mobile)

**Related**: [MVP Features](docs/02-mvp-feature-checklist.md), [Project Overview](#project-overview)

---

#### [MVP Feature Checklist](docs/02-mvp-feature-checklist.md)
**Purpose**: Concrete requirements for MVP completion

**Key Sections**:
1. Workspace & Authentication
2. Kanban Board (real-time collaboration)
3. Collaborative IDE (Monaco + presence)
4. Website Builder (visual + code sync)
5. Communication Layer (chat + video)
6. Artifact Linking (tasks ↔ files ↔ pages)

**Acceptance Criteria**: Each feature has specific deliverables and real-time requirements

**Related**: [Hero Demo Flows](#hero-demo-flows), [Database Schema](docs/06-database-schema-draft.md)

---

#### [Project Timeline](docs/09%20–%20Project%20Timeline%20-%20Gantt%20Overview.md)
**Purpose**: 12-week development roadmap (6 phases)

**Phases**:
- **Phase A (Weeks 1-2)**: Foundation setup (auth, databases, workspace)
- **Phase B (Weeks 3-4)**: Kanban board + real-time updates
- **Phase C (Weeks 5-6)**: Collaborative IDE + Monaco
- **Phase D (Weeks 7-8)**: Website builder + code generation
- **Phase E (Weeks 9-10)**: Chat + video calls (WebRTC)
- **Phase F (Weeks 11-12)**: Artifact linking + Neo4j + polish

**Critical Path**: A → B → C → D → F (Phase E can run parallel)

**Related**: [Estimation Validation](#estimation-validation), [System Components](docs/04-system-components-and-responsibilities.md)

---

### 2. Technical Architecture

#### [System Architecture](docs/08%20-%20System%20Architecture.md)
**Purpose**: High-level architecture overview

**Key Points**:
- **Frontend**: Next.js (React + TypeScript)
- **Backend**: NestJS (Node.js + TypeScript)
- **Databases**: PostgreSQL (main), Redis (real-time), Neo4j (graph)
- **Communication**: REST (CRUD) + WebSockets (real-time) + WebRTC (P2P video)

**ASCII Diagram**: Browser ↔ NestJS Backend ↔ Databases

**Related**: [Tech Stack](docs/03-tech-stack-and-architecture-shape.md), [System Design](docs/05-system-design-and-diagram.md)

---

#### [Tech Stack & Architecture Shape](docs/03-tech-stack-and-architecture-shape.md)
**Purpose**: Detailed technology decisions and rationale

**Frontend**:
- Next.js 14 (App Router)
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Monaco Editor (IDE)
- React Query (state management)

**Backend**:
- NestJS + Fastify
- Prisma ORM (PostgreSQL)
- WebSocket gateways (Socket.io)
- Redis (pub/sub, caching)
- Neo4j (artifact graph)

**Real-Time Architecture**:
- Single WebSocket connection per user
- Logical rooms: project, file, page, call
- Redis pub/sub for horizontal scaling

**Related**: [System Components](docs/04-system-components-and-responsibilities.md), [Database Schema](docs/06-database-schema-draft.md)

---

#### [System Components & Responsibilities](docs/04-system-components-and-responsibilities.md)
**Purpose**: Backend module breakdown and request flows

**Backend Modules** (9 total):
1. **AuthModule**: User authentication and sessions
2. **ProjectsModule**: Project CRUD and membership
3. **TasksModule**: Kanban board and task management
4. **CodeModule**: File storage and collaborative editing
5. **WebsiteBuilderModule**: Page structure and code generation
6. **ChatModule**: Project chat and presence
7. **RtcModule**: WebRTC signaling
8. **ArtifactsModule**: Artifact linking (PostgreSQL)
9. **GraphModule**: Neo4j integration

**Example Flows**:
- Moving a task on board (optimistic update → REST → WebSocket broadcast)
- Collaborative code editing (join file room → edit → Redis → broadcast)
- Website builder update (structure → code generation → file update)

**Related**: [System Design](docs/05-system-design-and-diagram.md), [API Endpoints](docs/07-api-endpoints-spec.md)

---

#### [System Design & Diagram](docs/05-system-design-and-diagram.md)
**Purpose**: Detailed request flows and architecture diagrams

**Contains**:
- High-level architecture diagram (Mermaid)
- Internal backend structure diagram
- Request/event flows for all major features
- WebSocket namespace/room structure

**Key Flows Documented**:
1. CRUD Flow: Updating task on Kanban board
2. Real-time Flow: Collaborative code editing
3. Builder Flow: Visual edits → code sync
4. Chat & WebRTC Flow: Messages and video signaling

**Related**: [System Components](docs/04-system-components-and-responsibilities.md), [Tech Stack](docs/03-tech-stack-and-architecture-shape.md)

---

### 3. Data & APIs

#### [Database Schema Draft](docs/06-database-schema-draft.md)
**Purpose**: Complete database design for all three databases

**PostgreSQL Tables** (11 tables):
- Users & sessions
- Projects & project_members
- Task columns & tasks
- Files (code + generated)
- Pages (website builder)
- Messages (chat)
- Artifact_links
- Call_sessions (optional logging)

**Redis Patterns**:
- Presence: `presence:project:<id>`, `presence:file:<id>`
- Pub/Sub: `ws:project:<id>:chat`, `ws:file:<id>:edits`

**Neo4j Graph**:
- Nodes: Task, File, Page, Message
- Relationships: LINKED_TO (with createdAt, createdBy)
- Example queries for artifact discovery

**Related**: [System Components](docs/04-system-components-and-responsibilities.md), [API Endpoints](docs/07-api-endpoints-spec.md)

---

#### [API Endpoints Specification](docs/07-api-endpoints-spec.md)
**Purpose**: Complete REST and WebSocket API reference

**REST Endpoints** (7 categories):
1. Auth & Users: `/auth/register`, `/auth/login`, `/me`
2. Projects: `/projects`, `/projects/:id/members`
3. Tasks & Kanban: `/projects/:id/board`, `/tasks/:id`
4. Files/Code: `/projects/:id/files`, `/files/:id`
5. Website Builder: `/projects/:id/pages`, `/pages/:id`
6. Chat: `/projects/:id/messages`
7. Artifact Links: `/artifacts/link`, `/tasks/:id/artifacts`

**WebSocket Events** (4 room types):
- Project room: `chat:message`, `task:updated`, `presence:update`
- File room: `file:edit`, `file:cursor`
- Page room: `page:edit`
- Call room: `call:offer`, `call:answer`, `call:ice-candidate`

**Authentication**: All endpoints require `Authorization: Bearer <token>` except login/register

**Related**: [Database Schema](docs/06-database-schema-draft.md), [System Components](docs/04-system-components-and-responsibilities.md)

---

### 4. Development Resources

#### Project Overview
**Elevator Pitch**: Web-based collaborative development platform combining real-time IDE, visual website builder, chat, video calls, and task management in a single workspace.

**Target Users**:
- Developers (code + tasks in one place)
- Designers (visual builder, no code complexity)
- Project Owners (overview + live collaboration)

**Key Differentiators**:
- Artifact linking (tasks ↔ files ↔ pages ↔ messages)
- Two-way code sync (builder ↔ code)
- Real-time collaboration (multiple users, cursor presence)
- Integrated communication (chat + video without leaving workspace)

**Comparison**: Integrates fragmented tools (VS Code Live Share, Figma, Webflow, Slack, Jira) into unified platform.

---

#### Hero Demo Flows

**Flow 1: Real-time Sprint Setup & Pair Programming**
1. Developer + Project Owner join workspace
2. Video call while reviewing Kanban board
3. Owner drags tasks, sets assignments and deadlines
4. Developer links task to code file
5. Two developers edit same file (real-time cursors)
6. Integrated chat for code snippets
7. Mark task complete → shows linked artifacts

**Flow 2: Designer-Developer Collaboration**
1. Designer creates landing page (drag-and-drop)
2. Developer sees code update in real-time
3. Video call + screen sharing for layout discussion
4. Developer tweaks responsive behavior in code
5. Designer sees visual changes immediately (two-way sync)
6. Owner adds comments, links task
7. Publish preview, mark task complete

---

#### Estimation Validation

**Original Plan**: 12 weeks (optimistic)
**Validated Plan**: 14-18 weeks (realistic)
**Recommended**: 16-18 weeks (with buffer)
**Confidence**: 65% → 80% (with adjustments)

**Critical Recommendations**:
1. ✅ **Use Yjs** for collaborative editing (saves 2-3 weeks)
2. ✅ **Simplify builder** to one-way sync (saves 2-3 weeks)
3. ✅ **Use WebRTC library** like Simple-peer (saves 1-2 weeks)
4. ✅ **Add 2-week buffer** for contingencies

**Phase Adjustments**:
- Phase A: 2-3 weeks (Neo4j learning)
- Phase B: 2.5-3 weeks (WebSocket coordination)
- Phase C: 2-3 weeks (with Yjs ✅)
- Phase D: 2-3 weeks (one-way sync ✅)
- Phase E: 3-4 weeks (WebRTC complexity)
- Phase F: 2-3 weeks (realistic)

**Risk Assessment**: Medium-High → managed with library usage

**See Full Report**: `.serena/memories/project_estimation_validation.md`

---

#### Code Style Conventions

**General Principles**:
- TypeScript strict mode
- SOLID principles
- DRY, KISS, YAGNI

**Frontend (`apps/web`)**:
- No semicolons, double quotes
- Tab width: 2 spaces
- Line endings: LF
- Trailing commas: ES5 style
- Import order: React → Next.js → 3rd party → internal → relative

**Backend (`apps/api`)**:
- Semicolons required, single quotes
- Tab width: 2 spaces
- Trailing commas: all
- Auto-organized imports
- NestJS conventions: controllers, services, modules, DTOs

**Commit Format**: Conventional Commits (`feat:`, `fix:`, `docs:`)

---

#### Suggested Commands

**Frontend (`apps/web`)**:
```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # ESLint
pnpm format           # Prettier
```

**Backend (`apps/api`)**:
```bash
pnpm start:dev        # Dev server with watch
pnpm build            # Production build
pnpm test             # Jest tests
pnpm test:cov         # Coverage report

# Database
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Run migrations
pnpm prisma:studio    # GUI for database

# Docker
pnpm docker:dev:up    # Start dev containers
pnpm docker:dev:down  # Stop dev containers

# Email
pnpm email:dev        # React Email dev server
```

**Environment Setup**:
```bash
# Frontend
cd apps/web
cp .env.example .env.local

# Backend
cd apps/api
cp .env.example .env
cp .env.docker.example .env.docker
```

---

#### Task Completion Checklist

**Code Quality**:
- [ ] Linting passed (`pnpm lint`)
- [ ] Formatting applied (`pnpm format`)
- [ ] TypeScript compiles (`pnpm build`)

**Testing**:
- [ ] Unit tests written and passing
- [ ] Coverage > 70% for critical paths
- [ ] E2E tests updated if needed

**Database**:
- [ ] Prisma migrations created
- [ ] Seed data updated
- [ ] Prisma client regenerated

**API Changes**:
- [ ] Swagger documentation updated
- [ ] DTOs with validation decorators
- [ ] API versioning considered

**Git**:
- [ ] Conventional commit format
- [ ] Self-reviewed changes
- [ ] Debug code removed

**Build & Deploy**:
- [ ] Production build successful
- [ ] Docker build tested (if applicable)

**Security**:
- [ ] No hardcoded secrets
- [ ] Input validation on backend
- [ ] Auth/authz checks server-side

---

## 🗂️ Codebase Structure

```
CollabDev+/
├── .serena/                    # Serena MCP configuration & memories
├── apps/
│   ├── api/                    # Backend (NestJS)
│   │   ├── prisma/            # Database schema & migrations
│   │   ├── src/
│   │   │   ├── modules/       # Feature modules (auth, tasks, code, etc.)
│   │   │   ├── shared/        # Guards, interceptors, decorators
│   │   │   └── main.ts        # Entry point
│   │   ├── .env.example
│   │   └── package.json
│   └── web/                    # Frontend (Next.js)
│       ├── src/
│       │   ├── app/           # Next.js App Router pages
│       │   ├── components/    # React components
│       │   ├── lib/           # Utilities
│       │   └── hooks/         # Custom hooks
│       ├── .env.example
│       └── package.json
├── docs/                       # Project documentation (9 files)
│   ├── 01-product-narrative-and-use-cases.md
│   ├── 02-mvp-feature-checklist.md
│   ├── 03-tech-stack-and-architecture-shape.md
│   ├── 04-system-components-and-responsibilities.md
│   ├── 05-system-design-and-diagram.md
│   ├── 06-database-schema-draft.md
│   ├── 07-api-endpoints-spec.md
│   ├── 08 - System Architecture.md
│   └── 09 – Project Timeline - Gantt Overview.md
├── PROJECT_INDEX.md            # This file (navigation hub)
└── ProjectProposal.md          # Original project proposal
```

---

## 📊 Project Status Dashboard

### Current Phase
**Status**: ✅ **Planning Complete**
**Next**: Phase A - Foundation Setup

### Readiness Checklist
- [x] Product vision defined (hero demo flows)
- [x] MVP features documented
- [x] Technical architecture designed
- [x] Database schema drafted
- [x] API endpoints specified
- [x] Timeline estimated and validated
- [x] Development environment documented
- [ ] Team assembled
- [ ] Infrastructure provisioned
- [ ] Development started

### Key Metrics
| Metric | Value | Status |
|--------|-------|--------|
| Estimated Timeline | 16-18 weeks | ✅ Validated |
| Complexity Score | 8.0/10 | 🟡 High |
| Story Points | 131 SP | - |
| Team Size | 2-3 developers | Recommended |
| Confidence Level | 80% (with adjustments) | ✅ Good |

---

## 🔗 Quick Links

### External Resources
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Yjs Collaborative Editing](https://yjs.dev/)
- [Simple-peer (WebRTC)](https://github.com/feross/simple-peer)
- [Neo4j Documentation](https://neo4j.com/docs/)

### Internal Resources
- Memory Files: `.serena/memories/`
- Technical Docs: `docs/`
- Frontend: `apps/web/`
- Backend: `apps/api/`

---

## 📝 Documentation Maintenance

**Last Comprehensive Review**: 2025-12-02
**Next Review**: Start of each phase

**Update Triggers**:
- Architecture changes
- Scope modifications
- New technology decisions
- Phase completion milestones

**Maintained By**: Development team + PM Agent

---

## 🎯 Getting Started

### For Developers

1. **Read**: [Project Overview](#project-overview) and [Hero Demo Flows](#hero-demo-flows)
2. **Understand**: [System Architecture](docs/08%20-%20System%20Architecture.md) and [Tech Stack](docs/03-tech-stack-and-architecture-shape.md)
3. **Setup**: Follow [Suggested Commands](#suggested-commands) for environment
4. **Code**: Reference [Code Conventions](#code-style-conventions) and [Database Schema](docs/06-database-schema-draft.md)

### For Project Managers

1. **Vision**: [Product Narrative](docs/01-product-narrative-and-use-cases.md)
2. **Scope**: [MVP Features](docs/02-mvp-feature-checklist.md)
3. **Timeline**: [Estimation Validation](#estimation-validation)
4. **Risk**: See risk assessment in estimation validation

### For Stakeholders

1. **Executive Summary**: [Project Overview](#project-overview)
2. **Demo Scenarios**: [Hero Demo Flows](#hero-demo-flows)
3. **Technical Overview**: [System Architecture](docs/08%20-%20System%20Architecture.md)
4. **Delivery Plan**: [Project Timeline](docs/09%20–%20Project%20Timeline%20-%20Gantt%20Overview.md)

---

**📌 Note**: This index is automatically maintained by the PM Agent. For updates or corrections, contact the development team.
