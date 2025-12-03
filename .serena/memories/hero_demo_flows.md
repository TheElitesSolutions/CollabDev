# Hero Demo Flows & Personas

## Primary Personas

### 1. Developer
A developer who wants to write and review code, debug issues, and manage tasks in one place, while collaborating in real time with teammates instead of juggling multiple apps (IDE, Jira, Slack, etc.).

### 2. Designer / Non-technical Teammate
A designer or non-technical collaborator who wants to visually design pages, give feedback, and understand project status without touching complex developer tools, using a simple website builder that stays in sync with the actual code.

### 3. Project Owner / Manager
A project owner or manager who needs an overview of tasks, deadlines, and team activity, and wants to join live sessions (chat, video, screen sharing) to clarify requirements and ensure everyone is aligned.

## Hero Demo Flow 1 – Real-time Sprint Setup & Pair Programming

**Scenario**: Developer and project owner collaborate on task planning and implementation

1. Developer logs into CollabDev+ and opens existing project workspace (code, tasks, team chat)
2. Project owner joins the same workspace and opens Kanban board to review tasks/deadlines
3. Together on video call, they discuss priorities while owner drags tasks between columns, assigns them, and sets due dates
4. Developer clicks task card and links it to an existing code file (task ↔ code connection)
5. Developer opens Monaco IDE, another developer joins same file → both see each other's cursors and edits in real time
6. They use integrated chat to share code snippets and quick notes while owner watches progress via live task status updates
7. When feature completed, developer marks task as Done; task card shows linked artifacts (files, discussions)

**Key Features Demonstrated**:
- Real-time Kanban board collaboration
- Task-to-code artifact linking
- Collaborative IDE with cursor presence
- Integrated chat and video call
- Live status updates across all views

## Hero Demo Flow 2 – Designer–Developer Collaboration on Landing Page

**Scenario**: Designer and developer co-create a landing page with visual builder + code sync

1. Designer logs into CollabDev+ and opens website builder for the project
2. Designer creates new landing page using drag-and-drop components (hero section, buttons, cards) - no code needed
3. In same workspace, developer opens corresponding code view; as designer edits layout, developer sees underlying code update in real time
4. They start video call with screen sharing so designer can explain layout/branding while pointing at specific sections
5. Developer tweaks responsive behavior and logic directly in code; designer immediately sees visual changes reflected back in builder (two-way sync)
6. Project owner joins via chat, leaves comments on specific components ("Add CTA here", "Change this color"), links task to "Finalize landing page content"
7. After final review, team publishes updated page preview and marks task as completed, with page, code, and discussion all linked as artifacts

**Key Features Demonstrated**:
- Visual website builder with drag-and-drop
- Two-way sync between visual builder and code
- Real-time collaboration on same page
- Video call with screen sharing
- Comment/feedback system
- Artifact linking (task ↔ page ↔ code ↔ messages)

## Out-of-Scope for MVP

### Not Included in Initial Demo
- AI features (AI chat, autocomplete, design recommendations)
- One-click cloud deployment and advanced DevOps pipelines
- Mobile companion app
- Large enterprise features (complex role hierarchies, SSO, advanced audit logs)
- Deep Git integrations (PR reviews, branch management) beyond basic code editing
