# 06 – Database Schema Draft

This document describes the initial database design for CollabDev+.

- Primary relational store: **PostgreSQL** (via Prisma).
- Realtime / transient data: **Redis**.
- Artifact graph: **Neo4j**.

This is a draft schema to guide implementation; it can be refined during development.

---

## 1. PostgreSQL Relational Schema

### 1.1 Users

**Table:** `users`

| Column         | Type           | Constraints                          | Description                        |
|----------------|----------------|--------------------------------------|------------------------------------|
| id             | uuid           | PK, default `gen_random_uuid()`      | User ID                            |
| email          | varchar(255)   | UNIQUE, NOT NULL                     | Login email                        |
| password_hash  | varchar(255)   | NOT NULL                             | Hashed password                    |
| name           | varchar(255)   | NOT NULL                             | Display name                       |
| avatar_url     | varchar(512)   | NULL                                 | Optional profile picture           |
| created_at     | timestamptz    | NOT NULL, default `now()`            | Creation time                      |
| updated_at     | timestamptz    | NOT NULL, default `now()`            | Last update time                   |

Indexes:
- `idx_users_email` on `(email)`

---

### 1.2 User Sessions (optional but useful)

**Table:** `user_sessions`

| Column      | Type        | Constraints                          | Description                        |
|-------------|-------------|--------------------------------------|------------------------------------|
| id          | uuid        | PK, default `gen_random_uuid()`      | Session ID                         |
| user_id     | uuid        | FK → `users(id)`, NOT NULL           | Owner                              |
| token_hash  | varchar(255)| NOT NULL                             | Hashed session/refresh token       |
| created_at  | timestamptz | NOT NULL, default `now()`            | Created time                       |
| expires_at  | timestamptz | NOT NULL                             | Expiration                         |

Indexes:
- `idx_sessions_user` on `(user_id)`
- `idx_sessions_token_hash` on `(token_hash)`

---

### 1.3 Projects

**Table:** `projects`

| Column       | Type        | Constraints                          | Description                        |
|--------------|-------------|--------------------------------------|------------------------------------|
| id           | uuid        | PK, default `gen_random_uuid()`      | Project ID                         |
| name         | varchar(255)| NOT NULL                             | Project name                       |
| description  | text        | NULL                                 | Optional description               |
| created_by   | uuid        | FK → `users(id)`, NOT NULL           | Creator                            |
| created_at   | timestamptz | NOT NULL, default `now()`            | Created time                       |
| updated_at   | timestamptz | NOT NULL, default `now()`            | Last update                        |

Indexes:
- `idx_projects_created_by` on `(created_by)`

---

### 1.4 Project Members

**Table:** `project_members`

| Column      | Type        | Constraints                          | Description                        |
|-------------|-------------|--------------------------------------|------------------------------------|
| id          | uuid        | PK, default `gen_random_uuid()`      | Membership ID                      |
| project_id  | uuid        | FK → `projects(id)`, NOT NULL        | Project                            |
| user_id     | uuid        | FK → `users(id)`, NOT NULL           | Member                             |
| role        | varchar(32) | NOT NULL                             | e.g. `OWNER`, `MAINTAINER`, `MEMBER` |
| joined_at   | timestamptz | NOT NULL, default `now()`            | When they joined                   |

Constraints:
- UNIQUE `(project_id, user_id)`

Indexes:
- `idx_project_members_project` on `(project_id)`
- `idx_project_members_user` on `(user_id)`

---

### 1.5 Task Columns (Kanban)

**Table:** `task_columns`

| Column      | Type        | Constraints                          | Description                        |
|-------------|-------------|--------------------------------------|------------------------------------|
| id          | uuid        | PK, default `gen_random_uuid()`      | Column ID                          |
| project_id  | uuid        | FK → `projects(id)`, NOT NULL        | Project                            |
| name        | varchar(64) | NOT NULL                             | Column title (e.g. "To Do")        |
| position    | int         | NOT NULL                             | Order in board                     |
| created_at  | timestamptz | NOT NULL, default `now()`            | Created time                       |

Indexes:
- `idx_task_columns_project` on `(project_id)`
- `idx_task_columns_project_position` on `(project_id, position)`

---

### 1.6 Tasks

**Table:** `tasks`

