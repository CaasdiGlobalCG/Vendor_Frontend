# Buying from the marketplace inside a project

A vendor working on a project can now see the marketplace, order from it, or ask for a quote without leaving the workspace. Every order is tied to the project, and one Orders page shows where each one stands.

---

## What a vendor sees

**Menu → B2B Marketplace** opens a drawer over the canvas.
- Browse by category or search.
- **Add to order** puts an item in "Your order". Place the order with a delivery address; it is added to the project.
- **Request quote** opens the existing RFQ form, already filled in with the product.
- A product with no listed price can only be quoted, not ordered.

**Orders** (dashboard header, and **Menu → B2B Orders** inside a project) lists every order with its project, how it was placed (direct or quote request), what has been paid and what is waiting on the vendor.

Each order shows:
- a progress bar: Quote → Pay → Order → Ship → Deliver → Close,
- the quotation, receipt vouchers, purchase order and invoice, each with its figures and a download,
- payments made, goods received, and anything reported as a problem,
- a plain history, and a short list of things the vendor can do next.

The quotation, receipt voucher, PO and invoice also appear as elements on the canvas the order was raised from, side by side.

---

## A direct order

1. The vendor places the order in the drawer.
2. The project manager is told. Nothing waits on the PM.
3. The order follows the marketplace's own status: shipped, then delivered.
4. The vendor confirms receipt, and the order closes.

A vendor who has never bought from the marketplace gets a small buyer profile made for them automatically. It is marked as a vendor-buyer profile and is kept out of the client lists the teams review.

---

## A quote request (RFQ) raised from a workspace

| Step | Who | What happens |
|---|---|---|
| 1 | Vendor | Raises the request from the workspace (unchanged form) |
| 2 | Procurement | Sources quotes and sends the merged quotation. **For a workspace order it goes to the PM, not Finance** |
| 3 | Project manager | Reviews, then sends to Finance |
| 4 | Finance | Adds commission and payment terms. **For a workspace order it returns to the PM, not the client** |
| 5 | Project manager | **Add to workspace**: the quotation appears for the vendor |
| 6 | Vendor | Approves, asks for changes, or declines |
| 7 | Vendor | Pays the advance (or the full price) as per the terms. A receipt voucher is made for every payment |
| 8 | Vendor | Uses the system PO, or gives their own PO number |
| 9 | Project manager | Forwards the PO to procurement |
| 10 | Procurement | Raises the PO to the supplier (existing screen) |
| 11 | Supplier | Confirms the PO and uploads the invoice. **For a workspace order it goes to procurement → PM → Finance → PM, not straight to Finance** |
| 12 | Procurement | Verifies the goods received (GRN) and sends it to the PM |
| 13 | Project manager | Checks it and releases it to Finance (to clear the supplier) and Logistics (to deliver) |
| 14 | Logistics | Delivers to the vendor's address |
| 15 | Vendor | Checks the goods. **Fine** unlocks the invoice; **a problem** goes to the PM |
| 16 | Project manager | **Add invoice to workspace** (only after the vendor has confirmed the goods) |
| 17 | Vendor | Pays the balance. The order closes |

Rules that are enforced on the server:
- The vendor only ever sees the **commissioned price**, never the supplier's cost, the commission, or who the supplier is.
- The amount to pay is worked out on the server, and a payment is only recorded after the payment provider's signature checks out.
- The invoice cannot be added to the workspace until the vendor has confirmed delivery **and** Finance has returned the invoice.
- Orders that did not come from a workspace follow their old route, unchanged.

---

## Who sees what

| | Vendor (buyer) | PM | Procurement | Finance | Logistics |
|---|---|---|---|---|---|
| Their own orders | ✓ | | | | |
| All orders of their projects | | ✓ | | | |
| All workspace orders | | | ✓ | ✓ | ✓ |
| Supplier cost and commission | ✗ | ✓ | ✓ | ✓ | ✗ |
| The documents on the canvas | ✓ | ✓ | ✗ | ✗ | ✗ |

Staff use **Marketplace Orders** in their own dashboard. Each team sees only the steps that are theirs.

---

## Setting it up (needs someone with AWS and server access)

1. **Create the orders table.** From `Vendor_Backend`, read what it would do, then create it:
   - `node scripts/createWorkspaceOrdersTable.js`
   - `node scripts/createWorkspaceOrdersTable.js --apply`
2. **Set a shared key** on Vendor_Backend, Employee_Main backend and Sales-Backend: `WORKSPACE_ORDERS_SERVICE_KEY` (the same long random value everywhere). Without it, staff steps are switched off and nothing is rerouted.
3. **Point the services at each other:**
   - Employee_Main backend and Sales-Backend: `VENDOR_BACKEND_URL` (the vendor server's address).
   - All three: `WORKSPACE_B2B_ORDERS_TABLE` if the table has a different name.
4. **Payments on Vendor_Backend:** `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (already used for workspace quotations).
5. **Marketplace in the workspace:** set `VITE_B2B_API_URL` on the vendor frontend to the marketplace server's address. Until it is set, the menu opens the marketplace site as before.
6. **Orders table name for direct orders** (marketplace `Orders` table) if it is not called `Orders`: `DYNAMODB_ORDERS_TABLE` on Vendor_Backend.

---

## Things to know

- Procurement's existing GRN screen and logistics' dispatch queue **are linked**: verifying the goods (once every supplier PO of the order is cleared) moves the order to "With PM", and marking the last dispatch delivered asks the vendor to verify. The buttons on Marketplace Orders stay as a fallback. Delivery is only recorded after the PM has released the goods; if not, logistics sees a notice.
- Supplier dispatch in the Sales app is not linked yet.
- A vendor's own PO is recorded by number (and an optional link); there is no file upload from the Orders page yet.
- If someone deletes a document from the canvas, it is put back the next time the canvas is opened. It is a record of the order.
- Not tried against real payments, files, accounts or tables yet. See the test notes in the project report.
