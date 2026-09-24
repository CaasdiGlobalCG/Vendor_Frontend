# Vendor/PM Workspace — Changes Overview

A summary of all changes made to the collaborative workspace, lead-submission workflow, and related backend during this iteration.

---

## 1. BOQ / Quotation Submission Workflow

**Goal:** vendor submits once → PM reviews → approval finalizes; rejection (with reason) reopens uploads.

- Vendor can no longer resubmit BOQ/quotation while a submission is pending PM review.
- PM approval finalizes the submission and unlocks workspace access ("Open Workspace" no longer appears before acceptance).
- PM rejection with a reason reopens the vendor's upload forms; vendor sees the reason and can upload revisions, which lock again until reviewed.
- Fixed `isTurnkeyCAS is not defined` crash.
- Removed duplicate/confusing PM status labels on project cards.

## 2. Invite Vendors (PM)

- `POST /api/workspaces/:workspaceId/invite-vendors` — grants collaborators + permissions, creates lead invitation + notification.
- New `InviteVendorsModal.jsx` — searchable vendor list, multi-select, granular permission checkboxes.
- Wired into WorkspacePage; invited vendors see the lead in their dashboard Projects tab with PM-granted permissions.

## 3. Canvas — Edges & Handles

- `CustomEdge.jsx` — replaced hardcoded horizontal bezier with React Flow `getSmoothStepPath` (orthogonal routing honoring handle sides, rounded corners); labels/comments positioned at the real path midpoint.
- `ElementNode.jsx` — collapsed the doubled 48%/52% handle pairs to a single centered 50% handle per side; handle ids unchanged so saved edges still resolve.
- `CanvasWorkspace.jsx` — `connectionMode={ConnectionMode.Loose}`, new edges created `animated: false`, `elevateEdgesOnSelect`.
- Auto-connect on element drop still links old → new element, but the edge now renders as a plain connection (solid gray, arrow, no animation/glow/badge); `isAutoConnected` visual treatment removed from `CustomEdge.jsx`, including for previously saved edges.

## 4. Text Elements — Figma-Style Inspector

- `TextPanel.jsx` — rebuilt as a Figma inspector: Position (X/Y/rotation), Layout (W/H), Appearance (opacity, corner radius), Typography (family, weight, size, line-height, letter-spacing, h/v alignment, B/I/U/S), Fill (text + background with hex), Stroke, Effects (drop shadow).
- `TextNode.jsx` — renders all new properties.
- `CanvasWorkspace.jsx` — `selectTextElement` passes position/dimensions; `updateTextElement` applies node-level position and explicit W/H.

## 5. Node Position Persistence

Fixed elements reverting to their original position after refresh or subtask switching:

- `CanvasWorkspace.jsx` — subtask switch now emits `FLUSH` then **re-fetches** the workspace (`getWorkspaceById`) instead of repopulating from stale `selectedSubtask.canvasData`; race guard, empty-subtask handling, `INIT_SNAPSHOT` re-runs after nodes load, drag-stop flushes the batcher + sends `FLUSH`.
- `canvasSocket.js` — handles `FLUSH` (immediate persistence), tracks touched node ids so stale snapshots can't overwrite untouched DB nodes on flush.

## 6. Real-Time Collaboration (Figma-like)

- Per-tab `clientId` (`crypto.randomUUID()`) — fixes same-account two-tab sessions dropping each other's ops as "self" (the main lag cause).
- Drag positions stream as `ephemeral` ops (~20/sec live movement); only the final position persists.
- `requestFullState` called on connect/reconnect for catch-up sync.

## 7. Element Approvals & Deletion

**Removed:** per-element "Send for Approval" — vendors no longer send each element to PM/client (removed button + `canSendForApproval`/`handleSendForApproval` from `ElementNode.jsx`). PM Approve/Reject remains for already-pending elements.

Deletion flow fixes:

- `nodePersistence.js` — `deletion*` fields added to `requiresDurableWrite` so vendor deletion requests persist durably and reach the PM (previously WS-only, could be dropped).
- `CanvasWorkspace.jsx` — request-deletion now covers **all** node types for vendors; new shared reason modal for non-element nodes; `onNodesChange` strips unapproved `remove` changes (closed the keyboard-delete bypass that broadcast `NODE_DELETE` before approval); deduplicated request dispatch.
- **Clear All + Ctrl+Shift+C** — PM only (was a full approval bypass).
- `persistNodeDeletion` — deletes node + connected edges from the correct subtask canvas, emits `NODE_DELETE`, marks deletion so stale snapshots can't resurrect it.