| Column        | Type        | Constraints                          | Description                           |
|---------------|-------------|--------------------------------------|---------------------------------------|
| id            | uuid        | PK, default `gen_random_uuid()`      | Task ID                               |
| project_id    | uuid        | FK → `projects(id)`, NOT NULL        | Project                               |
| column_id     | uuid        | FK → `task_columns(id)`, NOT NULL    | Column                                |
| title         | varchar(255)| NOT NULL                             | Task title                            |
| description   | text        | NULL                                 | Task description                      |
| status        | varchar(32) | NOT NULL, e.g. `TODO`, `IN_PROGRESS`, `DONE` | Status (mirrors column)      |
| assignee_id   | uuid        | FK → `users(id)`, NULL               | Assigned user                         |
| due_date      | date        | NULL                                 | Optional due date                     |
| priority      | varchar(32) | NULL                                 | e.g. `LOW`, `MEDIUM`, `HIGH`          |
| created_by    | uuid        | FK → `users(id)`, NOT NULL           | Creator                               |
| created_at    | timestamptz | NOT NULL, default `now()`            | Created time                          |
| updated_at    | timestamptz | NOT NULL, default `now()`            | Last update                           |

Indexes:
- `idx_tasks_project` on `(project_id)`
- `idx_tasks_project_column` on `(project_id, column_id)`
- `idx_tasks_assignee` on `(assignee_id)`

---

### 1.7 Files (Code Files and Generated Files)

**Table:** `files`

| Column         | Type        | Constraints                          | Description                          |
|----------------|-------------|--------------------------------------|--------------------------------------|
| id             | uuid        | PK, default `gen_random_uuid()`      | File ID                              |
| project_id     | uuid        | FK → `projects(id)`, NOT NULL        | Project                              |
| path           | varchar(512)| NOT NULL                             | Full path (`src/app/page.tsx`)      |
| name           | varchar(255)| NOT NULL                             | File name                            |
| type           | varchar(32) | NOT NULL                             | e.g. `CODE`, `ASSET`, `GENERATED`    |
| language       | varchar(32) | NULL                                 | e.g. `ts`, `tsx`, `js`               |
| content        | text        | NOT NULL                             | Entire file content (MVP)            |
| created_by     | uuid        | FK → `users(id)`, NOT NULL           | Creator                              |
| updated_by     | uuid        | FK → `users(id)`, NOT NULL           | Last editor                          |
| created_at     | timestamptz | NOT NULL, default `now()`            | Created time                         |
| updated_at     | timestamptz | NOT NULL, default `now()`            | Last update                          |

Constraints:
- UNIQUE `(project_id, path)`

Indexes:
- `idx_files_project` on `(project_id)`
- `idx_files_project_path` on `(project_id, path)`

---

### 1.8 Pages (Website Builder)

**Table:** `pages`

| Column         | Type        | Constraints                          | Description                           |
|----------------|-------------|--------------------------------------|---------------------------------------|
| id             | uuid        | PK, default `gen_random_uuid()`      | Page ID                               |
| project_id     | uuid        | FK → `projects(id)`, NOT NULL        | Project                               |
| name           | varchar(255)| NOT NULL                             | Page name (e.g. "Landing Page")       |
| route          | varchar(255)| NOT NULL                             | Route (e.g. `/` or `/landing`)        |
| structure      | jsonb       | NOT NULL                             | Component tree for builder            |
| linked_file_id | uuid        | FK → `files(id)`, NULL               | Code file generated from this page    |
| created_by     | uuid        | FK → `users(id)`, NOT NULL           | Creator                               |
| updated_by     | uuid        | FK → `users(id)`, NOT NULL           | Last editor                           |
| created_at     | timestamptz | NOT NULL, default `now()`            | Created time                          |
| updated_at     | timestamptz | NOT NULL, default `now()`            | Last update                           |

Indexes:
- `idx_pages_project` on `(project_id)`
- `idx_pages_project_route` on `(project_id, route)`

---

### 1.9 Messages (Project Chat)

**Table:** `messages`

| Column       | Type        | Constraints                          | Description                      |
|--------------|-------------|--------------------------------------|----------------------------------|
| id           | uuid        | PK, default `gen_random_uuid()`      | Message ID                       |
| project_id   | uuid        | FK → `projects(id)`, NOT NULL        | Project                          |
| author_id    | uuid        | FK → `users(id)`, NOT NULL           | Author                           |
| content      | text        | NOT NULL                             | Message text                     |
| reply_to_id  | uuid        | FK → `messages(id)`, NULL            | Optional reply/parent            |
| created_at   | timestamptz | NOT NULL, default `now()`            | Sent time                        |
| edited_at    | timestamptz | NULL                                 | Last edit time                   |
| deleted_at   | timestamptz | NULL                                 | Soft delete                      |

