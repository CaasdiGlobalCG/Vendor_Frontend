---
agent: devin-local
session: vintage-pigment
created: 2026-09-29T05:24:40Z
---
# B2B End-to-End: Payments → Vendor Dispatch → GRN → Logistics → Client → Returns

Flowchart-based plan (plain-text diagrams that survive any MD→PDF export): vendor accepts whole PO then dispatches partially from a Shipping tab (E-Way >₹50k per consignment), procurement GRN + 3-way match gates vendor payment, logistics dispatches to client with finance-issued challan/tax invoice, client confirms per line, returns feed debit/credit notes, and b2b_audit_log powers team audit pages.

## Summary

Extend the working multi-item B2B flow into a full procure-to-deliver pipeline with **partial fulfillment**, **returns + debit/credit notes**, instant client payment receipts, procurement GRN + 3-way match gating vendor payment, logistics-managed client dispatch, and a cross-team audit log.

Confirmed decisions:

- **Receipt voucher** is generated + emailed the moment the payment is recorded (no finance-verification dependency).
- **Vendor flow splits in two**: Purchase Orders tab = accept the whole PO; Shipping tab = dispatch items (qty choice, partial allowed).
- **E-Way rule applies at both dispatch legs** (vendor→Caasdi and logistics→client): consignment value > ₹50,000 ⇒ E-Way bill no. + date required, or an explicit "don't have it" reason; below ₹50k the block never shows.

---

## The end-to-end flow

```text
CLIENT                    VENDOR                        CAASDI (Procurement / Logistics / Finance)
───────────────────────────────────────────────────────────────────────────────────────────────────
Upload PO + place order
        │
        ▼
                      Purchase Orders tab
                      [Accept PO]  → all lines CONFIRMED
                      or decline a line (reason → re-source)
                              │
                              ▼
                      Shipping tab → dispatch qty ≤ remaining
                      transporter / vehicle / contact / LR / ETA
                      E-Way bill if consignment > ₹50k
                      (else record "no e-way" reason)
                              │
                              ▼
                                                  Goods inward → GRN per line
                                                  3-way match: PO ↔ invoice ↔ GRN
                                                  ├─ mismatch → discrepancy / debit note
                                                  └─ matched → procurementCleared
                              │                            │
                              │                            ├─► notify Finance → pay vendor
                              │                            ▼
                                                  Procurement sends lines to Logistics
                                                  Logistics requests docs
                                                  └─► Finance uploads delivery challan
                                                      + tax invoice → docs_ready
                                                  Logistics verifies → dispatches
                                                  (transporter + E-Way if > ₹50k)
                                                  delivers → marks delivered
                              │
                              ▼
Client confirms each line received
(3-way view: PO ↔ dispatched ↔ delivered)
        │
        ├─ all good → pay balance / net terms
        │
        └─ damaged / short → raise return (per line + proof)
                                   │
                                   ▼
                       Logistics pickup → Procurement inspects
                                   ├─► debit note → vendor
                                   └─► finance credit note → forwarded to client
```

---

## A — Payment → instant receipt voucher

```text
Client records payment
   │
   ▼
payment record created ──► issueReceipt()
   │                          ├─ RV-YYYYMM-NNNN (counter table)
   │                          ├─ PDF voucher → S3
   │                          ├─ email to client (SES, PDF attached)
   │                          ├─ row in b2b_payment_receipts
   │                          └─ audit log entry
   ▼
Client Billing page → [Download Receipt]
```

- Fires on the payment-record success path for every phase: **advance / balance / full** — no approval gate (per your decision).
- New table **`b2b_payment_receipts`**: `{ receiptId, receiptNumber, quotationId, orderId, clientId, amount, phase, paymentMode, pdfUrl, emailedAt, createdAt }`.
- Client gets `GET /client-api/payments/receipts/:quotationId` (list) + `GET .../receipts/:receiptId/download` (signed URL).

## B — Vendor: accept PO, then dispatch from Shipping tab

```text
Purchase Orders tab                     Shipping tab
────────────────────────                ──────────────────────────────────
PO arrives                              confirmed lines list:
  ├─ [Accept PO]  ────► all pending       ordered / shipped / remaining
  │     lines CONFIRMED                       │
  │     po.acceptedAt set                     ▼
  │                                    [Dispatch qty ≤ remaining]
  └─ per-line "can't fulfil"                │
        → CANCELLED + reason           always required:
        → procurement re-sources            transporter name
                                            vehicle number
                                            person contact
                                            LR / transport receipt
                                            expected date
                                            │
                                            qty × rate > ₹50,000?
                                            ├─ yes → E-Way bill no + date
                                            │        OR required reason
                                            └─ no  → block hidden
                                            │
                                            ▼
                                     dispatches[] appended
                                     shippedQty accumulates
                                            │
                        qty left ─────────► partially_shipped
                        line stays in     PO → partially_fulfilled
                        Shipping tab          │ (dispatch again later)
                        all shipped ────► shipped
                                          PO → fulfilled
```

**Partial fulfilment model** — `lineShipments[lineItemId]` becomes cumulative:

