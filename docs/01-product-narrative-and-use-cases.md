# CollabDev+ – Phase 0 / Step 1: Product Narrative & Use Cases

## 1. Elevator Pitch

CollabDev+ is a web-based collaborative development platform that combines a real-time IDE, visual website builder, chat, video calls, and task management in a single workspace. It lets developers, designers, and project owners work together live on the same code, designs, and tasks without jumping between tools.

## 2. Primary Personas

### 2.1 Developer

A developer who wants to write and review code, debug issues, and manage tasks in one place, while collaborating in real time with teammates instead of juggling multiple apps (IDE, Jira, Slack, etc.).

### 2.2 Designer / Non-technical teammate

A designer or non-technical collaborator who wants to visually design pages, give feedback, and understand project status without touching complex developer tools, using a simple website builder that stays in sync with the actual code.

### 2.3 Project Owner / Manager

A project owner or manager who needs an overview of tasks, deadlines, and team activity, and wants to join live sessions (chat, video, screen sharing) to clarify requirements and ensure everyone is aligned.

## 3. Hero Demo Flow 1 – Real-time Sprint Setup & Pair Programming

1. A developer logs into CollabDev+ and opens an existing project workspace that includes code, tasks, and team chat.
2. The project owner joins the same workspace and opens the Kanban board to review current tasks and deadlines.
3. Together on a video call inside CollabDev+, they discuss priorities while the project owner drags tasks between columns, assigns them, and sets due dates.
4. The developer clicks on a task card and links it to an existing code file, so the task is directly connected to the relevant part of the codebase.
5. The developer opens the web-based IDE (Monaco), and another developer joins the same file; both see each other’s cursors and edits in real time.
6. They use integrated chat to share code snippets and quick notes, while the project owner watches progress via the live task status updates.
7. When the feature is completed, the developer marks the task as Done; the task card now shows linked artifacts (e.g. related files, discussions), keeping everything tied together.

## 4. Hero Demo Flow 2 – Designer–Developer Collaboration on a Landing Page

1. A designer logs into CollabDev+ and opens the website builder for the team’s project, seeing existing pages and components.
2. The designer starts creating a new landing page using drag-and-drop components (hero section, buttons, cards) in the visual builder—no code needed.
3. In the same workspace, a developer opens the corresponding code view of that page in the IDE; as the designer edits the layout, the developer sees the underlying code update in real time.
4. They start a video call and screen sharing session inside CollabDev+ so the designer can explain layout and branding ideas while pointing at specific sections.
5. The developer tweaks responsive behavior and logic directly in the code; the designer immediately sees the visual changes reflected back in the builder (two-way sync, even if limited in scope).
6. The project owner joins the session via chat, leaves comments on specific components (e.g., “Add CTA here”, “Change this color”), and links a task to “Finalize landing page content”.
7. After final review, the team publishes the updated page preview and marks the related task as completed, with the page, code, and discussion all linked as artifacts in the project.

## 5. Out-of-Scope for These Flows

- AI features such as AI chat, AI autocomplete, or AI-driven design recommendations (they are future extensions, not shown in the initial hero demos).
- One-click cloud deployment and advanced DevOps pipelines (e.g., auto-deploy to multiple cloud environments).
- Mobile companion app usage (flows focus on the web platform only).
- Large enterprise features like complex role hierarchies, SSO, and advanced audit logs.
- Deep Git integrations (e.g., PR reviews, branch management) beyond basic code editing and linking artifacts to tasks.