Indexes:
- `idx_messages_project_created_at` on `(project_id, created_at)`
- `idx_messages_author` on `(author_id)`

---

### 1.10 Artifact Links

**Table:** `artifact_links`

| Column       | Type        | Constraints                          | Description                               |
|--------------|-------------|--------------------------------------|-------------------------------------------|
| id           | uuid        | PK, default `gen_random_uuid()`      | Link ID                                   |
| project_id   | uuid        | FK → `projects(id)`, NOT NULL        | Project                                   |
| source_type  | varchar(32) | NOT NULL                             | `TASK`, `FILE`, `PAGE`, `MESSAGE`         |
| source_id    | uuid        | NOT NULL                             | ID in source table                        |
| target_type  | varchar(32) | NOT NULL                             | `TASK`, `FILE`, `PAGE`, `MESSAGE`         |
| target_id    | uuid        | NOT NULL                             | ID in target table                        |
| created_by   | uuid        | FK → `users(id)`, NOT NULL           | Who created the link                      |
| created_at   | timestamptz | NOT NULL, default `now()`            | Created time                              |

Indexes:
- `idx_links_project` on `(project_id)`
- `idx_links_source` on `(project_id, source_type, source_id)`
- `idx_links_target` on `(project_id, target_type, target_id)`

---

### 1.11 Call Sessions (Optional Logging)

**Table:** `call_sessions`

| Column       | Type        | Constraints                          | Description                             |
|--------------|-------------|--------------------------------------|-----------------------------------------|
| id           | uuid        | PK, default `gen_random_uuid()`      | Call ID                                 |
| project_id   | uuid        | FK → `projects(id)`, NOT NULL        | Project                                 |
| started_by   | uuid        | FK → `users(id)`, NOT NULL           | Initiator                               |
| status       | varchar(32) | NOT NULL                             | `ACTIVE`, `ENDED`                       |
| started_at   | timestamptz | NOT NULL, default `now()`            | Start time                              |
| ended_at     | timestamptz | NULL                                 | End time                                |

Indexes:
- `idx_calls_project` on `(project_id)`

---

## 2. Redis Keys and Structures (Realtime)

Redis is used for presence and pub/sub.

Suggested patterns:

### 2.1 Presence

- `presence:project:<projectId>` → Set of `userId`
- `presence:file:<fileId>` → Set of `userId`
- `presence:page:<pageId>` → Set of `userId`

Operations:
- `SADD`, `SREM`, `SMEMBERS`.

### 2.2 WebSocket / Collaboration

Channels for broadcasting events (pub/sub):

- `ws:project:<projectId>:chat`
- `ws:project:<projectId>:tasks`
- `ws:file:<fileId>:edits`
- `ws:page:<pageId>:edits`
- `ws:call:<callId>:signal`

Gateways subscribe and publish on these channels to stay in sync if multiple backend instances exist.

---

## 3. Neo4j Graph (Artifacts)

Neo4j stores the artifact relationships for richer querying and possible visualization.

### 3.1 Node Labels

- `Task`
- `File`
- `Page`
- `Message`

Common properties:
- `id`: UUID (matches relational ID)
- `projectId`: UUID
- `title` / `name` / `contentPreview` (depending on node type)
- `createdAt`: datetime

### 3.2 Relationship Types

- `LINKED_TO` (generic link between any two artifacts)
  - Properties:
    - `createdAt`: datetime
    - `createdBy`: userId

You can also define more specific relationship types if needed:

- `TASK_FILE` (`Task` → `File`)
- `TASK_PAGE` (`Task` → `Page`)
- `TASK_MESSAGE` (`Task` → `Message`)

But for MVP, a single `LINKED_TO` type is enough.

### 3.3 Example Graph Usage

- “Show everything related to task X”
  - `MATCH (t:Task {id: $taskId})-[:LINKED_TO]-(a) RETURN a`
- “Show tasks that touch file Y”
  - `MATCH (f:File {id: $fileId})-[:LINKED_TO]-(t:Task) RETURN t`

Neo4j mirrors `artifact_links` from PostgreSQL; the `ArtifactsService`/`GraphService` keeps them in sync when new links are created.

