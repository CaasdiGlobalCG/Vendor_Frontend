# B2B Test — Full End-to-End Manual Verification Guide

Covers the entire pipeline from scratch: multi-item RFQ → multi-vendor
sourcing → merged quotation → commission → client PO + payment → vendor
accept → partial dispatch → GRN → 3-way match → logistics → client confirm →
returns. Requires all backends and frontends running.

## 0. Start everything

| App | Dir | Typical port |
|-----|-----|--------------|
| Employee backend | `Employee_Main/backend` | 5000/5002 |
| Auditor frontend | `Employee_Main/auditor` | 5173/5174 |
| Sales backend (vendor) | `Sales-Backend` | 5003 |
| Sales frontend (vendor) | `Sales-Frontend` | — |
| Client backend | `Client_backend` | 5004 |
| Client frontend | `Client_Frontend` | 5175 |
| B2B backend | `B2B-Backend` | 5001 |

New env var (optional, defaults to 50000): `EWAY_BILL_THRESHOLD`
New tables (already created): `b2b_audit_log`, `b2b_grn`, `b2b_dispatch_requests`, `b2b_payment_receipts`

For a clean run, test with an RFQ of **2+ line items assigned to 2 different
vendors** — that exercises line-level awards, per-line vendor responses,
multiple POs, and partial dispatch all at once.

---

## 1. Client creates a multi-item RFQ

Client portal → RFQ Builder (7 steps):

- [ ] Step 1 Basic info → Step 2 add **at least 2 line items** with specs →
      Steps 3–7 (details, budget, vendor prefs, attachments, timeline) → submit.
- [ ] RFQ lands in procurement with all line items intact.

## 2. Procurement assigns vendors per line

Auditor app → Procurement dashboard → **RFQ Management** → open the enquiry:

- [ ] Assign line 1 + 2 to Vendor A, line 3 (or both to different vendors).
- [ ] Same RFQ can fan out to multiple vendors — each vendor only sees their
      assigned lines.
- [ ] Audit: RFQ dispatch entries (team `procurement`).

## 3. Vendors respond with quotations

Vendor app → **Enquiries** tab → open the RFQ → send quotation for assigned
lines (price, qty offered, delivery date).

- [ ] Vendor A quotes their lines, Vendor B quotes theirs.
- [ ] Both quotations link back to the same parent RFQ + their specific lines.
- [ ] Auditor sees them under the enquiry's vendor quotations.

## 4. Procurement: compare → award/drop → merge

Auditor → Procurement → **Sourcing Matrix** for the enquiry:

- [ ] Lines shown side-by-side per vendor with quote prices.
- [ ] **Award** a winner per line; **Drop** any line deliberately (e.g.
      out-of-scope) — matrix shows `awarded` / `dropped` summary.
- [ ] Once every line resolved → **Merge awarded quotes into client quotation**
      → one final quotation generated.
- [ ] Audit: award/merge entries.

Re-source test (optional): drop a line → re-source it → award later.

## 5. Finance: commission → send client quotation

Auditor → Finance → B2B Quotations → open the merged quotation:

- [ ] Set commission (% or flat) via the commission dialog → send to client.
- [ ] Audit: commission + send entries (team `finance`).

## 6. Client: approve quotation → PO → advance payment

Client portal → open the quotation:

- [ ] Per-line approve / reject / request-change works; approved → order
      created (status `Order Placed`).
- [ ] Pay **advance** (or per terms — advance_30/advance_50/full/net).
- [ ] **Receipt voucher auto-generated the moment payment records** — check
      email for `RV-YYYYMM-NNNN` PDF attachment; Billing → receipts list →
      **Download** works.
- [ ] Audit: `payment_receipt_issued` (team `client`).

## 7. Procurement dispatches POs to awarded vendors

Auditor → Procurement → Purchase Orders → dispatch vendor PO(s).

- [ ] Each awarded vendor gets their own PO with only their lines.
- [ ] Vendor sees it under **Purchase Orders** tab.

## 8. Vendor accepts the whole PO

Vendor app → **Purchase Orders** → open PO → **Accept PO**.

- [ ] ALL lines flip CONFIRMED at once; `acceptedAt` + `fulfillmentStatus` set.
- [ ] No "Mark Shipped" in the PO modal (dispatch moved to Shipping tab).
- [ ] Per-line "can't fulfil" still possible → line cancelled + reason.
- [ ] Audit: `po_accepted` (team `vendor`).

## 9. Vendor partial dispatch — Shipping tab

Vendor app → **Shipping** tab. Example: line ordered 30, vendor ships 10 + 20.

First dispatch:
- [ ] Ordered 30 / Shipped 0 / Remaining 30 shown.
- [ ] Dispatch qty = 10. Required: transporter, vehicle, contact, LR, ETA.
- [ ] If consignment value > ₹50,000 → E-Way bill no + date required, OR
      "no E-Way" + reason. Below ₹50k the block must NOT appear.
- [ ] Submit → `partially_shipped`, shipped 10 / remaining 20,
      PO → `partially_fulfilled`.

Second dispatch:
- [ ] Dispatch remaining 20 → `dispatches[]` holds both consignments; line →
      `shipped`, PO → `fulfilled`.

