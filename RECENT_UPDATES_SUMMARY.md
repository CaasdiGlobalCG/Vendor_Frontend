# Recent Platform Updates — Summary

**Prepared:** September 2026
**Audience:** Management & internal reference
**Scope:** Vendor platform, Client portal, PM/Employee portal, B2B, Sales

---

## 1. Workspace Experience (UI Revamp)

The project workspace has been significantly redesigned to feel more modern and to make day-to-day work faster for vendors, PMs, and clients collaborating on the same project.

- **Redesigned canvas:** the workspace canvas now uses a cleaner, modern layout with a dockable side panel. Elements are organized into clear categories — Invoices & Quotes, Forms, Tables, Charts, Flowcharts, Task Cards, Materials & BOQ, Cost Calculators, and Smart Elements — and users can drag any of them onto the canvas.
- **New quick-add blocks:** info cards, tables, images, dividers, and text inputs can be added directly onto the canvas for documenting project details in place.
- **New element types:** logistics blocks, a construction cost calculator, a BOQ (Bill of Quantities) generator, task cards, materials requests, and smart elements (AI note, calendar event, approval board, AI helper).
- **Turnkey element:** the Turnkey workflow element appears in the elements list only when a Turnkey CAS member has been invited to the workspace by the PM. Once invited, it is visible to everyone on the project — the CAS member, vendor, PM, and client. If no turnkey member is part of the project, the element stays hidden, keeping the canvas uncluttered.
- **Canvas element fixes (new):**
  - Dragging an existing quotation onto the canvas now **carries its real data** — the quotation number, customer name, totals, and current status — instead of opening as a blank card asking to be set up again.
  - The Edit, Save, and Send for Approval buttons on document cards (quotation, invoice, purchase order, credit note, smart note, info card, form card) **now work as intended**. Previously these buttons performed no action at all, and any card interaction would have been lost the moment the canvas was saved and reloaded. Deleting a card now also removes its connecting lines so the canvas doesn't show dangling arrows.
  - **Known follow-ups:** invoice, purchase order, and credit note cards dragged from the panel still need the same real-data binding that quotations now have (they still open blank); and "Send for Approval" on a card currently only updates the card itself — connecting it to the actual approval workflow is pending confirmation.
- **Element deletion bug fix:** deleting the last element on the canvas used to bring back previously deleted elements. Deletions now stick permanently and sync correctly for all collaborators in real time.
- **Workspace ↔ dashboard navigation fixed**, and PM/CAS members can now be invited into workspaces directly.
- **Canvas persistence verified:** every element a user drags onto the canvas is saved to the backend and restored on reload, and changes sync live to other users viewing the same workspace.

## 2. Progress Updates & Approvals (Client ↔ PM ↔ Vendor)

- Vendors can submit progress updates from inside the workspace; PMs and clients can review and accept them from their respective views.
- Dedicated actions were added to the workspace top bar — "Update Progress" (vendor), "Review Progress" (PM), and a client-side progress review view.
- Fixed issues where progress submissions and acceptances were not reflecting correctly between the client and PM views, so both sides now see the same state.

## 3. Authentication & Access Control

- Migrated authentication to **AWS Cognito** with code-based (OTP) verification for sign-in — a more secure and reliable login experience.
- Fixed signup and login issues across vendor and client accounts, including organization ID handling (vendor org ID, client org ID / parent org).
- Rolled out **role-based access control (RBAC)** across the vendor, client, sales, and PM/employee sides — users now only see and do what their role permits, with session-level permission refresh when access changes.
- KYC submission flow updates and an auditor re-submit flow were added.

## 4. Finance & Quotations

- **Finance Overview:** added a finance overview widget in the employee portal with supporting backend endpoints, giving the finance team a quick snapshot of outstanding work.
- **Quotation drafts auto-save:** quotation forms now auto-save as drafts every few seconds, so work isn't lost if the page is closed. Quote and reference numbers are only consumed when a quotation is actually saved — no more wasted or skipped numbers.
- **Merge quotations (B2B/finance):** finance can merge multiple quotations into one master quotation. Workspace quotations can only be merged when billing and shipping addresses match; B2B quotations can only be merged for the same client; workspace and B2B quotations can never be mixed. All line items from the source quotations are consolidated, finance verifies or adds commission on the master quotation, and a preview is available before it is sent. Merged workspace quotations go to the PM as a single quotation; merged B2B quotations go directly to the client. Original quotations remain active and untouched.
- **Line items for finance:** finance staff can review quotation line items and add or adjust commission item-by-item via a dedicated finance quotations module in the employee portal.

