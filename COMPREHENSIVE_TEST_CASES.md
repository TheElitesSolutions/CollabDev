# CollabDev+ Comprehensive Test Cases Specification

**Generated**: December 5, 2025
**Purpose**: Complete test case specification for every feature in CollabDev+ collaborative IDE

---

## Table of Contents

1. [Authentication & Authorization Tests](#1-authentication--authorization-tests)
2. [User Management Tests](#2-user-management-tests)
3. [Project Management Tests](#3-project-management-tests)
4. [File Management Tests](#4-file-management-tests)
5. [Kanban Board Tests](#5-kanban-board-tests)
6. [Chat & Messaging Tests](#6-chat--messaging-tests)
7. [Website Builder Tests](#7-website-builder-tests)
8. [Video/Voice Call Tests](#8-videovoice-call-tests)
9. [WebSocket Real-Time Tests](#9-websocket-real-time-tests)
10. [Code Editor Collaboration Tests](#10-code-editor-collaboration-tests)
11. [File Upload Tests](#11-file-upload-tests)
12. [Integration Tests](#12-integration-tests)
13. [Performance Tests](#13-performance-tests)
14. [Security Tests](#14-security-tests)
15. [Edge Case Tests](#15-edge-case-tests)

---

## 1. Authentication & Authorization Tests

### 1.1 Registration Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-001 | Register with valid email/password | email, password, username | 201 Created, user object, session created | High |
| AUTH-002 | Register with duplicate email | existing email | 409 Conflict | High |
| AUTH-003 | Register with duplicate username | existing username | 409 Conflict | High |
| AUTH-004 | Register with weak password | password < 8 chars | 400 Bad Request | Medium |
| AUTH-005 | Register with invalid email format | invalid email | 400 Bad Request | Medium |
| AUTH-006 | Register with special characters in username | username with @#$ | 400 Bad Request | Low |
| AUTH-007 | Register and verify email verification sent | valid credentials | Email sent, isEmailVerified=false | Medium |

### 1.2 Login Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-101 | Login with valid credentials | email, password | 200 OK, session token, user object | High |
| AUTH-102 | Login with invalid email | wrong email | 401 Unauthorized | High |
| AUTH-103 | Login with invalid password | wrong password | 401 Unauthorized | High |
| AUTH-104 | Login with non-existent user | unregistered email | 401 Unauthorized | High |
| AUTH-105 | Login creates new session | valid credentials | New session in DB, token returned | High |
| AUTH-106 | Login with inactive/deleted user | deleted user | 401 Unauthorized | Medium |
| AUTH-107 | Login tracks IP and User-Agent | valid credentials | Session.ipAddress and Session.userAgent populated | Low |

### 1.3 Session Management Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-201 | Get current user with valid session | Auth header | 200 OK, user object | High |
| AUTH-202 | Get current user without token | No auth header | 401 Unauthorized | High |
| AUTH-203 | Get current user with expired token | Expired token | 401 Unauthorized | High |
| AUTH-204 | Get current user with invalid token | Invalid token | 401 Unauthorized | High |
| AUTH-205 | Logout invalidates session | Valid session | Session deleted, 401 on subsequent requests | High |
| AUTH-206 | Session expiry after configured time | Wait past expiry | 401 Unauthorized | Medium |

### 1.4 Two-Factor Authentication Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-301 | Enable 2FA | User request | 2FA secret generated, backupCodes created | Medium |
| AUTH-302 | Login with 2FA enabled requires code | email, password | Prompt for 2FA code | Medium |
| AUTH-303 | Login with correct 2FA code | email, password, valid code | 200 OK, session created | Medium |
| AUTH-304 | Login with incorrect 2FA code | email, password, invalid code | 401 Unauthorized | Medium |
| AUTH-305 | Use backup code for 2FA | email, password, backup code | 200 OK, backup code invalidated | Low |
| AUTH-306 | Disable 2FA | User request | 2FA secret deleted | Low |

### 1.5 Passkey/WebAuthn Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-401 | Register passkey | publicKey, credentialID | Passkey created in DB | Low |
| AUTH-402 | Login with passkey | credentialID, signature | 200 OK, session created | Low |
| AUTH-403 | List user's passkeys | User request | Array of passkeys | Low |
| AUTH-404 | Delete passkey | passkeyId | Passkey deleted | Low |

---

## 2. User Management Tests

### 2.1 Profile Management Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| USER-001 | Get user by ID | userId | 200 OK, user object | High |
| USER-002 | Get non-existent user | invalid userId | 404 Not Found | Medium |
| USER-003 | Update own profile | firstName, lastName, bio, image | 200 OK, updated user | High |
| USER-004 | Update own username | new username (unique) | 200 OK, username updated | High |
| USER-005 | Update username to duplicate | existing username | 409 Conflict | Medium |
| USER-006 | Update profile with invalid data | bio > 500 chars | 400 Bad Request | Low |
| USER-007 | Cannot update other user's profile | another userId | 403 Forbidden | High |
| USER-008 | Upload profile image | image file | Image uploaded to S3, URL saved | Medium |

### 2.2 User Listing Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| USER-101 | List all users (offset pagination) | page, limit | 200 OK, users array, pagination meta | Medium |
| USER-102 | List all users (cursor pagination) | cursor, limit | 200 OK, users array, next cursor | Medium |
| USER-103 | Search users by username | search query | Filtered users array | Medium |
| USER-104 | Search users by email | email query | Filtered users array | Low |

### 2.3 User Deletion Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| USER-201 | Delete own account | userId | 200 OK, user soft deleted | Medium |
| USER-202 | Cannot delete other user (non-admin) | another userId | 403 Forbidden | High |
| USER-203 | Admin can delete any user | userId (as admin) | 200 OK, user soft deleted | Medium |
| USER-204 | Deleted user cannot login | deleted user credentials | 401 Unauthorized | High |
| USER-205 | User deletion cascades to sessions | Delete user | All sessions deleted | Medium |

---

## 3. Project Management Tests

### 3.1 Project CRUD Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| PROJ-001 | Create project | name, description | 201 Created, project object, creator is OWNER | High |
| PROJ-002 | Create project without name | empty name | 400 Bad Request | Medium |
| PROJ-003 | List user's projects | User request | Array of projects user is member of | High |
| PROJ-004 | Get project details | projectId | 200 OK, project object with members | High |
| PROJ-005 | Get project user is not member of | projectId | 403 Forbidden | High |
| PROJ-006 | Update project name/description | projectId, new data | 200 OK, updated project | High |
| PROJ-007 | Non-owner cannot update project | projectId (as member) | 403 Forbidden | High |
| PROJ-008 | Delete project | projectId (as owner) | 200 OK, project soft deleted | High |
| PROJ-009 | Non-owner cannot delete project | projectId (as member) | 403 Forbidden | High |
| PROJ-010 | Project deletion cascades | Delete project | Files, tasks, board, pages deleted | High |

### 3.2 Member Management Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| PROJ-101 | Add member to project | projectId, userId, role | 201 Created, member added | High |
| PROJ-102 | Add member with OWNER role | projectId, userId, role=OWNER | Member added as OWNER | Medium |
| PROJ-103 | Add member with MEMBER role | projectId, userId, role=MEMBER | Member added as MEMBER | High |
| PROJ-104 | Add already existing member | projectId, existing userId | 409 Conflict | Medium |
| PROJ-105 | Add non-existent user | projectId, invalid userId | 404 Not Found | Low |
| PROJ-106 | List project members | projectId | Array of members with roles | High |
| PROJ-107 | Remove member from project | projectId, userId | 200 OK, member removed | High |
| PROJ-108 | Non-owner cannot remove members | projectId (as member) | 403 Forbidden | High |
| PROJ-109 | Owner can remove themselves if another owner exists | projectId | 200 OK, member removed | Medium |
| PROJ-110 | Cannot remove last owner | projectId, last owner userId | 400 Bad Request | High |
| PROJ-111 | Invite member via email | projectId, email | Email sent, invitation created | Medium |
| PROJ-112 | Non-owner cannot invite members | projectId (as member) | 403 Forbidden | High |

---

## 4. File Management Tests

### 4.1 File CRUD Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| FILE-001 | Create file in project | projectId, name, path, content | 201 Created, file object | High |
| FILE-002 | Create folder in project | projectId, name, path, isFolder=true | 201 Created, folder object | High |
| FILE-003 | Create nested file | projectId, name, path with parent | File created with parentId set | High |
| FILE-004 | Create file with duplicate path | projectId, existing path | 409 Conflict | Medium |
| FILE-005 | Get file tree | projectId | Nested file structure | High |
| FILE-006 | Get specific file with content | projectId, fileId | 200 OK, file with content | High |
| FILE-007 | Update file content | projectId, fileId, new content | 200 OK, content updated, lastEditedBy set | High |
| FILE-008 | Update file name | projectId, fileId, new name | 200 OK, name and path updated | Medium |
| FILE-009 | Delete file | projectId, fileId | 200 OK, file soft deleted | High |
| FILE-010 | Delete folder with children | projectId, folderId | Folder and children soft deleted | High |
| FILE-011 | Non-member cannot access files | projectId (non-member) | 403 Forbidden | High |

### 4.2 File Initialization Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| FILE-101 | Initialize demo files | projectId | Demo file structure created | Medium |
| FILE-102 | Initialize creates package.json | projectId | package.json with dependencies | Medium |
| FILE-103 | Initialize creates index.html | projectId | index.html with boilerplate | Medium |
| FILE-104 | Initialize creates style.css | projectId | style.css with basic styles | Low |

### 4.3 File Hierarchy Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| FILE-201 | Root level files have no parent | File at root | parentId is null | High |
| FILE-202 | Nested files reference parent | File in folder | parentId points to folder | High |
| FILE-203 | Folder children listed | folderId | Array of child files | Medium |
| FILE-204 | Move file between folders | fileId, new parentId | parentId updated, path updated | Medium |

---

## 5. Kanban Board Tests

### 5.1 Board & Column Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| BOARD-001 | Get or create board for project | projectId | Board object with columns | High |
| BOARD-002 | Board auto-created on first access | projectId (new) | Board created | High |
| BOARD-003 | Create column | projectId, name | 201 Created, column object | High |
| BOARD-004 | Create column sets position | projectId, name | Position auto-incremented | Medium |
| BOARD-005 | Update column name | columnId, new name | 200 OK, name updated | Medium |
| BOARD-006 | Delete column | columnId | Column deleted | Medium |
| BOARD-007 | Delete column cascades tasks | columnId with tasks | Tasks deleted | High |
| BOARD-008 | List columns ordered by position | boardId | Columns sorted by position | Medium |

### 5.2 Task CRUD Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| TASK-001 | Create task | projectId, columnId, title | 201 Created, task object, status=TODO | High |
| TASK-002 | Create task with all fields | projectId, columnId, title, description, assigneeId, dueDate, priority | Task with all fields set | High |
| TASK-003 | Create task without title | projectId, columnId | 400 Bad Request | Medium |
| TASK-004 | Get task by ID | taskId | 200 OK, task object | High |
| TASK-005 | Update task title | taskId, new title | 200 OK, title updated | High |
| TASK-006 | Update task description | taskId, new description | 200 OK, description updated | High |
| TASK-007 | Update task assignee | taskId, assigneeId | 200 OK, assignee updated | High |
| TASK-008 | Assign task to non-member | taskId, non-member userId | 400 Bad Request | Medium |
| TASK-009 | Update task due date | taskId, new dueDate | 200 OK, dueDate updated | Medium |
| TASK-010 | Update task priority | taskId, new priority | 200 OK, priority updated | Medium |
| TASK-011 | Update task status | taskId, new status | 200 OK, status updated | High |
| TASK-012 | Delete task | taskId | 200 OK, task soft deleted | High |
| TASK-013 | Non-member cannot create task | projectId (non-member) | 403 Forbidden | High |

### 5.3 Task Movement Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| TASK-101 | Move task to another column | taskId, new columnId, position | Task moved, position updated | High |
| TASK-102 | Move task updates status | taskId, column (Done) | Status changed to DONE | Medium |
| TASK-103 | Move task to invalid column | taskId, non-existent columnId | 404 Not Found | Medium |
| TASK-104 | Reorder tasks within column | taskId, new position | Position updated | Medium |

### 5.4 Real-Time Board Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| TASK-201 | Task created broadcasts to project | Create task | All connected clients receive task:created | High |
| TASK-202 | Task updated broadcasts to project | Update task | All connected clients receive task:updated | High |
| TASK-203 | Task deleted broadcasts to project | Delete task | All connected clients receive task:deleted | High |
| TASK-204 | Column created broadcasts to project | Create column | All connected clients receive column:created | Medium |

---

## 6. Chat & Messaging Tests

### 6.1 Conversation Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CHAT-001 | Create direct conversation | userId1, userId2 | 201 Created, conversation with 2 participants | High |
| CHAT-002 | Get existing direct conversation | userId1, userId2 (existing) | Returns existing conversation | High |
| CHAT-003 | Create project conversation | projectId | 201 Created, project conversation | High |
| CHAT-004 | Create group conversation | name, userIds[] | 201 Created, group conversation | Medium |
| CHAT-005 | List user's conversations | User request | Array of conversations | High |
| CHAT-006 | Get conversation details | conversationId | 200 OK, conversation with participants | High |
| CHAT-007 | Non-participant cannot access conversation | conversationId (non-participant) | 403 Forbidden | High |

### 6.2 Message Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CHAT-101 | Send message | conversationId, content | 201 Created, message object | High |
| CHAT-102 | Send message with attachments | conversationId, content, attachments[] | Message with attachments saved | Medium |
| CHAT-103 | Send message to non-member conversation | conversationId (non-member) | 403 Forbidden | High |
| CHAT-104 | Get messages (paginated) | conversationId, limit, before | Array of messages, pagination meta | High |
| CHAT-105 | Messages ordered by createdAt | conversationId | Messages in chronological order | High |
| CHAT-106 | Update message | messageId, new content | 200 OK, content updated, isEdited=true, editedAt set | High |
| CHAT-107 | Update own message only | messageId (own) | 200 OK, message updated | High |
| CHAT-108 | Cannot update others' messages | messageId (other user's) | 403 Forbidden | High |
| CHAT-109 | Delete message | messageId | 200 OK, message soft deleted | High |
| CHAT-110 | Cannot delete others' messages | messageId (other user's) | 403 Forbidden | High |

### 6.3 Read Status Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CHAT-201 | Mark conversation as read | conversationId | lastReadAt updated for participant | High |
| CHAT-202 | Get unread message count | User request | Count of unread messages | Medium |
| CHAT-203 | Unread count per conversation | User request | Array of {conversationId, unreadCount} | Medium |

### 6.4 Reply/Thread Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CHAT-301 | Reply to message | conversationId, content, replyToId | Message created with replyToId | Medium |
| CHAT-302 | Get message with replies | messageId | Message with replies array | Medium |
| CHAT-303 | Reply to non-existent message | conversationId, invalid replyToId | 404 Not Found | Low |

### 6.5 Real-Time Chat Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CHAT-401 | Message sent broadcasts to conversation | Send message | All participants receive message:new | High |
| CHAT-402 | Typing indicator broadcasts | User typing | Other participants receive user:typing | Medium |
| CHAT-403 | Typing indicator stops broadcasting | User stops | Other participants receive user:stopped_typing | Medium |
| CHAT-404 | Read status broadcasts | Mark as read | Other participants receive conversation:read | Low |

---

## 7. Website Builder Tests

### 7.1 Page CRUD Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| BUILD-001 | Create page | projectId, name, slug | 201 Created, page object with empty content | High |
| BUILD-002 | Create page with duplicate slug | projectId, existing slug | 409 Conflict | Medium |
| BUILD-003 | List pages | projectId | Array of pages ordered by position | High |
| BUILD-004 | Get page with content | projectId, pageId | 200 OK, page with Puck JSON content | High |
| BUILD-005 | Update page content | projectId, pageId, new content | 200 OK, content updated | High |
| BUILD-006 | Update page name | projectId, pageId, new name | 200 OK, name updated | Medium |
| BUILD-007 | Update page slug | projectId, pageId, new slug | 200 OK, slug updated | Medium |
| BUILD-008 | Delete page | projectId, pageId | 200 OK, page soft deleted | High |
| BUILD-009 | Non-member cannot access pages | projectId (non-member) | 403 Forbidden | High |

### 7.2 Page Management Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| BUILD-101 | Reorder pages | projectId, pageIds[] | Pages reordered by position | Medium |
| BUILD-102 | Duplicate page | projectId, pageId | New page created with copied content | Medium |
| BUILD-103 | Publish page | projectId, pageId, isPublished=true | Page published | Medium |
| BUILD-104 | Unpublish page | projectId, pageId, isPublished=false | Page unpublished | Low |

### 7.3 Code Generation Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| BUILD-201 | Generate code from page | projectId, pageId | ProjectFile created with React code | High |
| BUILD-202 | Generated code is valid React | projectId, pageId | No syntax errors, imports correct | High |
| BUILD-203 | Generate code creates/updates file | projectId, pageId (existing file) | generatedFileId updated | High |
| BUILD-204 | Generate preview HTML | projectId, pageId | 200 OK, HTML string | Medium |
| BUILD-205 | Code includes all components | Page with Hero, Button, Text | All components in generated code | High |
| BUILD-206 | Code preserves props | Components with custom props | Props passed correctly | High |
| BUILD-207 | Code handles nested components | Section > Card > Button | Nesting preserved | Medium |

### 7.4 Component Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| BUILD-301 | Hero component renders | Add Hero to page | Hero in content JSON | Medium |
| BUILD-302 | Button component with action | Add Button with onClick | Button with action in JSON | Medium |
| BUILD-303 | Text component with content | Add Text with "Hello" | Text component with content | Medium |
| BUILD-304 | Image component with URL | Add Image with src | Image with src in JSON | Medium |
| BUILD-305 | Grid layout with columns | Add Grid with 3 columns | Grid with children array | Medium |
| BUILD-306 | Section container styling | Add Section with padding | Section with style props | Low |

### 7.5 Real-Time Builder Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| BUILD-401 | Page created broadcasts to project | Create page | All connected clients receive page:created | High |
| BUILD-402 | Page updated broadcasts to project | Update page | All connected clients receive page:updated | High |
| BUILD-403 | Page deleted broadcasts to project | Delete page | All connected clients receive page:deleted | High |
| BUILD-404 | Builder cursor broadcasts | Select component | Other users see selected component highlight | Medium |

---

## 8. Video/Voice Call Tests

### 8.1 Call Initiation Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CALL-001 | Initiate 1:1 video call | conversationId, type=VIDEO | Call created (RINGING), target user notified | High |
| CALL-002 | Initiate project group call | projectId, type=VIDEO | Call created, all project members notified | High |
| CALL-003 | Initiate voice call | conversationId, type=VOICE | Call created with type=VOICE | Medium |
| CALL-004 | Call creates CallParticipant for initiator | Initiate call | CallParticipant record created | High |
| CALL-005 | Non-member cannot initiate project call | projectId (non-member) | 403 Forbidden | High |

### 8.2 Call Acceptance/Join Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CALL-101 | Accept incoming call | callId | CallParticipant created, joinedAt set | High |
| CALL-102 | First join changes status to ONGOING | callId (first join) | Call status → ONGOING | High |
| CALL-103 | Multiple participants can join | callId, multiple users | All added as CallParticipants | High |
| CALL-104 | Join call broadcasts to participants | callId | All participants receive call:user-joined | High |

### 8.3 Call Decline/Leave Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CALL-201 | Decline incoming call | callId | Call status → DECLINED (if 1:1) | High |
| CALL-202 | Leave call | callId | leftAt timestamp set | High |
| CALL-203 | Last participant leaving ends call | callId, last user leaves | Call status → ENDED, endedAt set | High |
| CALL-204 | Leave call broadcasts to participants | callId | Other participants receive call:user-left | High |

### 8.4 Media State Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CALL-301 | Mute audio | callId, isMuted=true | CallParticipant.isMuted updated | High |
| CALL-302 | Unmute audio | callId, isMuted=false | CallParticipant.isMuted updated | High |
| CALL-303 | Turn off video | callId, isVideoOff=true | CallParticipant.isVideoOff updated | High |
| CALL-304 | Turn on video | callId, isVideoOff=false | CallParticipant.isVideoOff updated | High |
| CALL-305 | Start screen sharing | callId, isScreenSharing=true | CallParticipant.isScreenSharing updated | Medium |
| CALL-306 | Stop screen sharing | callId, isScreenSharing=false | CallParticipant.isScreenSharing updated | Medium |
| CALL-307 | Media state broadcasts to participants | Toggle media | Other participants receive call:media-changed | High |

### 8.5 WebRTC Signaling Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CALL-401 | Send offer | callId, targetPeerId, offer SDP | Offer forwarded to target peer | High |
| CALL-402 | Send answer | callId, targetPeerId, answer SDP | Answer forwarded to target peer | High |
| CALL-403 | Send ICE candidate | callId, targetPeerId, candidate | Candidate forwarded to target peer | High |
| CALL-404 | WebRTC connection established | Complete handshake | Peer-to-peer media flowing | High |

### 8.6 Call History Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| CALL-501 | Get user's call history | User request | Array of past calls | Low |
| CALL-502 | Call has startedAt timestamp | Completed call | startedAt populated | Medium |
| CALL-503 | Call has endedAt timestamp | Completed call | endedAt populated | Medium |
| CALL-504 | Missed call status | Unanswered call | Status = MISSED | Medium |

---

## 9. WebSocket Real-Time Tests

### 9.1 Connection Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| WS-001 | Connect with valid session | Auth token | Connection established | High |
| WS-002 | Connect without auth | No token | Connection rejected | High |
| WS-003 | Connect with invalid token | Invalid token | Connection rejected | High |
| WS-004 | Disconnect cleans up user state | Disconnect | User removed from online list | High |

### 9.2 Project Presence Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| WS-101 | Join project room | projectId | User added to project room | High |
| WS-102 | Leave project room | projectId | User removed from project room | High |
| WS-103 | Get online users in project | projectId | Array of online users | High |
| WS-104 | Presence update broadcasts | User joins | All users receive presence:update | High |

### 9.3 File Collaboration Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| WS-201 | Join file room | projectId, fileId | User added to file room | High |
| WS-202 | Leave file room | projectId, fileId | User removed from file room | High |
| WS-203 | File edit broadcasts | projectId, fileId, changes | Other users receive file:edit | High |
| WS-204 | Cursor position broadcasts | projectId, fileId, cursor | Other users receive file:cursor | High |

### 9.4 Builder Collaboration Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| WS-301 | Join builder room | projectId, pageId | User added to builder room | Medium |
| WS-302 | Leave builder room | projectId, pageId | User removed from builder room | Medium |
| WS-303 | Component selection broadcasts | projectId, pageId, componentId | Other users see selection | Medium |
| WS-304 | Page content update broadcasts | projectId, pageId, content | Other users receive page:updated | High |

### 9.5 Broadcast Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| WS-401 | Broadcast to project room | projectId, event, data | All project members receive event | High |
| WS-402 | Broadcast to conversation room | conversationId, event, data | All participants receive event | High |
| WS-403 | Broadcast excludes sender | User emits event | Sender doesn't receive own event | Medium |
| WS-404 | Offline users don't receive broadcasts | User offline | No event received | High |

---

## 10. Code Editor Collaboration Tests

### 10.1 Yjs Synchronization Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| YJS-001 | Connect to Yjs server | projectId, fileId | Yjs WebSocket connected | High |
| YJS-002 | Receive initial file state | Connect to file | Y.Doc populated with content | High |
| YJS-003 | Send edit to Yjs server | Text change | Update broadcasted to all clients | High |
| YJS-004 | Concurrent edits merge | 2 users edit same line | CRDT resolves conflict | High |
| YJS-005 | Disconnect preserves state | Disconnect and reconnect | State syncs correctly | High |

### 10.2 Cursor Awareness Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| YJS-101 | Cursor position shared | Move cursor | Other users see cursor position | High |
| YJS-102 | Selection range shared | Select text | Other users see selection highlight | Medium |
| YJS-103 | Cursor shows username | Hover cursor | Username displayed | Medium |
| YJS-104 | Multiple cursors displayed | 3 users in file | All 3 cursors visible | High |

### 10.3 Monaco Editor Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| ED-001 | Syntax highlighting works | TypeScript file | Keywords highlighted | High |
| ED-002 | Autocomplete works | Trigger autocomplete | Suggestions shown | Medium |
| ED-003 | Find/replace works | Search term | Matches highlighted, replaceable | Medium |
| ED-004 | Line numbers displayed | Open file | Line numbers visible | Low |
| ED-005 | Minimap displayed | Open large file | Minimap shown | Low |
| ED-006 | Multiple languages supported | Open JS, HTML, CSS | Correct syntax highlighting | High |

---

## 11. File Upload Tests

### 11.1 Single File Upload Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| UPLOAD-001 | Upload single image | Image file | 200 OK, S3 URL returned | High |
| UPLOAD-002 | Upload single document | PDF file | 200 OK, S3 URL returned | Medium |
| UPLOAD-003 | Upload file too large | File > 10MB | 400 Bad Request | Medium |
| UPLOAD-004 | Upload invalid MIME type | Executable file | 400 Bad Request | Medium |
| UPLOAD-005 | File metadata saved | Upload file | File record in DB | High |

### 11.2 Multiple File Upload Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| UPLOAD-101 | Upload multiple images | 3 image files | 200 OK, 3 S3 URLs | Medium |
| UPLOAD-102 | Upload mixed file types | Image + PDF | Both uploaded | Medium |
| UPLOAD-103 | One file fails in batch | Valid + oversized | Partial success, error for oversized | Low |

### 11.3 S3 Integration Tests
| ID | Test Case | Input | Expected Output | Priority |
|----|-----------|-------|-----------------|----------|
| UPLOAD-201 | File uploaded to S3 | Upload file | File exists in S3 bucket | High |
| UPLOAD-202 | S3 URL is publicly accessible | Upload image | Image accessible via URL | Medium |
| UPLOAD-203 | File stored with unique name | Upload file | Filename includes UUID | Low |

---

## 12. Integration Tests

### 12.1 Complete User Workflows
| ID | Test Case | Flow | Priority |
|----|-----------|------|----------|
| INT-001 | Register → Create Project → Invite Member → Create Task → Chat | Full onboarding flow | High |
| INT-002 | Login → Join Project → Edit File → Save → View in Browser | Code editing workflow | High |
| INT-003 | Create Page → Add Components → Generate Code → Deploy | Builder workflow | High |
| INT-004 | Start Call → Multiple Join → Screen Share → Leave | Video call workflow | High |

### 12.2 Cross-Feature Tests
| ID | Test Case | Features | Priority |
|----|-----------|----------|----------|
| INT-101 | File edit triggers file tree update | Editor + File Tree | High |
| INT-102 | Task assignment sends notification via chat | Kanban + Chat | Medium |
| INT-103 | Page generation creates file in editor | Builder + Files | High |
| INT-104 | Real-time collaboration with 5 users | All features | High |

### 12.3 Data Consistency Tests
| ID | Test Case | Scenario | Priority |
|----|-----------|----------|----------|
| INT-201 | Project deletion cascades to all related data | Delete project | High |
| INT-202 | User deletion removes from all projects | Delete user | High |
| INT-203 | Concurrent file edits resolve correctly | 2 users edit | High |
| INT-204 | WebSocket reconnect syncs missed events | Disconnect and reconnect | Medium |

---

## 13. Performance Tests

### 13.1 Load Tests
| ID | Test Case | Load | Expected Performance | Priority |
|----|-----------|------|---------------------|----------|
| PERF-001 | 100 concurrent users editing files | 100 users | < 200ms response time | High |
| PERF-002 | 1000 messages in chat | 1000 messages | < 100ms to load page | Medium |
| PERF-003 | Large file tree (1000+ files) | 1000 files | < 500ms to render | Medium |
| PERF-004 | Builder page with 50+ components | 50 components | < 1s to render | Medium |

### 13.2 WebSocket Performance Tests
| ID | Test Case | Load | Expected Performance | Priority |
|----|-----------|------|---------------------|----------|
| PERF-101 | 50 users in same project room | 50 concurrent connections | All receive broadcasts | High |
| PERF-102 | 10 users editing same file | 10 users, Yjs sync | < 50ms sync latency | High |
| PERF-103 | 5 simultaneous video calls | 5 calls, 3 users each | WebRTC stable | Medium |

### 13.3 Database Performance Tests
| ID | Test Case | Load | Expected Performance | Priority |
|----|-----------|------|---------------------|----------|
| PERF-201 | Query 10,000 tasks | Large dataset | < 200ms with pagination | Medium |
| PERF-202 | Full-text search on messages | 100,000 messages | < 500ms | Low |

---

## 14. Security Tests

### 14.1 Authentication Security Tests
| ID | Test Case | Attack Vector | Expected Behavior | Priority |
|----|-----------|---------------|-------------------|----------|
| SEC-001 | SQL injection in login | Email: `'; DROP TABLE users--` | Input sanitized, no DB change | High |
| SEC-002 | Brute force login attempts | 100 failed logins | Rate limiting applied | High |
| SEC-003 | Password stored securely | Register user | Password hashed (bcrypt/argon2) | High |
| SEC-004 | Session fixation | Reuse old session token | Old token invalidated | Medium |

### 14.2 Authorization Security Tests
| ID | Test Case | Attack Vector | Expected Behavior | Priority |
|----|-----------|---------------|-------------------|----------|
| SEC-101 | Access project without membership | Direct API call | 403 Forbidden | High |
| SEC-102 | Escalate role from MEMBER to OWNER | Tamper request | 403 Forbidden | High |
| SEC-103 | Delete other user's files | Direct API call | 403 Forbidden | High |
| SEC-104 | Read other user's messages | Direct API call | 403 Forbidden | High |

### 14.3 XSS/CSRF Tests
| ID | Test Case | Attack Vector | Expected Behavior | Priority |
|----|-----------|---------------|-------------------|----------|
| SEC-201 | XSS in chat message | `<script>alert('XSS')</script>` | Script escaped/sanitized | High |
| SEC-202 | XSS in task description | Malicious HTML | HTML sanitized | High |
| SEC-203 | CSRF on critical actions | Forged request | CSRF token required | Medium |

### 14.4 Data Exposure Tests
| ID | Test Case | Attack Vector | Expected Behavior | Priority |
|----|-----------|---------------|-------------------|----------|
| SEC-301 | Password in user response | GET /user/:id | Password field excluded | High |
| SEC-302 | Session token in logs | Check logs | Tokens not logged | High |
| SEC-303 | Private project visible to non-members | List all projects | Only user's projects shown | High |

---

## 15. Edge Case Tests

### 15.1 Boundary Tests
| ID | Test Case | Input | Expected Behavior | Priority |
|----|-----------|-------|-------------------|----------|
| EDGE-001 | File name with 255 characters | 255-char filename | Accepted | Low |
| EDGE-002 | File name with 256 characters | 256-char filename | 400 Bad Request | Low |
| EDGE-003 | Empty file content | File with empty string | Accepted | Medium |
| EDGE-004 | Chat message with 10,000 characters | Very long message | Accepted or truncated | Low |

### 15.2 Race Condition Tests
| ID | Test Case | Scenario | Expected Behavior | Priority |
|----|-----------|----------|-------------------|----------|
| EDGE-101 | Two users create file with same name | Concurrent POST | Second request gets 409 Conflict | High |
| EDGE-102 | Two users delete same task | Concurrent DELETE | Both succeed (idempotent) | Medium |
| EDGE-103 | User deleted while in active call | Delete user during call | Call continues, participant removed | Low |

### 15.3 Network Failure Tests
| ID | Test Case | Scenario | Expected Behavior | Priority |
|----|-----------|----------|-------------------|----------|
| EDGE-201 | WebSocket disconnect during file edit | Disconnect | Reconnect syncs changes | High |
| EDGE-202 | HTTP request timeout | Network delay | Request retries or fails gracefully | Medium |
| EDGE-203 | Upload interrupted mid-transfer | Network drop | Upload fails, no partial file | Low |

### 15.4 Concurrency Tests
| ID | Test Case | Scenario | Expected Behavior | Priority |
|----|-----------|----------|-------------------|----------|
| EDGE-301 | 10 users edit same line of code | Concurrent Yjs edits | CRDT resolves correctly | High |
| EDGE-302 | 5 users move same task | Concurrent task moves | Last write wins, consistent state | Medium |
| EDGE-303 | User leaves project while editing file | Leave during edit | Edit saved, access revoked | Medium |

---

## Test Execution Strategy

### Priority Levels
- **High**: Core functionality, security-critical, data integrity
- **Medium**: Important features, user experience, performance
- **Low**: Edge cases, cosmetic issues, rare scenarios

### Test Phases
1. **Unit Tests**: Individual functions and methods (automated)
2. **Integration Tests**: Feature interactions (automated + manual)
3. **End-to-End Tests**: Complete user workflows (Playwright/Cypress)
4. **Performance Tests**: Load and stress testing (k6, JMeter)
5. **Security Tests**: Penetration testing, vulnerability scanning
6. **User Acceptance Tests**: Real user feedback

### Coverage Goals
- Unit Test Coverage: > 80%
- Integration Test Coverage: > 70%
- Critical Path Coverage: 100%
- API Endpoint Coverage: 100%
- WebSocket Event Coverage: 100%

### Test Automation
- **Backend**: Jest + Supertest for API tests
- **Frontend**: Jest + React Testing Library for component tests
- **E2E**: Playwright for full user workflows
- **WebSocket**: Socket.io-client for real-time tests
- **Performance**: k6 or Artillery for load testing

---

## Total Test Cases Summary

| Category | Test Count |
|----------|-----------|
| Authentication & Authorization | 29 |
| User Management | 12 |
| Project Management | 18 |
| File Management | 18 |
| Kanban Board | 31 |
| Chat & Messaging | 29 |
| Website Builder | 27 |
| Video/Voice Calls | 26 |
| WebSocket Real-Time | 25 |
| Code Editor Collaboration | 13 |
| File Upload | 8 |
| Integration Tests | 7 |
| Performance Tests | 7 |
| Security Tests | 15 |
| Edge Cases | 14 |
| **TOTAL** | **279** |

---

**Document Version**: 1.0
**Last Updated**: December 5, 2025
**Maintainer**: Development Team
