# Technology Stack

## Architecture Style
CollabDev+ uses a **single backend + single frontend** monolith architecture:
- **Frontend**: Next.js (React + TypeScript) SPA with server-side routing
- **Backend**: NestJS (Node.js, TypeScript), exposing REST APIs and WebSocket gateways
- **Communication**: HTTPS for standard CRUD operations, WebSockets for real-time features and WebRTC signaling

## Monorepo Structure
- **Root**: CollabDev+ (monorepo containing frontend and backend)
- **Package Manager**: pnpm (version 10.12.3)
- **Workspace Apps**: 
  - `apps/web` - Frontend Next.js application
  - `apps/api` - Backend NestJS application

## Frontend (`apps/web`)
### Framework & Runtime
- **Next.js 14.1.1** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript 5.4.5** - Type-safe JavaScript

### UI & Styling
- **Tailwind CSS 3.4.3** - Utility-first CSS framework
- **shadcn/ui** - Component library (Radix UI + Tailwind)
- **Radix UI** - Accessible UI components
- **Lucide React** - Icon library
- **next-themes** - Dark mode support

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting (with auto sort imports & Tailwind)
- **TypeScript strict mode** - Enhanced type checking
- **@t3-oss/env-nextjs** - Type-safe environment variables

## Backend (`apps/api`)
### Framework & Runtime
- **NestJS 11.1.3** - Progressive Node.js framework
- **Node.js** - JavaScript runtime
- **Fastify 5.4.0** - High-performance web framework
- **TypeScript 5.8.3** - Type-safe JavaScript

### Database & ORM
- **PostgreSQL** - Primary database
- **Prisma 6.11.1** - ORM with type-safe database client
- **Redis** - Caching and message broker

### Authentication & Authorization
- **Better Auth 1.2.12** - Complete authentication solution
  - Email/Password
  - OAuth
  - Magic Link
  - Pass Keys
  - Two-Factor Authentication
  - Session Management

### API & Real-time Communication
- **REST API** - RESTful endpoints with Swagger documentation
- **WebSocket (Socket.io 4.8.1)** - Real-time communication via Redis Adapter
- **Swagger** - API documentation and versioning

### Background Processing
- **BullMQ 5.56.4** - Queue management
- **Bull Board** - UI for job inspection
- **Worker server** - Background task processing

### Email Management
- **React Email 4.1.1** - Email template management (dev only)
- **Nodemailer 7.0.5** - Email sending
- **MailPit** - SMTP server for local email testing
- **Handlebars 4.7.8** - Email template rendering

### Monitoring & Logging
- **Pino** - High-performance logging
- **Sentry 9.38.0** - Error tracking
- **Prometheus** - Server & database monitoring
- **Grafana** - Monitoring dashboards

### File Storage
- **AWS S3 SDK** - Cloud file storage
- **Fastify Multer** - Local file uploads

### Development Tools
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting with organize imports
- **Jest 30.0.4** - Testing framework
- **Husky** - Git hooks
- **Commitlint** - Commit message linting
- **Docker** - Containerization (dev & prod ready)
- **SWC** - Fast TypeScript/JavaScript compiler (instead of Webpack)

### Performance & Scalability
- **Compression** - Response compression
- **Helmet** - Security headers
- **Rate Limiting** - Redis-based rate limiter
- **Graceful Shutdown** - Clean server shutdown
- **Internationalization (i18n)** - Multi-language support

## Databases

### PostgreSQL
**Purpose**: Main relational database
**Usage**: Store users, projects, project memberships, Kanban columns, tasks, files metadata and content, page structures, chat messages, and artifact link records
**ORM**: Prisma (schema-driven, type-safe data access)

### Redis
**Purpose**: Real-time pub/sub and caching
**Usage**: 
- Presence state (who is online and where)
- Pub/sub channels for WebSocket events
- Short-lived caches for real-time operations
- Transient collaboration state (file edits, cursors)

**Key Patterns**:
- Presence: `presence:project:<projectId>` → Set of userId
- Channels: `ws:project:<projectId>:chat`, `ws:file:<fileId>:edits`

### Neo4j
**Purpose**: Artifact graph database
**Usage**: Store and query relationships between artifacts
- **Nodes**: Task, File, Page, Message (with UUID matching PostgreSQL IDs)
- **Relationships**: LINKED_TO, RELATED_TO
- **Queries**: "Show all artifacts related to task X", "Find tasks touching file Y"
- **Sync**: ArtifactsService/GraphModule keeps Neo4j in sync with PostgreSQL artifact_links table

## Real-Time Communication

### WebSocket Architecture
- Frontend maintains **single WebSocket connection per authenticated user**
- Logical rooms/channels group events:
  - **Project rooms**: chat, board updates, presence
  - **File rooms**: code collaboration (edits, cursors)
  - **Page rooms**: website builder collaboration
  - **Call rooms**: WebRTC signaling

### Redis Pub/Sub for Scalability
- Backend uses Redis pub/sub to propagate events consistently between WebSocket gateway instances
- Enables horizontal scaling if backend ever needs multiple instances
- All gateways subscribe to relevant Redis channels and broadcast to their connected clients

### WebRTC Media
- **Signaling**: WebSocket-based (offer/answer/ICE candidates handled by RtcModule)
- **Media Path**: Direct P2P between browsers (audio/video does NOT go through backend)
- **STUN/TURN**: External servers for NAT traversal

## Planned Backend Modules

### Logical Separation (NestJS Monolith)
- **AuthModule**: User authentication and session management
- **UsersModule**: User profiles and management
- **ProjectsModule**: Project CRUD and membership
- **TasksModule**: Kanban board and task management
- **CodeModule**: File storage and collaborative editing
- **WebsiteBuilderModule**: Page structure and code generation
- **ChatModule**: Project chat and presence
- **RtcModule**: WebRTC signaling
- **ArtifactsModule**: Artifact linking (tasks ↔ files ↔ pages)
- **GraphModule**: Neo4j integration and graph queries
