# MVP Feature Checklist

## 1. Workspace, Authentication, and Projects

**Requirements**:
- Users can log in to the system
- Users can see a **project workspace** with:
  - Project name and description
  - List of project members
- Users can open at least one pre-configured demo project containing:
  - Kanban board
  - Code repository (demo files)
  - Website builder pages
  - Project chat

**Implementation Note**: Registration and project creation can be simplified or seeded for demo

---

## 2. Task & Project Management (Kanban Board)

**Board Structure**:
- Per-project Kanban board with at least three columns:
  - `To Do`
  - `In Progress`
  - `Done`

**Task Features**:
- Title
- Description
- Status / column
- Assignee (must be a project member)
- Due date

**User Capabilities**:
- Project owner/manager can:
  - Create, edit, and delete tasks
  - Drag and drop tasks between columns
  - Assign tasks to team members
  - Update task due dates

**Real-time**:
- Kanban board updates in real time for all users in the same project workspace

---

## 3. Real-time Collaborative IDE

**Core Features**:
- Embedded **Monaco Editor** in browser
- File tree for demo project
- Users can:
  - Open files from file tree
  - View and edit file contents

**Real-time Collaboration**:
- Multiple users can open same file and see each other's text changes
- Basic cursor or selection presence (showing where other users are editing)

**Task Integration**:
- From a task, users can link one or more relevant code files
- When viewing a file in IDE, users can see list of tasks linked to that file

---

## 4. Website Builder (Visual Editor + Code View)

**Builder Capabilities**:
- Visual website builder for at least one landing page
- Canvas where users can drag and drop basic components:
  - Section / container
  - Text
  - Button
  - Card / image placeholder

**Data Storage**:
- Page structure stored as JSON-like component tree

**Code Sync**:
- When designer edits layout in builder, CollabDev+ regenerates underlying code file (React/JSX or HTML)
- IDE can open and display this generated code file

**Live Preview**:
- Preview pane (or preview route) shows rendered page based on generated code

---

## 5. Communication Layer (Chat + Video Call)

### 5.1 Project Chat

**Features**:
- Per-project chat panel
- Users can:
  - Send text messages
  - See messages from other members in real time
- Messages show:
  - Sender name
  - Timestamp
- Chat history stored and reloadable when opening workspace

### 5.2 Video Call (WebRTC)

**Minimum Requirement**:
- In each project workspace, users can start and join a **video call**
- 1:1 video call between two users in same project
- Signaling handled through backend using WebSockets
- Media (audio/video) flows directly between browsers using WebRTC

**Optional Extensions**:
- Screen sharing
- Multi-user calls
- Advanced controls

---

## 6. Artifact Linking (Tasks ↔ Files ↔ Pages ↔ Messages)

**Capability**:
- Users can create links between different artifacts in project:
  - Tasks
  - Code files
  - Builder pages
  - Chat messages (optional but desirable)

**From Task**:
- Attach one or more code files
- Attach a page from website builder
- Optionally reference specific chat message or discussion

**From File (IDE)**:
- View list of tasks linked to that file

**From Page (Builder)**:
- View tasks linked to that page

**Storage**:
- Artifact links stored in dedicated model
- Can be represented in Neo4j for graph queries and visualization

---

## 7. Real-Time Behavior Summary

**Real-time Updates**:
- Kanban board changes (moving tasks, updating status) broadcast to all users
- Chat messages appear instantly for all connected users
- IDE file edits synchronized in real time between all users with file open
- Website builder changes reflected to other connected users (basic/limited for MVP)
- Video calls use real-time WebRTC connections coordinated via WebSockets
