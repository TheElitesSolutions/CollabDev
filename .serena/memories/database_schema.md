# Database Schema

CollabDev+ uses three databases:
- **PostgreSQL**: Primary relational store (via Prisma ORM)
- **Redis**: Real-time/transient data (pub/sub, presence)
- **Neo4j**: Artifact graph (relationships between tasks, files, pages, messages)

---

## PostgreSQL Tables

### 1. users
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | User ID |
| email | varchar(255) | UNIQUE, NOT NULL | Login email |
| password_hash | varchar(255) | NOT NULL | Hashed password |
| name | varchar(255) | NOT NULL | Display name |
| avatar_url | varchar(512) | NULL | Optional profile picture |
| created_at | timestamptz | NOT NULL, default now() | Creation time |
| updated_at | timestamptz | NOT NULL, default now() | Last update time |

**Indexes**: `idx_users_email` on (email)

### 2. user_sessions (Optional)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Session ID |
| user_id | uuid | FK → users(id), NOT NULL | Owner |
| token_hash | varchar(255) | NOT NULL | Hashed session/refresh token |
| created_at | timestamptz | NOT NULL, default now() | Created time |
| expires_at | timestamptz | NOT NULL | Expiration |

**Indexes**: `idx_sessions_user`, `idx_sessions_token_hash`

### 3. projects
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Project ID |
| name | varchar(255) | NOT NULL | Project name |
| description | text | NULL | Optional description |
| created_by | uuid | FK → users(id), NOT NULL | Creator |
| created_at | timestamptz | NOT NULL, default now() | Created time |
| updated_at | timestamptz | NOT NULL, default now() | Last update |

**Indexes**: `idx_projects_created_by`

### 4. project_members
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Membership ID |
| project_id | uuid | FK → projects(id), NOT NULL | Project |
| user_id | uuid | FK → users(id), NOT NULL | Member |
| role | varchar(32) | NOT NULL | OWNER, MAINTAINER, MEMBER |
| joined_at | timestamptz | NOT NULL, default now() | When they joined |

**Constraints**: UNIQUE (project_id, user_id)
**Indexes**: `idx_project_members_project`, `idx_project_members_user`

### 5. task_columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Column ID |
| project_id | uuid | FK → projects(id), NOT NULL | Project |
| name | varchar(64) | NOT NULL | Column title (e.g. "To Do") |
| position | int | NOT NULL | Order in board |
| created_at | timestamptz | NOT NULL, default now() | Created time |

**Indexes**: `idx_task_columns_project`, `idx_task_columns_project_position`

### 6. tasks
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Task ID |
| project_id | uuid | FK → projects(id), NOT NULL | Project |
| column_id | uuid | FK → task_columns(id), NOT NULL | Column |
| title | varchar(255) | NOT NULL | Task title |
| description | text | NULL | Task description |
| status | varchar(32) | NOT NULL | TODO, IN_PROGRESS, DONE |
| assignee_id | uuid | FK → users(id), NULL | Assigned user |
| due_date | date | NULL | Optional due date |
| priority | varchar(32) | NULL | LOW, MEDIUM, HIGH |
| created_by | uuid | FK → users(id), NOT NULL | Creator |
| created_at | timestamptz | NOT NULL, default now() | Created time |
| updated_at | timestamptz | NOT NULL, default now() | Last update |

**Indexes**: `idx_tasks_project`, `idx_tasks_project_column`, `idx_tasks_assignee`

### 7. files
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | File ID |
| project_id | uuid | FK → projects(id), NOT NULL | Project |
| path | varchar(512) | NOT NULL | Full path (src/app/page.tsx) |
| name | varchar(255) | NOT NULL | File name |
| type | varchar(32) | NOT NULL | CODE, ASSET, GENERATED |
| language | varchar(32) | NULL | ts, tsx, js |
| content | text | NOT NULL | Entire file content (MVP) |
| created_by | uuid | FK → users(id), NOT NULL | Creator |
| updated_by | uuid | FK → users(id), NOT NULL | Last editor |
| created_at | timestamptz | NOT NULL, default now() | Created time |
| updated_at | timestamptz | NOT NULL, default now() | Last update |