Edge cases:
- [ ] qty > remaining → rejected.
- [ ] >₹50k without E-Way details or reason → rejected.
- [ ] Two vendors shipping independently → separate `lineShipments` per line,
      no cross-contamination.

## 10. Procurement: GRN + 3-way match

Auditor → Procurement → **Goods Receipts**:

- [ ] PO appears; vendor invoice PDF linked on the row.
- [ ] Expand → Ordered / Dispatched / consignment history per line.
- [ ] **Record GRN** — received qty (cap = dispatched), accepted qty
      (≤ received), condition, remarks.
- [ ] **Verify GRN** → verified; all dispatched lines verified →
      `procurementCleared` + finance notification.
- [ ] Audit: GRN entries (team `procurement`).

Mismatch test: acceptedQty < receivedQty → `partially_verified`; match shows
`qty_mismatch`.

## 11. Finance: 3-way match + vendor payment gate

Auditor → Finance → Invoices → vendor invoice → **Re-verify**:

- [ ] Before GRN → `awaiting_grn`. Qty mismatch → `qty_mismatch`.
- [ ] After GRN + client delivery → `matched` (3-Way Matched badge).
- [ ] Mark payable WITHOUT match → blocked (409); override requires a stored
      reason (`matchOverrideReason` + audit).

## 12. Procurement → Logistics → Client dispatch

Goods Receipts → cleared line → **Send to Logistics**:
- [ ] `b2b_dispatch_requests` row created (`requested`).

Logistics dashboard → **B2B Dispatch Queue**:
- [ ] **Request challan + tax invoice from finance** → `docs_pending`, finance
      notified.

Finance → **Dispatch Documents**:
- [ ] Upload delivery challan PDF + tax invoice PDF → `docs_ready`.

Logistics Dispatch Queue:
- [ ] Verify docs (PDF links work) → **Dispatch** — transporter/vehicle/
      contact/LR/ETA required; >₹50k needs E-Way no+date or reason.
- [ ] Dispatched → client order → **Out for delivery**, client notified.
- [ ] **Mark delivered** → `delivered`, client prompted to confirm.

## 13. Client: confirm + pay balance

Client portal → My Orders → open order:

- [ ] Out-for-delivery card: transporter, vehicle, LR, ETA, E-Way no.
- [ ] **Delivery Challan** + **Tax Invoice** download links work.
- [ ] PO / quotation / invoice refs shown.
- [ ] **Confirm Received** per line → `Delivered` when all confirmed.
- [ ] Balance/net-terms payment → another receipt voucher + email.
- [ ] Audit: `delivery_confirmed`.

## 14. Returns (per line)

Client My Orders → delivered line → **Return**:

- [ ] Qty capped at delivered-minus-returned; reason category + optional photo
      proof (uploads to S3 via presigned URL).
- [ ] Submit → `b2b_return_requests` row with `lineItemId`.

Logistics → **Client Returns**:

- [ ] Shipment `pending_pickup → in_transit`.
- [ ] **Inspect received goods** → received/accepted qty + condition →
      `inspected`.
- [ ] Raise debit note → vendor; vendor credit note → forward → client wallet.

## 15. Audit trail spot-check

Auditor → **Audit Logs** (procurement/finance/logistics dashboards):

- [ ] Team filter works; entries for every step above.
- [ ] Entity search (PO id, order id, dispatchRequestId, returnId) +
      expandable details.

---

## Quick API cheat-sheet

```
RFQ:      POST  /api/rfqs (client, multi line items)
          POST  /api/procurement/... assign vendors per line
Vendor:   POST  /api/enquiries/purchase-orders/:id/accept
          PUT   /api/enquiries/purchase-orders/:id/shipments  (lineItemId, qty, transporter, eway)
          GET   /api/enquiries/purchase-orders                (lineShipments, fulfillmentStatus)
GRN:      GET   /api/procurement/grn/receipts
          POST  /api/procurement/grn        (purchaseOrderId, lineItemId, receivedQty, acceptedQty, condition, remarks)
          POST  /api/procurement/grn/:grnId/approve
Dispatch: POST  /api/procurement/dispatch-requests          (purchaseOrderId, lines[])
          GET   /api/logistics/b2b/dispatch-requests
          PATCH /api/logistics/b2b/dispatch-requests/:id/request-docs
          POST  /api/finance/dispatch-requests/:id/documents (multipart: challan, taxInvoice)
          PATCH /api/logistics/b2b/dispatch-requests/:id/dispatch
          PATCH /api/logistics/b2b/dispatch-requests/:id/delivered
Match:    POST  /api/b2b-invoices/:invoiceId/verify-match
Client:   PUT   /client-api/orders/:orderId/line-deliveries
          POST  /api/orders/:orderId/return   (lineItemId, qtyToReturn, reasonCategory, proof)
          GET   /api/orders/:orderId/return/upload-url      (fileName, mimeType)
Inspect:  PATCH /api/logistics/b2b/return-requests/:orderId/:returnId/inspect
Receipts: GET   /client-api/payments/b2b/receipts           (auto vouchers merged in)
Audit:    GET   /api/audit-logs?team=procurement&entityId=PO-…&from=…&to=…&q=…
```
