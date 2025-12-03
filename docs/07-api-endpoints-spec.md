# 07 – API Endpoints Specification (Draft)

This document lists the main HTTP API endpoints for CollabDev+.

- All endpoints (except `register`/`login`) require authentication via `Authorization: Bearer <token>`.
- Request/response bodies are JSON.
- This is a draft; details can be refined during implementation.

---

## 1. Auth & Users

    POST `/auth/register`

    Registers a new user (for demo, you can also pre-seed users and skip this in UI).

    **Request body:**

    ```json
    {
    "email": "user@example.com",
    "password": "secret123",
    "name": "John Doe"
    }
    Response (201):

    json
    Copy code
    {
    "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe"
    },
    "token": "jwt-or-session-token"
    }
    POST /auth/login
    Request body:

    json
    Copy code
    {
    "email": "user@example.com",
    "password": "secret123"
    }
    Response (200):

    json
    Copy code
    {
    "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe"
    },
    "token": "jwt-or-session-token"
    }
    POST /auth/logout
    Invalidates current session/token (if you track sessions in DB).

    Response (204): no content.

    GET /me
    Returns the currently authenticated user.

    Response (200):

    json
    Copy code
    {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": null
    }

---

## 2. Projects & Memberships

    GET /projects
    List projects where the current user is a member.

    Response (200):

    json
    Copy code
    [
    {
        "id": "uuid",
        "name": "CollabDev Demo Project",
        "description": "Demo workspace",
        "createdBy": "user-id",
        "createdAt": "2025-01-01T12:00:00Z"
    }
    ]
    POST /projects
    Create a new project (can be used in the future; not critical for demo).

    Request body:

    json
    Copy code
    {
    "name": "New Project",
    "description": "Optional description"
    }
    Response (201):

    json
    Copy code
    {
    "id": "uuid",
    "name": "New Project",
    "description": "Optional description",
    "createdBy": "user-id",
    "createdAt": "..."
    }
    GET /projects/:projectId
    Get project details.

    Response (200):

    json
    Copy code
    {
    "id": "uuid",
    "name": "CollabDev Demo Project",
    "description": "Demo workspace",
    "createdBy": "user-id",
    "createdAt": "...",
    "updatedAt": "..."
    }
    GET /projects/:projectId/members
    List project members.

    Response (200):

    json
    Copy code
    [
    {
        "userId": "uuid",
        "name": "John Doe",
        "email": "user@example.com",
        "role": "OWNER"
    }
    ]

---

## 3. Tasks & Kanban Board
    GET /projects/:projectId/board
    Returns columns and tasks for the project.

    Response (200):

    json
    Copy code
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
    POST /projects/:projectId/columns
    Create a new column.

    Request body:

    json
    Copy code
    {
    "name": "Blocked",
    "position": 3
    }
    Response (201):

    json
    Copy code
    {
    "id": "col-blocked",
    "projectId": "project-1",
    "name": "Blocked",
    "position": 3
    }
    POST /projects/:projectId/tasks
    Create a new task.

    Request body:

    json
    Copy code
    {
    "columnId": "col-todo",
    "title": "New task",
    "description": "Details...",
    "assigneeId": "user-1",
    "dueDate": "2025-01-15",
    "priority": "MEDIUM"
    }
    Response (201):

    json
    Copy code
    {
    "id": "task-123",
    "projectId": "project-1",
    "columnId": "col-todo",
    "title": "New task",
    "description": "Details...",
    "status": "TODO",
    "assigneeId": "user-1",
    "dueDate": "2025-01-15",
    "priority": "MEDIUM",
    "createdBy": "current-user-id",
    "createdAt": "...",
    "updatedAt": "..."
    }
    PATCH /tasks/:taskId
    Update a task (move between columns, change assignee, update title, etc.).

    Request body (any subset):

    json
    Copy code
    {
    "columnId": "col-doing",
    "status": "IN_PROGRESS",
    "assigneeId": "user-2",
    "title": "Updated title",
    "description": "Updated description",
    "dueDate": "2025-01-20"
    }
    Response (200):

    json
    Copy code
    {
    "id": "task-123",
    "projectId": "project-1",
    "columnId": "col-doing",
    "status": "IN_PROGRESS",
    "assigneeId": "user-2",
    "title": "Updated title",
    "description": "Updated description",
    "dueDate": "2025-01-20",
    "priority": "MEDIUM",
    "createdBy": "user-id",
    "createdAt": "...",
    "updatedAt": "..."
    }
    DELETE /tasks/:taskId
    Delete a task.

    Response (204): no content.

---

## 4. Files / Code (IDE)
    GET /projects/:projectId/files
    Get file tree for a project.

    Response (200):

    json
    Copy code
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
    (Implementation detail: you can either return a nested tree or a flat list with parent references. The spec above shows a tree.)

    GET /files/:fileId
    Get a single file (metadata + content).

    Response (200):

    json
    Copy code
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
    PUT /files/:fileId
    Save entire file content (e.g., when user hits explicit save).

    Request body:

    json
    Copy code
    {
    "content": "export default function Page() { /* updated */ }"
    }
    Response (200):

    json
    Copy code
    {
    "id": "file-app",
    "content": "export default function Page() { /* updated */ }",
    "updatedBy": "user-id",
    "updatedAt": "..."
    }

---

## 5. Website Builder / Pages
    GET /projects/:projectId/pages
    List pages in a project.

    Response (200):

    json
    Copy code
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
    POST /projects/:projectId/pages
    Create a new page.

    Request body:

    json
    Copy code
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
    Response (201):

    json
    Copy code
    {
    "id": "page-landing",
    "projectId": "project-1",
    "name": "Landing Page",
    "route": "/",
    "structure": { ... },
    "linkedFileId": "file-app", 
    "createdBy": "user-id",
    "createdAt": "...",
    "updatedAt": "..."
    }
    GET /pages/:pageId
    Get a single page with its structure.

    Response (200):

    json
    Copy code
    {
    "id": "page-landing",
    "projectId": "project-1",
    "name": "Landing Page",
    "route": "/",
    "structure": { ... },
    "linkedFileId": "file-app",
    "createdBy": "user-id",
    "updatedBy": "user-id",
    "createdAt": "...",
    "updatedAt": "..."
    }
    PATCH /pages/:pageId
    Update page structure (and trigger code regeneration).

    Request body:

    json
    Copy code
    {
    "name": "Landing Page",
    "structure": { "type": "Page", "children": [ ... ] }
    }
    Response (200):

    json
    Copy code
    {
    "id": "page-landing",
    "projectId": "project-1",
    "name": "Landing Page",
    "route": "/",
    "structure": { ... },
    "linkedFileId": "file-app",
    "updatedBy": "user-id",
    "updatedAt": "..."
    }
    (Internally, backend will also regenerate the code and update the linked file.)

---

## 6. Chat
    GET /projects/:projectId/messages
    Get chat history for a project.

    Query parameters (optional):

    limit (default e.g. 50)

    before (message ID or timestamp) for pagination

    Response (200):

    json
    Copy code
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
    Realtime sending of new messages happens over WebSocket, not HTTP.

    7. Artifact Links
    POST /artifacts/link
    Create a link between two artifacts (e.g., task ↔ file, task ↔ page).

    Request body:

    json
    Copy code
    {
    "projectId": "project-1",
    "sourceType": "TASK",
    "sourceId": "task-123",
    "targetType": "FILE",
    "targetId": "file-app"
    }
    Response (201):

    json
    Copy code
    {
    "id": "link-1",
    "projectId": "project-1",
    "sourceType": "TASK",
    "sourceId": "task-123",
    "targetType": "FILE",
    "targetId": "file-app",
    "createdBy": "user-id",
    "createdAt": "..."
    }
    GET /tasks/:taskId/artifacts
    List artifacts linked to a task.

    Response (200):

    json
    Copy code
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
    GET /files/:fileId/artifacts
    List artifacts linked to a file.

    Response (200):

    json
    Copy code
    {
    "fileId": "file-app",
    "links": [
        {
        "type": "TASK",
        "id": "task-123",
        "title": "Implement landing header"
        }
    ]
    }
    GET /pages/:pageId/artifacts
    List artifacts linked to a page.

    Response (200):

    json
    Copy code
    {
    "pageId": "page-landing",
    "links": [
        {
        "type": "TASK",
        "id": "task-123",
        "title": "Finalize landing page content"
        }
    ]
    }
    8. WebSocket Namespaces / Events (High-level)
    (Not full protocol, but enough to reference in docs.)

    Single WS endpoint, e.g.: wss://api.example.com/ws

    After authentication, client can send/receive events such as:

    Project room events:

    join_project { projectId }

    chat:message { projectId, content }

    task:updated { task: { ... } }

    presence:update { projectId, membersOnline: [...] }

    File room events (IDE):

    join_file { fileId }

    file:edit { fileId, range, text, version }

    file:cursor { fileId, position, selection }

    Page room events (Builder, optional):

    join_page { pageId }

    page:edit { pageId, patch: { ... } }

    Call room events (WebRTC signaling):

    call:join { projectId or callId }

    call:offer { sdp, toUserId? }

    call:answer { sdp, toUserId? }

    call:ice-candidate { candidate, toUserId? }

    call:leave {}