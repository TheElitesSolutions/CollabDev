# 05 – System Design and Diagram

This document presents the high-level system design of CollabDev+, including diagrams and typical request flows.

---

## 1. System Overview

- Users access CollabDev+ through a **web browser**.
- The frontend is a **Next.js** application (React, TypeScript, Monaco, WebRTC) that:
  - Communicates with the backend over **HTTPS (REST)** for CRUD operations.
  - Maintains a **WebSocket** connection for real-time updates and WebRTC signaling.
- The backend is a **NestJS** application that:
  - Exposes REST controllers and WebSocket gateways.
  - Uses Prisma ORM to talk to **PostgreSQL**.
  - Uses **Redis** for pub/sub and presence information.
  - Uses a Neo4j driver (via GraphModule) to manage the artifact graph.
- WebRTC media (audio/video) flows **directly between browsers**, assisted by STUN/TURN servers for NAT traversal.

---

## 2. High-Level Architecture Diagram (Mermaid)

    mermaid
    flowchart LR
        subgraph Client["User Browser"]
            FE[Next.js Frontend<br/>React + TS + Monaco + WebRTC]
        end

        subgraph Backend["NestJS Backend (Monolith)"]
            C[REST Controllers]
            G[WebSocket Gateways]
            S[Business Services]
            P[Prisma ORM]
            GR[Graph Service (Neo4j)]
        end

        subgraph Data["Data Layer"]
            PG[(PostgreSQL)]
            R[(Redis)]
            N[(Neo4j)]
        end

        subgraph Media["Media Path"]
            STUN[STUN/TURN Server]
        end

        FE <-->|HTTPS (REST)| C
        FE <-->|WebSocket| G

        C --> S
        G --> S

        S --> P
        P --> PG

        S --> R
        G --> R

        S --> GR
        GR --> N

        FE <-->|ICE / SDP via WS| G
        FE <--> STUN
        FE <--> FE

---

## 3. Internal Backend Structure (Mermaid)
    flowchart TB
        subgraph NestJS Backend
            subgraph API_Layer["API Layer (REST Controllers)"]
                AuthCtrl[AuthController]
                ProjectsCtrl[ProjectsController]
                TasksCtrl[TasksController]
                CodeCtrl[CodeController]
                PagesCtrl[WebsiteBuilderController]
                ChatCtrl[ChatController]
                ArtifactsCtrl[ArtifactsController]
            end

            subgraph WS_Layer["WebSocket Gateways"]
                ProjectGateway[ProjectGateway<br/>(chat, presence, board events)]
                FileGateway[FileGateway<br/>(IDE collaboration)]
                PageGateway[PageGateway<br/>(builder collaboration)]
                CallGateway[CallGateway<br/>(WebRTC signaling)]
            end

            subgraph Service_Layer["Service Layer"]
                AuthSvc[AuthService]
                UsersSvc[UsersService]
                ProjectsSvc[ProjectsService]
                TasksSvc[TasksService]
                CodeSvc[CodeService]
                PagesSvc[WebsiteBuilderService]
                ChatSvc[ChatService]
                RtcSvc[RtcService]
                ArtifactsSvc[ArtifactsService]
                GraphSvc[GraphService]
            end

            subgraph Data_Access["Data Access"]
                PrismaClient[(Prisma)]
                Neo4jClient[(Neo4j Driver)]
                RedisClient[(Redis Client)]
            end
        end

        AuthCtrl --> AuthSvc
        ProjectsCtrl --> ProjectsSvc
        TasksCtrl --> TasksSvc
        CodeCtrl --> CodeSvc
        PagesCtrl --> PagesSvc
        ChatCtrl --> ChatSvc
        ArtifactsCtrl --> ArtifactsSvc

        ProjectGateway --> ChatSvc
        ProjectGateway --> TasksSvc
        FileGateway --> CodeSvc
        PageGateway --> PagesSvc
        CallGateway --> RtcSvc

        AuthSvc --> PrismaClient
        UsersSvc --> PrismaClient
        ProjectsSvc --> PrismaClient
        TasksSvc --> PrismaClient
        CodeSvc --> PrismaClient
        PagesSvc --> PrismaClient
        ChatSvc --> PrismaClient
        ArtifactsSvc --> PrismaClient

        ChatSvc --> RedisClient
        CodeSvc --> RedisClient
        RtcSvc --> RedisClient

        GraphSvc --> Neo4jClient
        ArtifactsSvc --> GraphSvc
---

