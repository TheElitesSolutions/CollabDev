# API Endpoints Specification

All endpoints (except `/auth/register` and `/auth/login`) require authentication via `Authorization: Bearer <token>`.
Request/response bodies are JSON.

---

## 1. Auth & Users

### POST /auth/register
Register a new user (for demo, can pre-seed users and skip in UI)

**Request**:
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "name": "John Doe"
}
```

**Response (201)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-or-session-token"
}
```

### POST /auth/login
**Request**:
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response (200)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-or-session-token"
}
```

### POST /auth/logout
Invalidates current session/token

**Response (204)**: No content

### GET /me
Returns currently authenticated user

**Response (200)**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatarUrl": null
}
```

---

## 2. Projects & Memberships

### GET /projects
List projects where current user is a member

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "name": "CollabDev Demo Project",
    "description": "Demo workspace",
    "createdBy": "user-id",
    "createdAt": "2025-01-01T12:00:00Z"
  }
]
```

### POST /projects
Create new project

**Request**:
```json
{
  "name": "New Project",
  "description": "Optional description"
}
```

**Response (201)**: Project object with id, createdAt, etc.

### GET /projects/:projectId
Get project details

### GET /projects/:projectId/members
List project members

**Response (200)**:
```json
[
  {
    "userId": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "OWNER"
  }
]
```

---

## 3. Tasks & Kanban Board

### GET /projects/:projectId/board
Returns columns and tasks for project

**Response (200)**:
```json
{
  "columns": [
    { "id": "col-todo", "name": "To Do", "position": 0 },
    { "id": "col-doing", "name": "In Progress", "position": 1 },
    { "id": "col-done", "name": "Done", "position": 2 }
  ],
  "tasks": [
    {
      "id": "task-1",
      "projectId": "project-1",
      "columnId": "col-todo",
      "title": "Implement landing header",
      "description": "Add hero section layout",
      "status": "TODO",
      "assigneeId": "user-1",
      "dueDate": "2025-01-10",
      "createdBy": "user-2",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### POST /projects/:projectId/columns
Create new column

**Request**:
```json
{
  "name": "Blocked",
  "position": 3
}
```

### POST /projects/:projectId/tasks
Create new task

**Request**:
```json
{
  "columnId": "col-todo",
  "title": "New task",
  "description": "Details...",
  "assigneeId": "user-1",
  "dueDate": "2025-01-15",
  "priority": "MEDIUM"
}
```

### PATCH /tasks/:taskId
Update task (move between columns, change assignee, update title, etc.)

**Request** (any subset):
```json
{
  "columnId": "col-doing",
  "status": "IN_PROGRESS",
  "assigneeId": "user-2",
  "title": "Updated title",
  "description": "Updated description",
  "dueDate": "2025-01-20"
}
```

### DELETE /tasks/:taskId
Delete task

**Response (204)**: No content

---

## 4. Files / Code (IDE)

### GET /projects/:projectId/files
Get file tree for project

**Response (200)**:
```json
[
  {
    "id": "file-root-src",
    "name": "src",
    "path": "src",
    "type": "FOLDER",
    "children": [
      {
        "id": "file-app",
        "name": "page.tsx",
        "path": "src/app/page.tsx",
        "type": "CODE"
      }
    ]
  }
]
```

### GET /files/:fileId
Get single file (metadata + content)

**Response (200)**:
```json
{
  "id": "file-app",
  "projectId": "project-1",
  "name": "page.tsx",
  "path": "src/app/page.tsx",
  "type": "CODE",
  "language": "tsx",
  "content": "export default function Page() { ... }",
  "updatedBy": "user-id",
  "updatedAt": "..."
}
```

### PUT /files/:fileId
Save entire file content

**Request**:
```json
{
  "content": "export default function Page() { /* updated */ }"
}
```

---

## 5. Website Builder / Pages

### GET /projects/:projectId/pages
List pages in project

**Response (200)**:
```json
[
  {
    "id": "page-landing",
    "projectId": "project-1",
    "name": "Landing Page",
    "route": "/",
    "linkedFileId": "file-app",
    "updatedAt": "..."
  }
]
```

### POST /projects/:projectId/pages
Create new page

**Request**:
```json
{
  "name": "Landing Page",
  "route": "/",
  "structure": {
    "type": "Page",
    "children": [
      {
        "type": "Section",
        "props": {},
        "children": [
          {
            "type": "Heading",
            "props": { "text": "Welcome" }
          },
          {
            "type": "Button",
            "props": { "text": "Get Started" }
          }
        ]
      }
    ]
  }
}
```

### GET /pages/:pageId
Get single page with structure

### PATCH /pages/:pageId
Update page structure (triggers code regeneration)

**Request**:
```json
{
  "name": "Landing Page",
  "structure": { "type": "Page", "children": [...] }
}
```

**Note**: Backend regenerates code and updates linked file

---

## 6. Chat

### GET /projects/:projectId/messages
Get chat history for project

**Query parameters**:
- `limit` (default 50)
- `before` (message ID or timestamp) for pagination

**Response (200)**:
```json
{
  "messages": [
    {
      "id": "msg-1",
      "projectId": "project-1",
      "authorId": "user-1",
      "authorName": "John Doe",
      "content": "Hello team",
      "createdAt": "..."
    }
  ]
}
```

**Note**: Real-time sending of new messages happens over WebSocket, not HTTP

---

## 7. Artifact Links

### POST /artifacts/link
Create link between two artifacts

**Request**:
```json
{
  "projectId": "project-1",
  "sourceType": "TASK",
  "sourceId": "task-123",
  "targetType": "FILE",
  "targetId": "file-app"
}
```

### GET /tasks/:taskId/artifacts
List artifacts linked to task

**Response (200)**:
```json
{
  "taskId": "task-123",
  "links": [
    {
      "type": "FILE",
      "id": "file-app",
      "name": "page.tsx",
      "path": "src/app/page.tsx"
    },
    {
      "type": "PAGE",
      "id": "page-landing",
      "name": "Landing Page",
      "route": "/"
    }
  ]
}
```

### GET /files/:fileId/artifacts
List artifacts linked to file

### GET /pages/:pageId/artifacts
List artifacts linked to page

---

## 8. WebSocket Events

**Single WS endpoint**: `wss://api.example.com/ws`

### Project Room Events
- `join_project { projectId }`
- `chat:message { projectId, content }`
- `task:updated { task: {...} }`
- `presence:update { projectId, membersOnline: [...] }`

### File Room Events (IDE)
- `join_file { fileId }`
- `file:edit { fileId, range, text, version }`
- `file:cursor { fileId, position, selection }`

### Page Room Events (Builder)
- `join_page { pageId }`
- `page:edit { pageId, patch: {...} }`

### Call Room Events (WebRTC Signaling)
- `call:join { projectId or callId }`
- `call:offer { sdp, toUserId? }`
- `call:answer { sdp, toUserId? }`
- `call:ice-candidate { candidate, toUserId? }`
- `call:leave {}`