```text
{ orderedQty,
  shippedQty,                          // cumulative
  status,                              // partially_shipped | shipped
  dispatches: [ {
    dispatchId, qty,
    transporterName, vehicleNumber, contactNumber,
    lrNumber, expectedDelivery,
    ewayBillNumber, ewayBillDate,      // OR
    noEwayReason,                      // required if >50k & unavailable
    dispatchedAt
  } ] }
```

Each dispatch is a separate consignment — the ₹50k test runs **per dispatch** (a 30-item line shipped 10+20 can cross the threshold on either leg; correct per GST since E-Way applies per consignment). Old single-record `lineShipments` stays readable (wrapped as one dispatch on read).

## C — Procurement: GRN + 3-way match → vendor payment gate

```text
Vendor shipment arrives at Caasdi
   ▼
Goods Receipts page → record GRN per line
   (receivedQty / acceptedQty / condition / remarks)
   ▼
3-way match per line:  PO qty ↔ vendor invoice qty ↔ GRN acceptedQty
   │
   ├─ mismatch / short / damaged
   │     → flag discrepancy (debit note option)
   │     → open qty remains receivable (partial PO OK)
   │
   └─ matched → po.procurementCleared
                  ├─► notify Finance: pay vendor
                  │     (partial PO → pay accepted qty × rate only)
                  └─► line eligible for client dispatch
```

- New **`b2b_grn`** table `{ grnId, purchaseOrderId, lineItemId, orderedQty, receivedQty, acceptedQty, condition, remarks, verifiedBy, verifiedAt }` + mirror `po.grn[lineItemId]`.
- Match verdicts gain `awaiting_grn` and `qty_mismatch`.
- Vendor invoice copy is already notified to procurement — surface the PDF on the Goods Receipts page per PO.

## D — Procurement → Logistics → Client

```text
Procurement: GRN-cleared lines → [Send to Logistics]
   ▼
b2b_dispatch_requests: requested
   ▼
Logistics: [Request docs] ──► Finance uploads
                              delivery challan + tax invoice
                              status → docs_ready
   ▼
Logistics verifies docs → approve
   ▼
Dispatch form: transporter, vehicle, contact, LR, ETA
               + E-Way bill if order value > ₹50k (same rule)
   ▼
dispatched → order 'Out for delivery' → client notified
   ▼
mark delivered → client prompted to confirm receipt
```

New **`b2b_dispatch_requests`** table `{ dispatchRequestId, orderId, quotationId, lines[], status: requested→docs_pending→docs_ready→dispatched→delivered, challanUrl, taxInvoiceUrl, transporter{...}, ewayBill{...}, requestedBy, dispatchedBy, deliveredAt }`.

## E — Client: receive, verify, pay

```text
Order 'Out for delivery'
   │   dispatch info + challan/tax invoice links visible
   ▼
Per-line [Confirm Received]
   with PO ref / GRN ref / invoice ref shown
   │
   ├─ all lines confirmed → 'Delivered'
   │     → Pay balance (advance already receipted)
   │       or net-terms countdown continues
   │
   └─ issue on a line → raise return (see F)
```

## F — Returns + credit/debit notes (existing pipeline, wired per-line)

Existing machinery: `b2b_return_requests`, logistics return ship-status, `b2b_debit_notes` to vendors, `b2b_credit_notes` forwarded to clients, delivery-proof review. Missing glue: **per-line returns on procurement orders** (`lineItemId` + qty), receive-and-inspect record, audit entries.

```text
Client raises return (line + qty + photo proof)
   ▼
Logistics: approve pickup → return shipped
   ▼
Procurement: receive + inspect (GRN-style record)
   ├─► debit note raised → vendor
   └─► Finance issues credit note → forwarded to client
             └─ client balance reduced / refund per terms
```

## G — Audit log

Every step writes **`b2b_audit_log`** `{ auditId, team, actorId, action, entityType, entityId, details, createdAt }`:

- **procurement**: awards, re-source, PO dispatch, GRN, send-to-logistics, return inspection
- **finance**: commission, quotation send, challan/invoice upload, vendor payment, credit note
- **logistics**: doc verify, dispatch, delivery, return pickup
- **vendor / client** actions logged under their own teams (accept, dispatch / decide, order, pay, confirm, return)

Auditor app gets a read-only **Audit Logs page**: team filter chips, entity search, date range, expandable detail rows.

---

## Landing order (each phase independently testable)

1. **B** — vendor accept + Shipping tab + partial dispatch + E-Way *(unblocks fulfilment testing)*
2. **C** — GRN + match leg + payment gate
3. **D** — dispatch requests + finance docs + logistics dispatch
4. **A** — receipt vouchers *(independent — can slot anywhere)*
5. **E** — client confirm with refs
6. **F** — per-line returns wiring into existing pipeline
7. **G** — audit log service + page (land the service early so all phases write into it)

## Risks / watch-outs

- **E-Way threshold** as env var `EWAY_BILL_THRESHOLD=50000`; per-consignment value = dispatched qty × unit price.
- Existing single-shape `lineShipments` records must read cleanly under the cumulative `dispatches[]` shape.
- `Orders` table composite key (`userId` + `orderId`) — keep using it on all writes.
- Per-line returns need `lineItemId` + `qty` mandatory so credit notes reconcile per line.
- Audit log: one row per action, paged list endpoint — fine at this scale.