## 4. Request and Event Flows
    4.1 CRUD Flow – Updating a Task on the Kanban Board

    Scenario: Project owner drags a task from “To Do” to “In Progress”.

    Frontend (Next.js):

    The board UI moves the task visually (optimistic update).

    Sends an HTTP request:

    PATCH /tasks/:id

    Body: { columnId: "<in-progress-column-id>" }.

    Backend (NestJS):

    TasksController receives the request.

    Validates payload and permissions.

    Calls TasksService.updateTask(taskId, dto, currentUser).

    Service & Database:

    TasksService verifies the task belongs to the project and the column is valid.

    Calls prisma.task.update(...) to update the record in PostgreSQL.

    Realtime Broadcast:

    After success, TasksService (or controller) notifies ProjectGateway.

    ProjectGateway sends a WebSocket event task:updated to room:project-<projectId>.

    Other Clients:

    All connected clients receive task:updated.

    Their Kanban boards update the specific task accordingly.

    4.2 Realtime Flow – Collaborative Code Editing

    Scenario: Two developers edit the same file in the IDE.

    Initial Load (REST):

    Each client:

    Loads file tree: GET /projects/:id/files.

    Loads file content: GET /files/:id.

    Join File Room (WebSocket):

    Each client opens a WebSocket connection (one per user).

    When a user opens a file, the frontend sends:

    Event: file:join

    Payload: { fileId }.

    FileGateway:

    Adds the socket to room:file-<fileId>.

    Optionally broadcasts presence events.

    Editing:

    When a user types, editor integration sends:

    Event: file:edit

    Payload: { fileId, range, text, version } (patch/diff).

    Backend Handling:

    FileGateway forwards event to CodeService.

    CodeService:

    Applies patch to in-memory or Redis-stored document.

    Optionally checks the version to limit conflicts.

    Periodically persists complete content to PostgreSQL (e.g., on explicit save, or time-based snapshots).

    Broadcast:

    CodeService or FileGateway emits file:edit to room:file-<fileId> for all subscribers except the sender.

    Other Clients:

    Their editors receive the patch and apply it.

    Cursor/selection updates are handled similarly with file:cursor events.

    4.3 Website Builder Flow – Visual Edits → Code Sync

    Scenario: Designer edits landing page layout; dev sees updated code.

    Load Page:

    Frontend calls:

    GET /pages/:id
    Returns:

    {
    "id": "page1",
    "projectId": "p1",
    "name": "Landing Page",
    "structure": { /* JSON layout tree */ },
    "linkedFileId": "file123"
    }


    Visual Edits:

    Designer drags components and edits properties.

    Frontend updates the local structure JSON state.

    On change (debounced), frontend sends:

    PATCH /pages/:id with { structure: <updated JSON> }.

    Backend Processing:

    WebsiteBuilderController → WebsiteBuilderService.updatePageStructure.

    Service:

    Saves new structure to PostgreSQL.

    Calls generateCodeFromStructure(structure) to produce a code string.

    Calls CodeService.updateGeneratedFile(linkedFileId, code).

    Code Module:

    CodeService updates the file content in the files table.

    Emits a file:updated event to room:file-<linkedFileId>.

    Developer IDE:

    IDE client, listening on that file room, receives file:updated.

    If the file is tied to the builder, the editor refreshes code or highlights builder-controlled sections.

    Preview:

    A preview panel or route (e.g. GET /preview/page/:id) renders the page on the server using the generated code.

    4.4 Chat and WebRTC Signaling Flow

    Scenario: Team members chat and start a video call.

    Chat

    User sends a message.

    Frontend emits a WebSocket event:

    chat:message with { projectId, content }.

    ProjectGateway receives it and calls ChatService.saveMessage.

    ChatService inserts into messages table in PostgreSQL.

    ProjectGateway broadcasts the same event to room:project-<projectId>.

    All clients append the new message to their chat list.

    WebRTC Video Call

    User clicks “Start Call” in a project.

    Frontend joins room:call-<projectId> via WebSocket.

    Browser A creates an SDP offer and sends:

    call:offer via WebSocket with { projectId, sdp, toUserId? }.

    CallGateway forwards the offer to the intended peer(s).

    Browser B receives the offer, creates an answer, and sends:

    call:answer via WebSocket.

    ICE candidates are sent as call:ice-candidate events.

    Browsers use STUN/TURN servers to establish a direct P2P connection.

    Audio/video media then flows directly between browsers, not through the backend.

---

## 5. Summary

    CollabDev+ is designed as a monolithic NestJS backend and a Next.js frontend with a clear separation of concerns.

    REST handles standard CRUD; WebSockets handle real-time collaboration and signaling.

    PostgreSQL stores core data, Redis coordinates real-time events and presence, and Neo4j models the artifact graph.

    The system design supports the two main hero flows:

    Real-time sprint setup & pair programming (board + IDE + chat + call).

    Designer–developer collaboration on a landing page (builder + IDE + comments + tasks).