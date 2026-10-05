# B2B Procurement — Complete Flow Diagrams

## 1. End-to-End Overview

```text
CLIENT                          PROCUREMENT                    VENDOR                    FINANCE                      LOGISTICS
  │                                 │                            │                         │                            │
  ▼                                 ▼                            ▼                         ▼                            ▼
┌──────────┐                 ┌────────────┐              ┌─────────────┐           ┌──────────────┐             ┌───────────────┐
│ Multi-item│ ──submit──▶   │ Assign     │ ──invite──▶ │ Submit quote │           │              │             │               │
│ RFQ       │               │ vendors    │              │ per line     │           │              │             │               │
└──────────┘                 │ per line   │ ◀─────────── └─────────────┘           │              │             │               │
                             └─────┬──────┘                                       │              │             │               │
                                   │                                             │              │             │               │
                                   ▼                                             │              │             │               │
                             ┌────────────┐                                      │              │             │               │
                             │ Sourcing   │                                      │              │             │               │
                             │ matrix:    │                                      │              │             │               │
                             │ award/drop │                                      │              │             │               │
                             │ per line   │                                      │              │             │               │
                             └─────┬──────┘                                      │              │             │               │
                                   │                                             │              │             │               │
                                   ▼                                             │              │             │               │
                             ┌────────────┐                                 ┌───▶│ Commission % │             │               │
                             │ Merge into │ ──────────────────────────────────┘  │ applied to   │             │               │
                             │ ONE client │                                      │ merged quote │             │               │
                             │ quotation  │ ◀────────────────────────────────────│              │             │               │
                             └─────┬──────┘                                      └──────┬───────┘             │               │
                                   │                                                    │                     │               │
                                   ▼                                                    │                     │               │
┌──────────┐                 ┌────────────┐                                             │                     │               │
│ Approve /│ ◀──one quote── │ Client gets │                                            │                     │               │
│ reject / │                │ consolidated│                                            │                     │               │
│ change   │                │ quote (INR, │                                            │                     │               │
│ per line │                │ 1 payment   │                                            │                     │               │
└────┬─────┘                │  term set)  │                                            │                     │               │
     │                      └────────────┘                                             │                     │               │
     ▼                                                                                 │                     │               │
┌──────────┐                                                                           │                     │               │
│ Client PO│ ──pay──▶ ADVANCE ──▶ receipt voucher (PDF + email)                        │                     │               │
│ issued   │                                                                           │                     │               │
└────┬─────┘                                                                           │                     │               │
     │                                                                                 │                     │               │
     ▼                                                                                 │                     │               │
                     ┌────────────┐              ┌─────────────┐                        │                     │               │
                     │ Vendor POs │ ──approve──▶ │ Vendor sees │                        │                     │               │
                     │ (one per   │   by proc.   │ PO → ACCEPT │                        │                     │               │
                     │  awarded   │              │ whole PO    │                        │                     │               │
                     │  vendor)   │              └──────┬──────┘                        │                     │               │
                     └────────────┘                     │                               │                     │               │
                                                        ▼                               │                     │               │
                                                 ┌─────────────┐                        │                     │               │
                                                 │ Vendor ships│                        │                     │               │
                                                 │ (partial OK,│                        │                     │               │
                                                 │  E-Way >50k)│                        │                     │               │
                                                 └──────┬──────┘                        │                     │               │
                                                        │                               │                     │               │
                                                        ▼                               │                     │               │
                     ┌────────────┐              ┌─────────────┐                        │                     │               │
                     │ Record GRN │ ◀──goods──   │ Goods arrive│                        │                     │               │
                     │ per line   │   at client  └─────────────┘                        │                     │               │
                     │ (rcvd/acc/ │                                                            ┌───────────────┐            │
                     │  rejected) │                                                            │ Vendor        │            │
                     └─────┬──────┘                                                            │ Payments tab: │            │
                           │                                                                  │ release = acc │            │
                           ▼                                                                  │ qty × rate    │            │
                     ┌────────────┐              ┌─────────────┐           ┌──────────────┐    │ ← notification│            │
                     │ VERIFY GRN │ ──cleared──▶ │ 3-way match │ ─────────▶│ Vendor paid  │    │ deep-links    │            │
                     │ (per line) │              │ PO↔inv↔GRN  │           │ (UTR logged) │    │ here          │            │
                     └────────────┘              └─────────────┘           └──────────────┘    └───────────────┘            │
                           │                                                                                              │
                           ▼                                                                                              │
                     ┌────────────┐           docs req        ┌──────────────┐             ┌───────────────┐               │
                     │ Send to    │ ────────────────────────▶│ Finance      │             │ Dispatch      │               │
                     │ Logistics  │                           │ uploads      │ ──docs───▶  │ Queue:        │               │
                     └────────────┘                           │ challan +    │   ready     │ verify docs   │               │
                                                              │ tax invoice  │             │ → dispatch    │               │
                                                              └──────────────┘             │ (transporter, │               │
                                                                                           │  LR, E-Way)   │               │
┌──────────┐                                                                                └──────┬────────┘               │
│ Confirm  │ ◀──out for delivery───────────────────────────────────────────────────────────────────│                        │
│ each line│                                                                                      ▼                        │
│ → Deliver│ ◀──delivered──────────────────────────────────────────────────────────────────────────                        │
│ + BALANCE│ ──pay──▶ receipt voucher + FINAL INVOICE (PDF + email attachment)                                             │
└────┬─────┘                                                                                                               │
     │                                                                                                                     │
     ▼ (issue on a line)                                                                                                    │
┌──────────┐                 ┌────────────┐                              ┌──────────────┐                                  │
│ Return   │ ──pickup──▶    │ Inspect    │ ──accepted──▶               │ Debit note   │ ──▶ Credit note ──▶ client wallet │
│ per line │               │ returned   │                              │ to vendor    │                                  │
└──────────┘                 └────────────┘                              └──────────────┘                                  │


AUDIT TRAIL (all stages): every award, dispatch, GRN, match, release, delivery, return → written to audit log,
visible in Auditor dashboard per team.
```