Vendor flow: delete → reason modal → element flagged "deletion requested" → PM notified → PM approves (deletes durably) or rejects (clears flag).

## 8. Subtask Dependencies

- `TaskSubtasksView.jsx` — "Depends on" dropdown per subtask (set/change/remove) + unlink button on the blocked banner.
- Backend `updateSubtaskInTask` accepts `dependsOnSubtaskIds` — sanitizes self-references, nonexistent ids, and direct A↔B cycles.
- Blocked state updates immediately; completing the dependency clears the block.

## 9. Infrastructure Fixes

- `config/db.js` — MongoDB connection failure is now non-fatal: warns, retries every 10s, no `process.exit(1)` (was killing the whole backend when Atlas rejected the IP).
- `vite.config.js` — ws-proxy socket error logger filters benign close errors (`EPIPE`, `ECONNRESET`, `ECONNABORTED`); real errors still logged.

## 10. Share Progress (PM only)

- Hidden for vendor/client (`onShareProgress` gated; non-PM button removed from `RoleBasedHeader`).
- `ShareProgressModal.jsx` rebuilt — email(s), Docs-style access levels (**View only** / **Can edit** / **Anyone with the link can edit**), optional note, copyable link.
- `POST /api/send-progress-email` — sends per-recipient personalized emails via **AWS SES** (`@aws-sdk/client-ses`, `SES_FROM_EMAIL`), each with an `invite=<email>` link, access level, and note.
- `WorkspacePage.jsx` — invitee opening the link triggers a `share_joined` notification to PMs (session-deduped, params stripped); `permission=view` forces read-only canvas, `edit`/`anyone_edit` grants edit.

## 11. Text Tool — Figma-Style Caption Mode

The dock's Text icon is now a tool toggle, not an options list:

