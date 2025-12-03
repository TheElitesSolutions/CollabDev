## 1 Overview

CollabDev+ follows a client–server web architecture with a single frontend application and a single backend API:

Frontend: Next.js (React + TypeScript) running in the browser.

Backend: NestJS (Node.js, TypeScript) exposing REST APIs and WebSocket gateways.

Databases:

PostgreSQL – main relational database for users, projects, tasks, files, pages, and messages.

Redis – in-memory store for real-time pub/sub and presence.

Neo4j – graph database for relationships between tasks, files, pages, and messages (artifact graph).

The frontend communicates with the backend using HTTPS (REST) for standard CRUD operations and a persistent WebSocket connection for real-time collaboration and WebRTC signaling. Audio/video media flows directly between browsers using WebRTC.

## 2 Main Components

Client Side (Frontend – Next.js):

Workspace Shell: main layout for a project (top bar, sidebar, main content).

Kanban Board UI: displays task columns and tasks with drag-and-drop.

IDE UI: Monaco-based code editor and file tree for collaborative coding.

Website Builder UI: visual drag-and-drop page editor with live preview and code view.

Chat & Call UI: real-time project chat and video call interface (WebRTC).

Server Side (Backend – NestJS):

Auth & Users Module: login, registration, user profiles.

Projects & Members Module: project creation and membership management.

Tasks Module: Kanban columns, tasks, and status updates.

Code Module: file storage, IDE access, and real-time code collaboration.

Website Builder Module: page structures (JSON), code generation, and linkage to files.

Chat Module: project chat messages and presence tracking.

RTC Module: WebSocket-based signaling for WebRTC video calls.

Artifacts & Graph Module: links between tasks, files, pages, and messages, synced with Neo4j.

Data Layer:

PostgreSQL: persistent storage (via Prisma ORM).

Redis: pub/sub channels and presence state.

Neo4j: artifact graph (nodes = Task/File/Page/Message, edges = “LINKED_TO”).

## 3 Communication Patterns

REST (HTTPS):

Used for login, loading projects, boards, tasks, files, pages, and artifact links.

Typical path:
Frontend → REST Controller → Service → Prisma → PostgreSQL

WebSockets:

Used for:

Real-time Kanban board updates (tasks moving between columns).

Collaborative editing events in the IDE (file edits, cursors).

Website builder collaboration (optional).

Real-time chat messages and presence.

WebRTC signaling (offers, answers, ICE candidates).

Typical path:
Frontend → WebSocket Gateway → Service → Redis (pub/sub) → Other clients

WebRTC:

NestJS is only used for signaling (exchanging SDP offers/answers and ICE candidates over WebSocket).

Actual audio/video is sent directly between browsers using STUN/TURN servers.

## 4 High-Level Architecture Diagram (Text Version)

You can paste this as an ASCII diagram in your report if needed:

+------------------------------+          +------------------------------+
|          Browser             |          |          Browser             |
| (Next.js, React, Monaco,     |   P2P    | (Next.js, React, Monaco,     |
|  WebRTC, WebSocket client)   |<-------->|  WebRTC, WebSocket client)   |
+--------------+---------------+          +---------------+-------------+
               |   HTTPS (REST)                         |
               |   WebSocket (realtime + signaling)     |
               v                                        v
        +------------------------------+   uses   +----------------------+
        |        NestJS Backend        |<-------->|       Redis          |
        |  - REST Controllers          |  pub/sub |  (presence, pub/sub) |
        |  - WS Gateways               |          +----------------------+
        |  - Services (Auth, Tasks,    |
        |    Code, Pages, Chat, RTC,   |
        |    Artifacts, Graph)         |
        +-------+-----------+----------+
                |           |
                | Prisma    | Neo4j driver
                v           v
        +----------------+  +----------------+
        |  PostgreSQL    |  |    Neo4j      |
        | (relational DB)|  |(artifact graph)|
        +----------------+  +----------------+


This section should fully cover “System Architecture” + “how components and requests are organized” for your proposal.