**Constraints**: UNIQUE (project_id, path)
**Indexes**: `idx_files_project`, `idx_files_project_path`

### 8. pages
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Page ID |
| project_id | uuid | FK → projects(id), NOT NULL | Project |
| name | varchar(255) | NOT NULL | Page name |
| route | varchar(255) | NOT NULL | Route (/, /landing) |
| structure | jsonb | NOT NULL | Component tree for builder |
| linked_file_id | uuid | FK → files(id), NULL | Code file generated from page |
| created_by | uuid | FK → users(id), NOT NULL | Creator |
| updated_by | uuid | FK → users(id), NOT NULL | Last editor |
| created_at | timestamptz | NOT NULL, default now() | Created time |
| updated_at | timestamptz | NOT NULL, default now() | Last update |

**Indexes**: `idx_pages_project`, `idx_pages_project_route`

### 9. messages
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Message ID |
| project_id | uuid | FK → projects(id), NOT NULL | Project |
| author_id | uuid | FK → users(id), NOT NULL | Author |
| content | text | NOT NULL | Message text |
| reply_to_id | uuid | FK → messages(id), NULL | Optional reply/parent |
| created_at | timestamptz | NOT NULL, default now() | Sent time |
| edited_at | timestamptz | NULL | Last edit time |
| deleted_at | timestamptz | NULL | Soft delete |

**Indexes**: `idx_messages_project_created_at`, `idx_messages_author`

### 10. artifact_links
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Link ID |
| project_id | uuid | FK → projects(id), NOT NULL | Project |
| source_type | varchar(32) | NOT NULL | TASK, FILE, PAGE, MESSAGE |
| source_id | uuid | NOT NULL | ID in source table |
| target_type | varchar(32) | NOT NULL | TASK, FILE, PAGE, MESSAGE |
| target_id | uuid | NOT NULL | ID in target table |
| created_by | uuid | FK → users(id), NOT NULL | Who created link |
| created_at | timestamptz | NOT NULL, default now() | Created time |

**Indexes**: `idx_links_project`, `idx_links_source`, `idx_links_target`

### 11. call_sessions (Optional)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Call ID |
| project_id | uuid | FK → projects(id), NOT NULL | Project |
| started_by | uuid | FK → users(id), NOT NULL | Initiator |
| status | varchar(32) | NOT NULL | ACTIVE, ENDED |
| started_at | timestamptz | NOT NULL, default now() | Start time |
| ended_at | timestamptz | NULL | End time |

**Indexes**: `idx_calls_project`

---

## Redis Keys and Structures

### Presence
- `presence:project:<projectId>` → Set of userId
- `presence:file:<fileId>` → Set of userId
- `presence:page:<pageId>` → Set of userId

**Operations**: SADD, SREM, SMEMBERS

### WebSocket / Collaboration (Pub/Sub Channels)
- `ws:project:<projectId>:chat`
- `ws:project:<projectId>:tasks`
- `ws:file:<fileId>:edits`
- `ws:page:<pageId>:edits`
- `ws:call:<callId>:signal`

**Purpose**: Gateways subscribe and publish to stay in sync across multiple backend instances

---

## Neo4j Graph Schema

### Node Labels
- **Task**
- **File**
- **Page**
- **Message**

**Common Properties**:
- `id`: UUID (matches relational ID)
- `projectId`: UUID
- `title` / `name` / `contentPreview` (depending on node type)
- `createdAt`: datetime

### Relationship Types
- **LINKED_TO** (generic link between any two artifacts)
  - Properties:
    - `createdAt`: datetime
    - `createdBy`: userId

**Optional Specific Relationships**:
- `TASK_FILE` (Task → File)
- `TASK_PAGE` (Task → Page)
- `TASK_MESSAGE` (Task → Message)

**Note**: For MVP, single LINKED_TO type is sufficient

### Example Queries
```cypher
# Show everything related to task X
MATCH (t:Task {id: $taskId})-[:LINKED_TO]-(a) RETURN a

# Show tasks that touch file Y
MATCH (f:File {id: $fileId})-[:LINKED_TO]-(t:Task) RETURN t
```

**Synchronization**: ArtifactsService/GraphService keeps Neo4j in sync with artifact_links table in PostgreSQL
