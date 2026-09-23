# PO Auto-Check Feature

## What it does

When a client uploads their own Purchase Order (instead of using the system-generated one), the PM sees an **"Auto check"** button on the PO card in the Purchase Order Management page.

Clicking it automatically compares the client's PO document against the quotation that was sent to them, and reports any discrepancies — before the PO is ever sent to the vendor.

## Why it exists

Clients sometimes upload POs that don't match what was quoted — wrong prices, missing items, incorrect quantities, or wrong GST. Without a check, these mismatches reach the vendor and cause disputes later. Auto check catches them upfront.

## What it compares

For every line item in the quotation sent to the client, the check verifies:

| Check | What it means |
| --- | --- |
| **Item presence** | Every quoted item appears in the client's PO |
| **Item code** | The item code/SKU on the PO line matches the quotation (when both have one) |
| **Quantity** | The PO quantity matches the quoted quantity |
| **Rate** | The PO unit price matches the quoted (client-facing) price |
| **Amount** | The PO line total matches quantity × rate |
| **GST** | The tax percentage matches |
| **Grand total** | The PO's final total matches the quotation total |

Prices are compared against the version the client actually received (including commission), not the vendor's base rates.

## How it actually checks

The client's PO is a PDF — it could be any format, any layout, even a scan of a paper document. So the check works in stages:

1. **Reading the document**

The PO file is passed through a document-analysis service (AWS Textract) that "reads" the PDF — it understands tables, not just raw text. It detects the table structure: which cells belong to which row and column.

2. **Figuring out the columns**

Every client's PO looks different. One calls it "Description", another "Item", another "Particulars". The check scans the table's header row and guesses which column holds what — item names, quantities, rates, amounts, GST. It recognises common variations of each heading.

3. **Matching items to the quotation**

PO item names rarely match the quotation word-for-word ("Ergonomic Office Chair" vs "Office Chair - Ergonomic"). So instead of exact matching, it scores similarity — shared words, one name containing the other — and pairs each quotation item with its closest match in the PO. If nothing matches well enough, the item is flagged as missing.

4. **Comparing the numbers**

For each matched item it compares quantity, rate, line amount and GST. Money fields get a small tolerance (about 1%) so rounding differences between documents don't trigger false alarms. GST percentages are compared within half a percent.

5. **Checking the grand total**

Separately, it scans the whole document for lines like "Grand Total" or "Total Amount" and compares the largest figure found against the quotation's total.

6. **Reporting**

Every check is recorded individually — so a failure shows *exactly* which item and which field disagrees, with the expected value versus what the PO says. The PO only passes when nothing fails; a total that couldn't be found at all is flagged as a warning rather than a hard fail.

## How the flow works

1. Client approves the quotation and uploads their own PO
2. The quotation appears in PM's "Client Purchase Orders Awaiting PM Review" section
3. PM clicks **Auto check** → the PO file is read automatically and compared
4. Results show inline:
   - **✓ All checks passed** — PO matches the quotation
   - **✗ Discrepancies found** — a list of exactly what doesn't match (e.g. `"Chair": rate ₹500 ≠ quotation ₹550`)
5. PM can re-run the check anytime, or open the PO PDF to review manually

## The gate

**The PO cannot be sent to the vendor until the auto-check passes — or a reason for the discrepancies is approved.**

- If checks fail or were never run, the "Send to Vendor" button stays disabled with a warning message
- This is also enforced on the server — even if someone bypassed the UI, the send would be rejected
- System-generated POs (when the client chose "use your PO") skip the check entirely, since there's no client file to verify

## What happens on failure — the reason & approval path

When the check fails (for example the quantity or an item code changed), the PM has two options:

1. **Get a corrected PO** from the client, then re-run the check, or
2. **Submit a reason** explaining the discrepancy (e.g. "client increased the chair quantity after a verbal confirmation")

A submitted reason goes to the **Finance team for approval**:

- The PM enters the reason in the check results panel → it shows as *"awaiting finance approval"*
- Finance sees a **"PO reason pending"** badge on the quotation in the External Finance workspace list, clicks **Review PO reason**, sees the discrepancies + the reason, and either **approves** or **rejects** it (with remarks)
- **Approved** → the gate opens and the PO can be sent to the vendor — the differences are treated as intentional and documented
- **Rejected** → the PO stays blocked; the PM sees the rejection remarks and must submit a corrected reason or get a revised PO from the client

**Without a reason, or with a rejected reason, the PO cannot be sent to the vendor.**

## Vendor-side: invoice matching & red flags

The checking doesn't stop at the client PO. When the **vendor submits an invoice** against the PO, the system automatically compares the invoice against the PO that was sent to the vendor — same items, quantities, rates, amounts, and totals.

- **Invoice matches the PO** → it flows on to the PM as usual
- **Anything doesn't match** → a **red flag** is raised: the invoice is held at `red_flagged` and goes to the **Finance team**, which sees the exact mismatches (e.g. `"Chair": invoice qty 12 ≠ PO qty 10`)
- Finance either **approves anyway** (releases it to the PM with the flag recorded as resolved) or **rejects** it back to the vendor for correction
- The vendor sees the `red_flagged` status on their invoice list

This gives complete control on both sides: the client's PO is checked against the quotation, and the vendor's invoice is checked against the PO — with Finance as the escalation point whenever anything doesn't line up.

## Edge cases

- **Scanned/image PDFs or unusual layouts** — if the document can't be read, the check fails safely ("no items extracted") and the PO stays blocked rather than slipping through unverified
- **Re-running** — each run overwrites the previous result, so PM can re-check after uploading a revised PO
