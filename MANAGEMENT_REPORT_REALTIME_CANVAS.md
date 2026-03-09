# Management Report: Real-Time Canvas Collaboration Upgrade

**Date:** March 2, 2026  
**Prepared for:** Management / Product Team  
**Status:** Implemented

---

## What Changed

We upgraded our workspace canvas from a **save-and-refresh model** to a **live collaboration model** — similar to how tools like Figma and Google Docs work.

Previously, when a user made changes on the workspace canvas (moving an element, adding a note, editing text), the system would wait 2 seconds, then send the **entire canvas** to our server to be saved. If another user was viewing the same workspace, they wouldn't see any changes until they manually refreshed their page.

Now, changes appear **instantly for everyone** viewing the same workspace. When one user moves a card, the other users see it move on their screen in under a tenth of a second — no refresh needed.

---

## Why This Was Needed

### The Problems with the Old System

1. **No real-time collaboration:** Our product is a collaborative workspace tool, but users couldn't actually see each other's work in real time. A vendor, project manager, and client could all be in the same workspace, but they'd each be looking at a stale version until they refreshed.

2. **Slow and heavy saving:** Every small change (even dragging a card a few pixels) triggered the system to package up the *entire* canvas — every element, every connection, every setting — and send it all to the server. For a workspace with 50+ elements, this was a large amount of data sent repeatedly.

3. **Data conflicts:** If two people edited the same workspace simultaneously, whoever saved last would overwrite the other person's changes. There was no conflict handling — the last save simply won.

4. **High infrastructure cost:** Sending the full canvas every 2 seconds meant our database was being written to ~30 times per minute per active user. This adds up in cloud costs (DynamoDB write capacity charges) and puts unnecessary load on the server.

5. **Poor user experience:** Users had to wait for the "Saving..." indicator to complete before their changes were secure. Any interruption (network hiccup, closing the tab too fast) could lose recent work.

---

## How It Works Now

### The New Model

Instead of sending the entire canvas every 2 seconds, the system now works like this:

1. **Instant local feedback:** When a user makes a change, it appears on their screen immediately — no waiting for the server.

2. **Tiny updates, not full snapshots:** Instead of sending "here's the entire canvas," the system sends a tiny message like "User moved Card #5 to position (200, 300)." This is roughly 1,000x smaller than sending the full canvas.

3. **Live broadcast:** These tiny messages are sent over a persistent live connection (WebSocket) to our server, which immediately relays them to every other user viewing the same workspace.

4. **Smart batching for storage:** The server collects these messages in memory and writes to the database every 5 seconds — far less frequently than before, while still ensuring nothing is lost.

5. **Presence awareness:** Users can now see colored cursors showing where other collaborators are working on the canvas, along with a "Live" indicator showing how many people are currently in the workspace.

6. **Graceful fallback:** If the live connection drops (poor network, etc.), the system automatically falls back to the old save method so no work is lost.

---

## Business Impact

### For Users

| Before | After |
|--------|-------|
| Changes only visible to the person who made them | Everyone sees changes instantly |
| "Is my work saved?" anxiety | Clear "Live" indicator with real-time status |
| Must refresh to see colleague's work | Automatic, seamless updates |
| No awareness of who else is in the workspace | Colored cursors show collaborators |
| Risk of overwriting someone else's changes | Per-element conflict prevention |

### For Operations

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Database writes per minute (per user) | ~30 | ~12 | 60% reduction |
| Data sent per change | 10-100 KB (full canvas) | ~100 bytes (single operation) | ~99% reduction |
| Time for changes to reach other users | Manual refresh | ~0.1 seconds | Real-time |
| Risk of data loss on network interruption | 2-second window | Auto-fallback + batched saves | Significantly lower |

### For Revenue & Product

- **Stronger competitive positioning:** Real-time collaboration is a table-stakes feature for modern workspace tools. We were noticeably behind Figma, Miro, and Notion in this regard.

- **Higher user engagement:** When users can see each other's work live, they spend more time collaborating instead of working in isolation and then syncing up.

- **Client-facing value:** During project review sessions where a PM, vendor, and client are all in the workspace together, changes made by the PM are instantly visible to the client — making review meetings more productive.

- **Reduced support tickets:** Several reported issues around "my changes disappeared" or "I can't see what my colleague added" are addressed by this change.

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| WebSocket connection not available | Automatic fallback to HTTP-based saving |
| Server crash with unsaved data in memory | Graceful shutdown handler flushes all buffers to database |
| Multiple users making conflicting changes | Per-element operation model prevents full-canvas overwrites |
| Increased server memory usage for active rooms | Rooms are cleaned up automatically when all users leave |
| Existing functionality broken | All existing HTTP save endpoints remain fully functional; WebSocket is additive |

---

## What's Next (Optional Enhancements)

1. **Operational Transform / CRDT:** For even more robust conflict resolution on simultaneous edits to the same element (currently, last-write-wins per element, which is sufficient for our use case).

2. **Offline mode:** Queue operations locally when offline and replay them when reconnecting.

3. **Audit trail:** Since all changes are now individual operations with user attribution, we can build a detailed change history ("User X moved this at 3:42 PM, User Y edited the text at 3:43 PM").

4. **Performance monitoring dashboard:** Track WebSocket connection health, room sizes, and flush latency for operational visibility.

---

*This change requires no database migration, no infrastructure changes, and no action from end users. It activates automatically on deployment.*