### Purchase Order Flow — Reworked and Controlled End-to-End

The PO journey has been redesigned around automatic verification, so nothing moves forward on trust alone:

- **Simplified PM flow:** PM uploads the client's PO → the system **auto-checks** it against the quotation that was sent (items, quantities, rates, GST, totals) and flags pass/fail/warning per check → the vendor simply **accepts or rejects** the PO. The old multi-step approval chain was removed, cutting down manual steps and status confusion.

- **Client PO auto-check at upload (new):**
  - When a client uploads their own PO, it is **checked automatically against the quotation** in the background. The old "did you make changes?" question is gone — the system verifies item codes, descriptions, quantities, rates, amounts, GST, and grand total on its own.
  - **Exact match** → the client is shown "no changes detected" and simply confirms the upload; the PO is accepted and proceeds.
  - **Any difference** → the client is shown exactly what changed (e.g., quantity 12 vs quoted 10), must provide a reason, and the PO is **held**. A held PO is not accepted, cannot be downloaded or processed as the accepted PO, and cannot reach the vendor.
  - **Reason approval chain:** the client's reason goes to the **PM first** → the PM sees the client's uploaded PDF, the detected differences, and the reason in their Client POs section, and **forwards it to finance** → **finance approves or rejects** (the pending items are flagged in External Finance → Quotations) → only after finance approval can the client **re-upload** the PO, which is then accepted and flows normally. If finance rejects, the PO stays blocked and the client sees the rejection with remarks.
  - The client portal clearly shows where their reason stands at every step: *under review* → *approved, please re-upload* → or *rejected* with remarks.
  - PMs are blocked from generating or sending a vendor PO while a client reason is still under review — the gate is enforced at the server level, not just hidden in the UI.

- **Vendor invoice vs PO check (new):** when a vendor submits an invoice against a PO, it is automatically compared to the PO that was sent to them — same items, quantities, rates, and amounts. If anything doesn't match, the invoice is **red-flagged** and held for finance review; finance can approve it onward or send it back to the vendor. This closes the loop: quotation → client PO → vendor PO → vendor invoice are all verified against each other.

- **Issues resolved while building this:**
  - The document-reading service required a paid subscription that wasn't available — replaced with a built-in document reader that also handles scanned PDFs, so the auto-check works on the current plan at no extra cost.
  - PO files were being stored in a disabled storage location — moved to the working shared storage used by the rest of the quotation system, so uploads are reliable and the PM's re-check can read the same file.
  - The PM dashboard's Client POs section was silently dropping held POs and system-generated POs — they now appear with the client's file, the detected differences, and the reason card.
  - The finance quotations view wasn't listing POs awaiting reason approval — they now appear with a "PO reason pending" flag and an approve/reject review dialog showing the differences and the client's reason.
  - Generating the vendor PO was failing due to a color-format compatibility issue in the document preview — fixed; PO generation and send-to-vendor work normally now.

- **Client billing:** billing pages updated to show the merged quotation view; fixed payment-proof upload errors (400/503 errors) in B2B quotations.

## 5. AI & Other Improvements

- The AI assistant now streams responses live over WebSocket, with an automatic fallback if the connection fails — faster and more reliable responses.
- Portfolio page and element updates, careers page, and RFQ templates added.
- Procurement messaging module added on the sales side.
- General stability fixes: role/switch issues, tender page responsiveness for vendors, and skeleton loading states on dashboards.

---

### Quick status note

Most items above are committed. A few are **in progress / uncommitted** in the working branches and should be verified before release:

- Turnkey element visibility + canvas deletion fix (Vendor_Frontend)
- PO auto-check + vendor accept/reject flow (Vendor_Backend + Vendor_Frontend + Client portal)
- Finance quotations module & line-item commission (Employee portal)
- AI streaming fallback (Client portal)
- Client PO upload auto-check with reason → PM → finance approval chain (Client portal + Employee portal)
- Vendor invoice↔PO match check with finance red-flag review (Vendor + Employee portals)
- Canvas document cards: real-data binding for quotations, working card actions (Vendor_Frontend) — invoice/PO/credit-note binding still pending
