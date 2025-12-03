# Backend Modules and Responsibilities

CollabDev+ backend uses NestJS modules as logical subsystems within the monolith.

---

## 1. Auth & Users Module

### AuthModule
**Responsibilities**:
- User registration and login
- Password hashing and verification
- Issuing and validating JWTs or session tokens
- Providing current user info (`/me`)
- Basic profile fields (name, avatar)

**Data (PostgreSQL)**:
- `users`
- Optionally `sessions` or `refresh_tokens`

**Main HTTP APIs**:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`

---

## 2. Projects & Memberships Module

### ProjectsModule
**Responsibilities**:
- Create and manage projects
- Manage membership (which users belong to which project)
- Store project metadata (name, description)

**Data (PostgreSQL)**:
- `projects`
- `project_members` (user_id, project_id, role)

**Main HTTP APIs**:
- `GET /projects` (list projects for current user)
- `POST /projects`
- `GET /projects/:id`
- `GET /projects/:id/members`
- `POST /projects/:id/members` (add or invite members)

---

## 3. Tasks & Kanban Module

### TasksModule
**Responsibilities**:
- Kanban board per project
- CRUD operations for tasks and columns
- Updating task status, assignee, and due dates

**Data (PostgreSQL)**:
- `task_columns` (id, project_id, name, order_index)
- `tasks` (id, project_id, column_id, title, description, assignee_id, due_date, status)

**Main HTTP APIs**:
- `GET /projects/:id/board` (columns + tasks)
- `POST /projects/:id/columns`
- `POST /projects/:id/tasks`
- `PATCH /tasks/:id` (update status, column, assignee)

**Realtime (WebSocket via Project room)**:
- Events: `task:created`, `task:updated`, `task:deleted`

---

## 4. Code & Files Module

### CodeModule
**Responsibilities**:
- Manage demo project files and folder structure
- Provide file content to the IDE
- Handle real-time collaboration events (text edits, presence)
- Persist code changes to database

**Data (PostgreSQL)**:
- `files` (id, project_id, path, name, type, last_modified_at, last_modified_by)
- `files.content` as text column (for MVP)

**Main HTTP APIs**:
- `GET /projects/:id/files` (file tree)
- `GET /files/:id` (file metadata + content)
- `PUT /files/:id` (save full content)

**Realtime (WebSocket via File room)**:
- Events:
  - `file:join` / `file:leave`
  - `file:edit` (patch or delta)
  - `file:cursor` (cursor/selection positions)
- Uses Redis (pub/sub or cache) to store transient collaboration state

---

## 5. Website Builder Module

### WebsiteBuilderModule
**Responsibilities**:
- Manage website pages for each project
- Store page structure as component tree (JSON)
- Generate code (React/JSX or HTML) from structure
- Link pages to specific files managed by CodeModule

**Data (PostgreSQL)**:
- `pages` (id, project_id, name, route, linked_file_id)
- `pages.structure` (JSON column describing layout tree)

**Main HTTP APIs**:
- `GET /projects/:id/pages`
- `GET /pages/:id`
- `POST /projects/:id/pages`
- `PATCH /pages/:id` (update structure, trigger code generation)

**Internal Behavior**:
- On update:
  - Call generator function to convert `structure` JSON → code string
  - Use `CodeService` to update linked file content
- Optionally broadcasts builder updates via WebSocket in `page-<id>` rooms

---

## 6. Chat & Presence Module

### ChatModule
**Responsibilities**:
- Project-level chat (text messages)
- Store chat history
- Manage presence (who is online in project workspace)

**Data (PostgreSQL)**:
- `messages` (id, project_id, user_id, content, created_at)

**Redis**:
- Presence keys: `presence:project:<projectId>` → set of user IDs
- Pub/sub channels: `project:<projectId>:chat`

**Main HTTP APIs**:
- `GET /projects/:id/messages` (load latest history)

**Realtime (WebSocket via Project room)**:
- Events:
  - `chat:message` (new message)
  - `presence:update` (user joined/left workspace)

---

## 7. RTC Signaling Module

### RtcModule
**Responsibilities**:
- Handle signaling for WebRTC video calls:
  - Offers, answers, ICE candidates
- Manage call rooms (tied to projects or dedicated call IDs)

**Data**:
- Mostly transient; can be kept in memory/Redis for room tracking

**Realtime (WebSocket via Call room)**:
- Events:
  - `call:join`
  - `call:offer`
  - `call:answer`
  - `call:ice-candidate`
  - `call:leave`

**Media Path**:
- Actual audio/video flows P2P between browsers via WebRTC using STUN/TURN servers (backend not in media path)

---

## 8. Artifacts & Graph Module

### ArtifactsModule
**Responsibilities**:
- Manage links between artifacts: tasks, files, pages, messages
- Provide queries to retrieve related artifacts for a given entity
- Optionally sync relationships into Neo4j for graph queries/visualization

**Data (PostgreSQL)**:
- `artifact_links`:
  - id, project_id
  - source_type (task, file, page, message)
  - source_id
  - target_type
  - target_id
  - created_by, created_at

**Neo4j**:
- Nodes: Task, File, Page, Message
- Relationships: LINKED_TO, RELATED_TO

**Main HTTP APIs**:
- `POST /artifacts/link` (create link between two artifacts)
- `GET /tasks/:id/artifacts`
- `GET /files/:id/artifacts`
- `GET /pages/:id/artifacts`

### GraphModule
**Responsibilities**:
- Neo4j driver integration
- Sync artifact_links from PostgreSQL to Neo4j graph
- Provide graph queries and potentially visualization data

---

## Example High-Level Flows

### Flow 1: Moving a Task on Board
1. User drags task from "To Do" to "In Progress"
2. Frontend optimistically updates UI and sends `PATCH /tasks/:id` with new column
3. Backend updates `tasks` table via Prisma
4. Backend broadcasts `task:updated` to project WebSocket room
5. All connected clients update board accordingly

### Flow 2: Collaborative Code Editing
1. Two users open same file in IDE
2. Each client loads initial content via `GET /files/:id` and joins `room:file-<id>` over WebSocket
3. User A makes edit; editor sends `file:edit` event with patch
4. Backend applies patch to in-memory/Redis state and periodically persists to PostgreSQL
5. Backend broadcasts patch to all clients in `room:file-<id>`
6. User B's editor applies patch and updates visible content

### Flow 3: Website Builder Update
1. Designer changes layout in builder (drag/drop, edit props)
2. Frontend updates local component tree and sends debounced `PATCH /pages/:id` with updated structure
3. Backend saves structure, regenerates code, updates linked file through CodeService
4. Backend emits `file:updated` event to `room:file-<linkedFileId>`
5. Developer's IDE instance receives new code and refreshes view

### Flow 4: Chat Message and Video Call
1. User sends chat message → frontend emits `chat:message` via WebSocket
2. Backend saves message in `messages` table and broadcasts to project room
3. Users click "Start Call" → frontend joins call room via WebSocket and exchanges WebRTC offer/answer/ICE messages
4. Browsers establish direct WebRTC connection and exchange audio/video
