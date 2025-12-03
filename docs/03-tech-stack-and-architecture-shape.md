# 03 – Tech Stack & Architecture Shape

## 1. Overall Architecture Style

CollabDev+ uses a single backend + single frontend architecture:

- **Frontend:** Next.js (React + TypeScript) SPA with server-side routing.
- **Backend:** NestJS (Node.js, TypeScript), exposing REST APIs and WebSocket gateways.
- **Communication:** HTTPS for standard CRUD operations, WebSockets for real-time features and WebRTC signaling.
- **Databases:**
  - PostgreSQL as the main relational database.
  - Redis for real-time pub/sub and caching.
  - Neo4j for the artifact graph (relationships between tasks, files, pages, and chats).

## 2. Frontend Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- shadcn/ui (for reusable UI components)
- Monaco Editor (embedded in the IDE view)
- State: React Query + local component state

The frontend connects to the backend via:

- REST endpoints for auth, projects, tasks, files, pages, artifacts.
- A persistent WebSocket connection for collaborative editing, chat, presence, and WebRTC signaling.

## 3. Backend Stack

- Node.js + NestJS
- TypeScript
- Prisma ORM for PostgreSQL (schema-driven, type-safe data access)
- REST controllers for CRUD operations
- WebSocket gateways for real-time events
- WebRTC signaling handled via WebSocket messages

Planned modules (logical separation inside the monolith):

- AuthModule
- UsersModule
- ProjectsModule
- TasksModule
- CodeModule
- WebsiteBuilderModule
- ChatModule
- RtcModule
- ArtifactsModule
- GraphModule (Neo4j integration)

## 4. Data & Storage

- **PostgreSQL:**  
  Used to store users, projects, project memberships, Kanban columns, tasks, files metadata and content, page structures, chat messages, and artifact link records.

- **Redis:**  
  Used for presence state (who is online and where), pub/sub channels for WebSocket events, and short-lived caches for real-time operations.

- **Neo4j:**  
  Used to store and query the artifact graph:
  - Nodes: task, file, page, message.
  - Relationships: e.g., `RELATED_TO`, `REFERENCES`, or `LINKED_TO`.

## 5. Real-Time Communication

- The frontend maintains a **single WebSocket connection per authenticated user**.
- Logical rooms/channels are used to group events:
  - Project rooms (chat, board updates, presence).
  - File rooms (code collaboration).
  - Page rooms (website builder collaboration).
  - Call rooms (WebRTC signaling).

- The backend uses Redis pub/sub to propagate events consistently between WebSocket gateway instances if the backend is ever horizontally scaled.