---

## 2. Stage 1 — Multi-Item RFQ (Client)

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT RFQ BUILDER (7 steps)                  │
└─────────────────────────────────────────────────────────────────┘

 Step 1  Basic Info          ┌──────────────────────────────┐
        ┌──────────────────▶ │ Line 1 (primary):            │
        │                    │  product, qty, unit, notes   │
        │                    │ Line 2, 3 ... N:             │
        │                    │  same fields + duplicate/CSV │
        │                    │ Category + delivery address  │
        │                    └──────────────────────────────┘
 Step 2  Dynamic Specs       category-specific fields
 Step 3  Requirements        scope, customization, samples
 Step 4  Budget              min/max range, pricing posture
 Step 5  Vendor Prefs        supplier type, region, certs
 Step 6  Attachments         BOQ / drawings / specs (tagged)
 Step 7  Timeline            urgency, quote deadline, need-by
        │
        ▼
┌──────────────────────────────┐
│ PUBLISH                      │
│ items[] = primary + extras   │
│ requiredBy derived from      │
│ timeline (fallback +30d)     │
└──────────────┬───────────────┘
               ▼
        Draft / Published RFQ  ──▶  lands on PROCUREMENT desk
```

---

## 3. Stage 2 — Vendor Assignment & Quotation Collection

```text
ONE RFQ (3 lines)
        │
        ▼
┌─────────────────────────────────────────────┐
│ PROCUREMENT assigns vendors PER LINE        │
│                                             │
│   Line 1 (Banana)  → Vendor A, Vendor B     │
│   Line 2 (Apples)  → Vendor A               │
│   Line 3 (Oranges) → Vendor B, Vendor C     │
└─────────────────────┬───────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │Vendor A │   │Vendor B │   │Vendor C │
   │quotes   │   │quotes   │   │quotes   │
   │L1 + L2  │   │L1 + L3  │   │L3       │
   └────┬────┘   └────┬────┘   └────┬────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
        All quotes LINKED to parent RFQ + line ids
                      │
                      ▼
┌─────────────────────────────────────────────┐
│ SOURCING MATRIX (per line comparison)       │
│                                             │
│   Banana:  A ₹10/kg   B ₹12/kg  → AWARD A   │
│   Apples:  A ₹20/kg           → AWARD A     │
│   Oranges: B ₹8/kg    C ₹9/kg → AWARD B     │
│                                             │
│   dropped lines → re-source / revise        │
└─────────────────────┬───────────────────────┘
                      ▼
        MERGE awarded lines → ONE client quotation
