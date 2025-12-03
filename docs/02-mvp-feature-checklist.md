# CollabDev+ – Phase 0 / Step 2: MVP Feature Checklist

This document lists the concrete features that the CollabDev+ MVP must support, derived from the hero demo flows.

## 1. Workspace, Authentication, and Projects

- Users can log in to the system.
- Users can see a **project workspace** with:
  - Project name and description.
  - List of project members.
- Users can open at least one pre-configured demo project that contains:
  - Kanban board.
  - Code repository (demo files).
  - Website builder pages.
  - Project chat.

*(Registration and project creation can be simplified or seeded for demo.)*

---

## 2. Task & Project Management (Kanban Board)

- Per-project Kanban board with at least three columns:
  - `To Do`
  - `In Progress`
  - `Done`
- Tasks support:
  - Title
  - Description
  - Status / column
  - Assignee (must be a project member)
  - Due date
- Project owner / manager can:
  - Create, edit, and delete tasks.
  - Drag and drop tasks between columns.
  - Assign tasks to team members.
  - Update task due dates.
- Kanban board updates in real time for all users in the same project workspace.

---

## 3. Real-time Collaborative IDE

- Embedded **Monaco Editor** in the browser.
- File tree for a small demo project (e.g., one frontend project).
- Users can:
  - Open files from the file tree.
  - View and edit file contents.
- Real-time collaboration:
  - Multiple users can open the same file and see each other’s text changes.
  - Basic cursor or selection presence (showing where other users are editing).
- Task integration:
  - From a task, users can link one or more relevant code files.
  - When viewing a file in the IDE, users can see a list of tasks linked to that file.

---

## 4. Website Builder (Visual Editor + Code View)

- Visual website builder for at least one landing page.
- The builder provides:
  - A canvas where users can drag and drop basic components:
    - Section / container
    - Text
    - Button
    - Card / image placeholder
- Page structure is stored as a JSON-like component tree.
- Code sync:
  - When the designer edits the layout in the builder, CollabDev+ regenerates an underlying code file (e.g., React/JSX or HTML) representing the page.
  - The IDE can open and display this generated code file.
- Live preview:
  - A preview pane (or preview route) shows the rendered page based on the generated code.

---

## 5. Communication Layer (Chat + Video Call)

### 5.1 Project Chat

- Per-project chat panel.
- Users can:
  - Send text messages.
  - See messages from other members in real time.
- Messages show:
  - Sender name.
  - Timestamp.
- Chat history is stored so that older messages can be reloaded when opening the workspace.

### 5.2 Video Call (WebRTC)

- In each project workspace, users can start and join a **video call**.
- Minimum requirement:
  - 1:1 video call between two users in the same project.
- Signaling is handled through the backend using WebSockets.
- Media (audio/video) flows directly between browsers using WebRTC.

*(Screen sharing, multi-user calls, and advanced controls are optional extensions.)*

---

## 6. Artifact Linking (Tasks ↔ Files ↔ Pages ↔ Messages)

- Users can create links between different artifacts in the project:
  - Tasks
  - Code files
  - Builder pages
  - Chat messages (optional but desirable)
- From a **task**, users can:
  - Attach one or more code files.
  - Attach a page from the website builder.
  - Optionally reference a specific chat message or discussion.
- From a **file** in the IDE, users can:
  - View a list of tasks linked to that file.
- From a **page** in the website builder, users can:
  - View tasks linked to that page.
- Artifact links are stored in a dedicated model that can also be represented in Neo4j for graph queries and visualization later.

---

## 7. Real-Time Behavior (Summary)

- Kanban board changes (e.g., moving tasks, updating status) are broadcast to all users in the project workspace.
- Chat messages appear instantly for all connected users.
- IDE file edits are synchronized in real time between all users who have that file open.
- Website builder changes can be reflected to other connected users if they are collaborating on the same page (for the MVP this can be basic or limited).
- Video calls use real-time WebRTC connections coordinated via WebSockets.
