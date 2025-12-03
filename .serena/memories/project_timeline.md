# Project Timeline (12 Weeks / 6 Phases)

Development divided into six main phases, each producing a concrete, demo-able outcome.

---

## Phase A: Foundation Setup (Weeks 1-2)

### Main Activities
- Set up repos (frontend & backend)
- Configure PostgreSQL, Prisma, Redis, and Neo4j connection
- Create basic Prisma schema (users, projects, members)
- Implement Auth (login)
- Seed demo users & one demo project
- Basic `/workspace/[projectId]` page

### Key Deliverables
- Working login + ability to open a project workspace
- All databases (PostgreSQL, Redis, Neo4j) reachable from backend

---

## Phase B: Kanban Board (Weeks 3-4)

### Main Activities
- Design DB models for task columns & tasks
- Implement Kanban APIs (`/board`, task CRUD)
- Build Kanban UI in Next.js
- Integrate drag-and-drop
- Add WebSocket updates for task changes

### Key Deliverables
- Real-time Kanban board (create/move tasks across columns)

---

## Phase C: Collaborative IDE (Weeks 5-6)

### Main Activities
- Design `files` model and seed demo code project
- Implement file tree + file content APIs
- Integrate Monaco editor in frontend
- Add WebSocket gateway for collaborative edits
- Handle cursors & basic conflict resolution

### Key Deliverables
- Collaborative IDE where multiple users edit the same file

---

## Phase D: Website Builder (Weeks 7-8)

### Main Activities
- Design `pages` model & `structure` JSON
- Implement page CRUD APIs
- Implement code generation from page structure
- Build visual website builder UI (canvas + components + properties)
- Link pages to generated code files in IDE

### Key Deliverables
- Visual website builder synced to an underlying code file

---

## Phase E: Chat & Video (Weeks 9-10)

### Main Activities
- Implement `messages` model & chat history API
- Add chat WebSocket events and UI panel
- Implement WebSocket-based WebRTC signaling (offers/answers/ICE)
- Integrate simple 1:1 video call in workspace

### Key Deliverables
- Integrated project chat + working 1:1 video call inside workspace

---

## Phase F: Artifact Linking & Polish (Weeks 11-12)

### Main Activities
- Implement `artifact_links` model & REST APIs
- Connect tasks ↔ files ↔ pages in UI (linking panels)
- **Sync artifact links to Neo4j via GraphModule**
- (Optional) Implement simple "graph of related items" view using Neo4j queries
- UX polishing, bug fixing, performance tweaks
- Prepare final demo scenario & documentation

### Key Deliverables
- Artifact linking between code/tasks/pages, backed by Neo4j graph
- Polished MVP ready for presentation

---

## Critical Path Items

**Phase Dependencies**:
- Phase B depends on Phase A (auth, project workspace)
- Phase C depends on Phase A (workspace infrastructure)
- Phase D depends on Phase C (file management for generated code)
- Phase E is independent (can run parallel to C/D if needed)
- Phase F depends on all previous phases (integrates everything)

**Risk Mitigation**:
- WebRTC integration (Phase E) is complex - allocate buffer time
- Code generation from page structure (Phase D) - prototype early
- Neo4j sync (Phase F) - ensure GraphModule design early
- Real-time collaboration conflict resolution - test with multiple users early

**Success Metrics**:
- Each phase ends with working demo
- All hero demo flows functional by end of Phase F
- System supports 2-5 concurrent users without degradation
- All core features from MVP checklist implemented