```

---

## 4. Stage 3 — Finance Commission → Client Approval → PO + Advance

```text
┌──────────────┐         ┌────────────────────┐        ┌─────────────────┐
│ Merged quote │ ──────▶ │ FINANCE applies    │ ─────▶ │ ONE client      │
│ (awarded     │         │ commission %       │        │ quotation       │
│  lines)      │         │                    │        │ (single currency│
└──────────────┘         └────────────────────┘        │  terms/incoterms│
                                                       └────────┬────────┘
                                                                │
                                                                ▼
                                            ┌───────────────────────────────────┐
                                            │ CLIENT reviews PER LINE           │
                                            │   Line 1: approve                 │
                                            │   Line 2: approve                 │
                                            │   Line 3: change request ──┐      │
                                            └───────────┬────────────────┘      │
                                                        │                      │
                                             ◀──revise──┘   (loop back)        │
                                                        │
                                                        ▼
                                            ┌────────────────────────┐
                                            │ CLIENT PO generated    │
                                            │ for approved quote     │
                                            └───────────┬────────────┘
                                                        │
                                                        ▼
                                            ┌────────────────────────┐
                                            │ PAYMENT                │
                                            │  • Advance 50%    OR   │
                                            │  • Full 100%           │
                                            └───────────┬────────────┘
                                                        │
                                                        ▼
                                     ┌────────────────────────────────┐
                                     │ RECEIPT VOUCHER auto-issued    │
                                     │  • PDF in S3                   │
                                     │  • emailed to client           │
                                     │  • downloadable in My Orders + │
                                     │    Billing                     │
                                     └────────────────────────────────┘
```

---

## 5. Stage 4 — Vendor POs → Vendor Accept → Shipping

```text
Client advance paid
        │
        ▼
┌──────────────────────────────┐
│ Separate VENDOR POs created  │
│ (one per awarded vendor)     │
│  Vendor A: lines 1, 2        │
│  Vendor B: line 3            │
└──────────────┬───────────────┘
               │ procurement approves
               ▼
┌──────────────────────────────┐
│ Vendor portal: PO visible    │
│  → ACCEPT PO (whole PO)      │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────────────────────┐
│ Vendor SHIPPING tab — cumulative dispatches  │
│                                              │
│  Dispatch 1: 10/30 pcs (challan + invoice)   │
│  Dispatch 2: 20/30 pcs                       │
│                                              │
│  per-consignment rule:                       │
│    value > ₹50,000 → E-Way bill mandatory    │
└──────────────┬───────────────────────────────┘
               ▼
        Goods shipped to client site
```

---

## 6. Stage 5 — GRN → Procurement Cleared

```text
Goods arrive
     │
     ▼
┌────────────────────────────────┐
│ PROCUREMENT records GRN        │
│ per line:                      │
│   ordered | received |         │
│   accepted | rejected          │
└───────────────┬────────────────┘
                ▼
        ┌───────────────┐
        │ VERIFY GRN    │     (per line)
        └───────┬───────┘
                │
   all confirmed lines verified & acceptedQty > 0?
                │
                ▼
┌────────────────────────────────────┐
│ PO → PROCUREMENT CLEARED           │
│                                    │
│  ├─► notification → FINANCE        │
│  │   "release vendor payment"      │
│  │   (deep-links to Vendor Payments)│
│  ├─► notification → LOGISTICS      │
│  └─► audit entry                   │
└────────────────────────────────────┘
```

---

## 7. Stage 6 — 3-Way Match & Vendor Payment Release (Finance)

```text
┌─────────────────────────────────────────────────────┐
│                 THREE-WAY MATCH                      │
│                                                     │
│   PO ordered qty  ↔  Vendor invoice qty ↔ GRN acc. │
│                                                     │
│   matched          → invoice payable                │
│   awaiting_grn     → blocked until GRN verified     │
│   qty_mismatch     → flagged; override needs reason │
└───────────────────────┬─────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│ FINANCE → "VENDOR PAYMENTS" tab                      │
│                                                     │
│  per cleared PO:                                    │
│   • vendor + PO reference                           │
│   • vendor invoice PDF (view)                       │
│   • per-line: ordered/received/accepted × rate      │
│   • AMOUNT TO RELEASE = Σ acceptedQty × unitPrice   │
│   • Mark released (UTR / note) → Released section   │
│                                                     │
│  partial fulfilment → pay ACCEPTED qty only          │
└─────────────────────────────────────────────────────┘
```

---

## 8. Stage 7 — Logistics Dispatch (procurement → finance → logistics → client)

```text
GRN verified
     │
     ▼
┌─────────────────────┐
│ Procurement clicks  │
│ SEND TO LOGISTICS   │   creates dispatch request (status: requested)
└─────────┬───────────┘
          ▼
┌─────────────────────┐   request docs    ┌──────────────────────────┐
│ LOGISTICS dispatch  │ ────────────────▶ │ FINANCE Dispatch Docs tab│
│ queue               │                   │ uploads:                 │
│                     │ ◀── docs_ready ── │  • delivery challan      │
│                     │                   │  • tax invoice           │
└─────────┬───────────┘                   └──────────────────────────┘
          │ verify documents
          ▼
┌──────────────────────────────────────────┐
│ Dispatch form:                           │
│  transporter, vehicle, LR no., ETA,      │
│  E-Way bill if consignment > ₹50,000     │
└─────────┬────────────────────────────────┘
          ▼
   Client order → OUT FOR DELIVERY
          │
          ▼
   Mark DELIVERED → client prompted to confirm
```

---

## 9. Stage 8 — Client Confirmation → Balance Payment → Final Invoice

```text
Order delivered
     │
     ▼
┌─────────────────────────────────────┐
│ CLIENT — My Orders                  │
│  • per-line CONFIRM RECEIVED        │
│  • dispatch docs visible:           │
│    challan + tax invoice PDFs       │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ PAY BALANCE button unlocks          │
│  (remaining = total − advance)      │
└──────────┬──────────────────────────┘
           ▼
┌──────────────────────────────────────────────────┐
│ On balance payment verified:                      │
│  • order → Fully Paid / Completed                 │
│  • receipt voucher #2 auto-issued (PDF + email)   │
│  • FINAL INVOICE attached to the same email       │
│  • Download Invoice enabled in My Orders          │
│    (fallback: B2B invoice → dispatch tax invoice  │
│     → commissioned quotation PDF)                 │
└──────────────────────────────────────────────────┘
```

---

## 10. Stage 9 — Returns Loop (per line)

```text
Client flags issue on a delivered line
     │
     ▼
┌─────────────────────────────┐
│ Return request (per line):  │
│  qty, reason, photo proof   │
└───────────┬─────────────────┘
            ▼
┌─────────────────────────────┐
│ Pickup → RECEIVE at origin  │
└───────────┬─────────────────┘
            ▼
┌─────────────────────────────┐
│ INSPECT returned qty        │
└───────┬───────────┬─────────┘
        │           │
 accepted │           │ rejected → return closed
        ▼           ▼
┌──────────────┐  ┌──────────────────┐
│ DEBIT NOTE   │  │ CREDIT NOTE      │
│ to vendor    │  │ issued to client │
│ (deduct from │  │ → wallet /       │
│  payment)    │  │   adjustment     │
└──────────────┘  └──────────────────┘
        │
        ▼
  Vendor notified; finance sees debit note
  in Vendor Payments / reconciliation
```

---

## 11. Notifications & Audit — Cross-Cutting

```text
EVERY state transition writes BOTH:

┌───────────────────────┐        ┌───────────────────────────┐
│ NOTIFICATION          │        │ AUDIT LOG                  │
│ (per-team inbox)      │        │ (append-only trail)        │
│                       │        │                            │
│ • finance:            │        │ actor + action + entity    │
│   vendor_payment_     │        │ + before/after snapshot    │
│   release (deep-link) │        │                            │
│   dispatch_docs_req.  │        │ visible in Auditor         │
│ • logistics:          │        │ dashboard, filterable      │
│   goods eligible      │        │ per team/entity/date       │
│ • client:             │        │                            │
│   out-for-delivery,   │        │                            │
│   delivered, returns  │        │                            │
└───────────────────────┘        └───────────────────────────┘
```

---

## 12. Payment Phases & Statuses (Reference)

```text
PAYMENT PHASES                CLIENT-FACING INVOICE STATUS
──────────────                ─────────────────────────────

advance_paid  ─┐              Pending Payment       = no payment yet
               ├─▶ per order  Partial Payment Due   = advance paid, balance due
remaining     ─┤              Paid                  = fully paid
completed     ─┘

full / balance  = one-shot payment paths

GATES (hard stops):
  vendor payment   ← blocked until PO procurementCleared (GRN verified)
  match override   ← requires stored reason
  dispatch         ← blocked until finance docs uploaded (challan + tax invoice)
  balance payment  ← unlocked after line delivery confirmation
```