- Click **Text** → cursor becomes an I-beam over the canvas (`text-cursor-mode` class → `.react-flow__pane { cursor: text }`); click again (or **Escape**, or another dock tab) to exit. Handled by `handleSelectDockTabTextAware` in `WorkspacePage.jsx` (added after `userPermissions` is declared — fixes a TDZ crash from an earlier placement).
- Click canvas → a `textNode` with `caption: true` is created and enters edit mode immediately (module-level `markTextNodeForFocus`/`consumeTextNodeFocus` registry — the transient `isEditing` flag is never broadcast).
- Captions render as bare text — no card border/shadow/padding, no connection handles, no star/deadline chrome. Selected captions show a subtle dashed blue outline.
- Click placed text → selects it and opens the `TextPanel` inspector on the left; second click re-enters editing.
- Click away with empty text → caption self-deletes via `deleteElement` with an `allowEmptyCaption` flag that bypasses PM approval (blank captions don't trigger the reason modal).
- `WorkspaceContextPanel.jsx` — the old draggable text-block list replaced with a short tool info card; boxed text blocks still work via drag.

## 12. Live Text Sync to Collaborators

Previously caption text lived in `TextNode` local state until blur — the PM received `NODE_ADD` with empty content and saw an invisible caption.

- `nodePersistence.js` — new `emitLiveTextPatch`: each keystroke patches `node.data.content` locally and emits an **ephemeral** `NODE_UPDATE` (broadcast live, not buffered; blur-time `persistTextContent` still sends the durable op).
- `operationManager.js` — `OperationBatcher` dedupes consecutive `NODE_UPDATE`s per node so fast typing doesn't queue stale patches.
- Focus-hijack fix: `isEditing` is stripped from `NODE_ADD` payloads (`createNodeAddOp`) so remote clients don't mount the caption into edit mode / persist the flag.

## 13. Auto-Connect on All Add Paths

`autoConnectNewNode` previously only ran on the drag-drop path. Now also wired into `handleElementDoubleClick` (generic, turnkey, image-block, task-card) and the `addElementToCanvas` event handler — every add path produces the sequential chain (1→2, 2→3, 3→4) via `lastAddedNodeIdRef`, with handle selection by relative position and duplicate-edge guard. Auto-created edges broadcast (`EDGE_ADD`) and persist like normal edges.

## 14. Actionable Notifications

Clicking a deletion-request notification in the topbar now:

1. Marks it read and closes the dropdown (`WorkspaceTopBar.jsx` → `onNotificationClick`).
2. Navigates to the owning task/subtask — resolved from the notification's `data.taskId`/`subtaskId` (now included in both deletion-request payloads — `CanvasWorkspace.jsx` shared modal and `ElementNode.jsx`), falling back to `findSubtaskContainingNode` (now exported from `nodePersistence.js`) with a fresh `getWorkspaceById` fetch if local data is stale.
3. Selects and centers the node — new `focusCanvasNode` event handled in `CanvasWorkspace` queues via `pendingFocusNodeRef` and retries while the target subtask's canvas loads. For `elementNode` types the pending-deletion banner with Approve/Reject is then visible.

Notifications without a `nodeId` (calls, unlocks, messages) keep read-only behavior.

## 15. Collaborator Lists & Selection Fixes

- **Topbar** (`WorkspaceTopBar.jsx`): avatar stack is now a button opening a collaborators dropdown — avatar, name (+ "You"), email, `accessLevel`, and role pill (PM/Client/CAS/Vendor). Outside-click dismisses.
- **Bottom toolbar** (`WorkspaceMain.jsx`): same dropdown, opens upward (`bottom-full`); `currentUser` prop added for "You" marking.
- Role derivation handles `isPM`/`isClient`/`isCAS` flags (backend marks PMs with `isPM`, not `role`); `roleColors` lookup normalized to lowercase.
- Avatar initials and `.ws-btn-primary` text are white; the `+N` overflow badge stays black.
- **Subtask-selection revert fix** — `refetchWorkspace`, the `approvalCompleted` handler, and `saveWorkspace` all captured `selectedTask`/`selectedSubtask` in stale closures and wrote them back on response. All three now use functional updates (`setSelectedTask(prev => ...)`) so an in-flight request refreshes the *current* selection instead of snapping back to the previous subtask.

## Files Touched

### Frontend

- `pages/WorkspacePage/WorkspacePage.jsx`
- `pages/WorkspacePage/components/CanvasWorkspace.jsx`
- `pages/WorkspacePage/components/nodes/ElementNode.jsx`, `TextNode.jsx`
- `pages/WorkspacePage/components/edges/CustomEdge.jsx`
- `pages/WorkspacePage/components/TextPanel.jsx`, `TaskSubtasksView.jsx`, `InviteVendorsModal.jsx`, `RoleBasedHeader.jsx`, `WorkspaceRightSidebar.jsx`, `ElementsSidebar.jsx`
- `pages/WorkspacePage/components/WorkspaceTopBar.jsx`, `WorkspaceMain.jsx`, `WorkspaceDock.jsx`, `WorkspaceContextPanel.jsx`, `WorkspaceShell.css`
- `pages/WorkspacePage/utils/nodePersistence.js`, `operationManager.js`
- `components/ShareProgressModal.jsx`, `components/ProjectRequestCard/ProjectRequestCard.jsx`
- `pages/LeadDetailPage/LeadDetailPage.jsx`
- `hooks/useCanvasWebSocket.js`
- `vite.config.js`

### Backend

- `websocket/canvasSocket.js`
- `modules/workspace/controllers/dynamoWorkspaceController.js`, `routes/dynamoWorkspaceRoutes.js`
- `modules/vendor/controllers/vendorLeadController.js`
- `routes/sendProgressEmail.js`
- `config/db.js`

## Notes / Remaining Caveats

- SES is in **sandbox mode** — recipients must be verified identities until production access is granted.
- MongoDB Atlas still requires the local IP to be whitelisted for Mongo-dependent features (GoogleUser); workspace APIs are unaffected. The hardcoded URI fallback in `config/db.js` was removed — if `MONGO_URI` is unset, `connectDB()` currently retries `mongoose.connect(undefined)` forever; a follow-up should skip connecting entirely when unset (tracked in the audit plan).
- A full-stack NFR/security audit was drafted at `~/.devin/plans/plan-402f92d3f2d4e3f8.md` — top items: unauthenticated canvas/notification WebSockets, an unauthenticated `/api/workspace/purchase-orders` route shadowing the RBAC-guarded one, unauthenticated S3 presign endpoint, and hardcoded secret fallbacks. Implementation pending.
- Remote canvas ops apply regardless of the viewer's task/subtask scope — an op on subtask 2 briefly renders on a subtask-1 viewer's canvas (persists correctly). Client-side scope filtering is planned.
- Non-element nodes have no Reject-deletion button — PM "approves" by deleting the node directly.
- Shared "view only" links also downgrade a logged-in PM for that session.
- Non-element nodes have no Reject-deletion button — PM "approves" by deleting the node directly.
