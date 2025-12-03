# 04 – System Components and Responsibilities

This document describes the core backend and frontend components of CollabDev+, and what each is responsible for.

---

## 1. Backend Components (NestJS Modules as Subsystems)

Each module represents a logical subsystem within the NestJS monolith.

### 1.1 Auth & Users (AuthModule, UsersModule)

**Responsibilities:**

- User registration and login.
- Password hashing and verification.
- Issuing and validating JWTs or session tokens.
- Providing current user info (`/me`).
- Basic profile fields (name, avatar).

**Data (PostgreSQL):**

- `users`
- Optionally `sessions` or `refresh_tokens`

**Main HTTP APIs:**

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`

---

### 1.2 Projects & Memberships (ProjectsModule)

**Responsibilities:**

- Create and manage projects.
- Manage membership (which users belong to which project).
- Store project metadata (name, description).

**Data (PostgreSQL):**

- `projects`
- `project_members` (user_id, project_id, role)

**Main HTTP APIs:**

- `GET /projects` (list projects for current user)
- `POST /projects`
- `GET /projects/:id`
- `GET /projects/:id/members`
- `POST /projects/:id/members` (add or invite members, simplified)

---

### 1.3 Tasks & Kanban (TasksModule)

**Responsibilities:**

- Kanban board per project.
- CRUD operations for tasks and columns.
- Updating task status, assignee, and due dates.

**Data (PostgreSQL):**

- `task_columns` (id, project_id, name, order_index)
- `tasks` (id, project_id, column_id, title, description, assignee_id, due_date, status, etc.)

**Main HTTP APIs:**

- `GET /projects/:id/board` (columns + tasks)
- `POST /projects/:id/columns`
- `POST /projects/:id/tasks`
- `PATCH /tasks/:id` (update status, column, assignee, etc.)

**Realtime (WebSocket via Project room):**

- After changes, broadcast events like:
  - `task:created`
  - `task:updated`
  - `task:deleted`

---

### 1.4 Code & Files (CodeModule)

**Responsibilities:**

- Manage demo project files and folder structure.
- Provide file content to the IDE.
- Handle real-time collaboration events (text edits, presence).
- Persist code changes to the database.

**Data (PostgreSQL):**

- `files` (id, project_id, path, name, type, last_modified_at, last_modified_by, etc.)
- `files.content` as a text column (for MVP)

**Main HTTP APIs:**

- `GET /projects/:id/files` (file tree)
- `GET /files/:id` (file metadata + content)
- `PUT /files/:id` (save full content – used for explicit saves/checkpoints)

**Realtime (WebSocket via File room):**

- Events such as:
  - `file:join` / `file:leave`
  - `file:edit` (patch or delta)
  - `file:cursor` (cursor/selection positions)
- Uses Redis (pub/sub or cache) to store transient collaboration state and broadcast events.

---

### 1.5 Website Builder (WebsiteBuilderModule)

**Responsibilities:**

- Manage website pages for each project.
- Store page structure as a component tree (JSON).
- Generate code (React/JSX or HTML) from the structure.
- Link pages to specific files managed by the CodeModule.

**Data (PostgreSQL):**

- `pages` (id, project_id, name, route, linked_file_id)
- `pages.structure` (JSON column describing layout tree)

**Main HTTP APIs:**

- `GET /projects/:id/pages`
- `GET /pages/:id`
- `POST /projects/:id/pages`
- `PATCH /pages/:id` (update structure, trigger code generation)

**Internal Behavior:**

- On update:
  - Call a generator function to convert `structure` JSON → code string.
  - Use `CodeService` to update the linked file content.
- Optionally broadcasts builder updates via WebSocket in `page-<id>` rooms.

---

### 1.6 Chat & Presence (ChatModule)

**Responsibilities:**

- Project-level chat (text messages).
- Store chat history.
- Manage presence (who is online in the project workspace).

**Data (PostgreSQL):**

- `messages` (id, project_id, user_id, content, created_at)

**Redis:**

- Presence keys:
  - e.g. `presence:project:<projectId>` → set of user IDs.
- Pub/sub channels for chat:
  - e.g. `project:<projectId>:chat`.

**Main HTTP APIs:**

- `GET /projects/:id/messages` (load latest history)

**Realtime (WebSocket via Project room):**

- Events:
  - `chat:message` (new message)
  - `presence:update` (user joined/left workspace)

---

### 1.7 RTC Signaling (RtcModule)

**Responsibilities:**

- Handle signaling for WebRTC video calls:
  - Offers, answers, ICE candidates.
- Manage call rooms (tied to projects or dedicated call IDs).

**Data:**

- Mostly transient; can be kept in memory/Redis if needed for room tracking.

**Realtime (WebSocket via Call room):**

- Events:
  - `call:join`
  - `call:offer`
  - `call:answer`
  - `call:ice-candidate`
  - `call:leave`

**Media Path:**

- Actual audio/video flows P2P between browsers via WebRTC using STUN/TURN servers (backend is not in the media path).

---

### 1.8 Artifacts & Graph (ArtifactsModule, GraphModule)

**Responsibilities:**

- Manage links between artifacts: tasks, files, pages, messages.
- Provide queries to retrieve related artifacts for a given entity.
- Optionally sync those relationships into Neo4j for graph queries/visualization.

**Data (PostgreSQL):**

- `artifact_links`:
  - `id`
  - `project_id`
  - `source_type` (`task`, `file`, `page`, `message`)
  - `source_id`
  - `target_type`
  - `target_id`
  - `created_by`
  - `created_at`

**Neo4j:**

- Nodes: `Task`, `File`, `Page`, `Message`.
- Relationships: `LINKED_TO`, `RELATED_TO`.

**Main HTTP APIs:**

- `POST /artifacts/link` (create link between two artifacts)
- `GET /tasks/:id/artifacts`
- `GET /files/:id/artifacts`
- `GET /pages/:id/artifacts`

---

## 2. Frontend Feature Areas (Next.js)

Frontend feature “slices” mirror backend modules and provide the UX.

### 2.1 Auth UI

**Responsibilities:**

- Login (and optionally registration) forms.
- Handling authentication tokens and storing current user state.
- Redirecting to the workspace after successful login.

---

### 2.2 Workspace Shell

**Responsibilities:**

- Main layout under `/workspace/[projectId]`.
- Shows:
  - Top bar (project name, actions, call button, user info).
  - Sidebar navigation (Board, IDE, Website Builder, Chat).
  - Main content area for the selected tool.
- Initializes and owns the **single WebSocket connection** to the backend.
- Provides project context (projectId, members, etc.) to child components.

---

### 2.3 Kanban Board UI

**Responsibilities:**

- Display columns and tasks for the project.
- Provide drag-and-drop interactions for moving tasks.
- Show assignees and due dates.

**Data sources:**

- REST:
  - `GET /projects/:id/board`
  - `PATCH /tasks/:id` for updates.
- WebSocket:
  - Subscribe to task-related events from project room and update board in real time.

---

### 2.4 IDE UI

**Responsibilities:**

- Render file tree and Monaco editor.
- Let users open and edit files.
- Show other users’ cursors and edits.
- Display linked tasks for the currently open file.

**Data sources:**

- REST:
  - `GET /projects/:id/files`
  - `GET /files/:id`
- WebSocket:
  - Join `file-<fileId>` room.
  - Send and receive `file:edit` and `file:cursor` events.

---

### 2.5 Website Builder UI

**Responsibilities:**

- Provide a drag-and-drop canvas for building pages.
- Let users arrange components and edit properties.
- Show a live preview of the page and optionally its generated code.
- Display linked tasks for the current page.

**Data sources:**

- REST:
  - `GET /projects/:id/pages`
  - `GET /pages/:id`
  - `PATCH /pages/:id`
- WebSocket (optional/advanced):
  - Join `page-<pageId>` for collaborative editing of the layout.

---

### 2.6 Chat & Call UI

**Responsibilities:**

- Chat panel:
  - Show messages and message input.
  - Load history and append new messages in real time.
- Call UI:
  - Buttons to start/join a project call.
  - Video elements for local and remote streams.
  - Simple controls (mute/unmute, end call).

**Data sources:**

- REST:
  - `GET /projects/:id/messages`
- WebSocket:
  - `chat:message` events for new messages.
  - Signaling events for WebRTC (`call:offer`, `call:answer`, `call:ice-candidate`, etc.).

---

## 3. Example High-Level Flows

### 3.1 Moving a Task on the Board

1. User drags a task from `To Do` to `In Progress`.
2. Frontend optimistically updates UI and sends `PATCH /tasks/:id` with new column.
3. Backend updates the `tasks` table via Prisma.
4. Backend broadcasts `task:updated` to the project WebSocket room.
5. All connected clients update the board accordingly.

### 3.2 Collaborative Code Editing

1. Two users open the same file in the IDE.
2. Each client loads initial content via `GET /files/:id` and joins `room:file-<id>` over WebSocket.
3. User A makes an edit; editor sends `file:edit` event with patch.
4. Backend applies the patch to in-memory/Redis state and periodically persists to PostgreSQL.
5. Backend broadcasts patch to all clients in `room:file-<id>`.
6. User B’s editor applies the patch and updates the visible content.

### 3.3 Website Builder Update

1. Designer changes the layout in the builder (drag/drop, edit props).
2. Frontend updates local component tree and sends debounced `PATCH /pages/:id` with updated structure.
3. Backend saves structure, regenerates code, and updates the linked file through `CodeService`.
4. Backend emits a `file:updated` event to `room:file-<linkedFileId>`.
5. Developer’s IDE instance receives new code and refreshes the view if in builder-managed mode.

### 3.4 Chat Message and Video Call

1. User sends a chat message → frontend emits `chat:message` via WebSocket.
2. Backend saves message in `messages` table and broadcasts to project room.
3. Users click “Start Call” → frontend joins call room via WebSocket and exchanges WebRTC offer/answer/ICE messages through the RtcModule.
4. Browsers establish a direct WebRTC connection and exchange audio/video.
