import React, { useContext } from 'react';
import { toWords } from 'number-to-words';
import { VendorContext } from '../../../../../context/VendorContext.jsx';

function formatAddress(addr) {
    if (!addr) return '-';
    
    // Handle string addresses
    if (typeof addr === 'string') {
        return addr || '-';
    }
    
    // Handle object addresses with various field names
    const parts = [
        addr.street1 || addr.street || addr.address1 || '',
        addr.street2 || addr.address2 || '',
        addr.city || addr.town || '',
        addr.state || addr.province || '',
        addr.pinCode || addr.postalCode || addr.zip || '',
        addr.country || ''
    ];
    
    return parts.filter(Boolean).join('\n') || '-';
}

// Helper for number formatting
const formatCurrency = (num) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

const formatQuantity = (quantity) => {
  if (typeof quantity !== 'number' && typeof quantity !== 'string') return '';
  const num = Number(quantity);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Function to format terms and conditions with proper line breaks
const formatTermsAndConditions = (terms) => {
  if (!terms) return '';
  
  // If terms already contain line breaks, return as is
  if (terms.includes('\n')) return terms;
  
  // Split by common section headers and add line breaks
  const formattedTerms = terms
    .replace(/(Payment Terms:)/g, '\n$1')
    .replace(/(Services\/Goods:)/g, '\n\n$1')
    .replace(/(Late Payment:)/g, '\n\n$1')
    .replace(/(Disputes:)/g, '\n\n$1')
    .replace(/(\s+)/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  return formattedTerms;
};

export default function StandardPreview({
    colors,
    quote,
    company,
    terms,
    notes,
    docType = 'quote',
    // Optional overrides for purchase orders and other docs
    poNumber,
    referenceNumber
}) {
    if (!quote) {
        return <div className="p-8 text-gray-400">No data to preview.</div>;
    }

    // Vendor context - used for quote-specific branding and signatures
    const { currentUser, vendorData } = useContext(VendorContext) || {};

    const vendorDetails = vendorData?.vendorDetails || {};
    const detailsName =
      vendorDetails.primaryContactName ||
      [vendorDetails.firstName, vendorDetails.lastName].filter(Boolean).join(' ').trim() ||
      vendorDetails.vendorName ||
      vendorDetails.companyName ||
      '';

    const resolvedVendorName =
      detailsName ||
      currentUser?.name ||
      currentUser?.companyName ||
      currentUser?.fullName ||
      currentUser?.displayName ||
      currentUser?.email ||
      '';

    // Avoid showing internal IDs (UUIDs or vendorIds) as the display name
    const possibleIds = [
      vendorDetails.vendorId,
      vendorDetails.id,
      currentUser?.vendorId,
    ].filter(Boolean);

    const uuidLikeRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const vendorName =
      !resolvedVendorName ||
      uuidLikeRegex.test(resolvedVendorName.trim()) ||
      possibleIds.includes(resolvedVendorName.trim())
        ? 'Vendor'
        : resolvedVendorName;
    const vendorEmail = currentUser?.email || '';

    const isInvoice = docType === 'invoice';
    const isCreditNote = docType === 'creditnote';
    const isPurchaseOrder = docType === 'purchaseorder' || docType === 'po';

    // Base document/transaction number derived from the quote-like object
    const baseNumber =
        quote?.customQuoteId ||
        quote?.customInvoiceId ||
        quote?.customCreditNoteId ||
        quote?.quotationId?.toUpperCase() ||
        quote?.invoiceId?.toUpperCase() ||
        quote?.creditNoteId?.toUpperCase() ||
        'XXX';

    // For purchase orders, prefer explicit PO number overrides or PO-specific fields
    const invoiceNumber = isPurchaseOrder
        ? poNumber ||
          quote?.customPoId ||
          quote?.purchaseOrderNumber ||
          quote?.purchaseOrderId ||
          baseNumber
        : baseNumber;

    const invoiceDate = quote?.createdAt ? new Date(quote.createdAt).toLocaleDateString('en-GB') : quote?.quoteDate ? new Date(quote.quoteDate).toLocaleDateString('en-GB') : quote?.invoiceDate ? new Date(quote.invoiceDate).toLocaleDateString('en-GB') : quote?.creditNoteDate ? new Date(quote.creditNoteDate).toLocaleDateString('en-GB') : 'N/A';
    const customerName = quote?.customerDetails?.name || quote?.customerDetails?.displayName || quote?.customerName || 'Customer';
    const items = quote?.items || [];
    const displayDocType = isCreditNote ? 'CREDIT NOTE' : isInvoice ? 'TAX INVOICE' : isPurchaseOrder ? 'PURCHASE ORDER' : 'QUOTE';
    const referenceLabel = isCreditNote
        ? 'Credit Note #'
        : isInvoice
        ? 'Invoice #'
        : isPurchaseOrder
        ? 'Purchase Order #'
        : 'Custom Quote #';

    // Reference number for linked documents (e.g., reference quote for PO)
    const linkedReferenceNumber =
        referenceNumber ||
        quote?.referenceQuoteNumber ||
        quote?.referenceNumber ||
        quote?.customQuoteId ||
        quote?.quoteNumber ||
        quote?.displayQuoteId ||
        quote?.quotationId;
    
    // Add styles to handle page breaks elegantly
    const pdfStyles = `
      @media print {
        /* Allow table to break across pages */
        .items-table-container {
          page-break-inside: auto !important;
          display: block !important;
        }
        /* Allow table row to start on same page */
        .items-table-row {
          page-break-before: auto;
          page-break-inside: auto !important;
        }
        /* Prevent breaks inside individual table rows */
        tbody tr {
          page-break-inside: avoid !important;
        }
        /* Ensure table headers repeat on new pages */
        thead {
          display: table-header-group !important;
        }
        /* Keep headers with content */
        thead tr {
          page-break-inside: avoid;
          page-break-after: avoid;
        }
        /* Prevent breaks inside cells */
        td, th {
          page-break-inside: avoid !important;
        }
        /* Prevent breaks in footer sections */
        .footer-section {
          page-break-inside: avoid !important;
        }
        /* Add padding at bottom for signature space */
        .signature-section {
          min-height: 150px;
          page-break-inside: avoid !important;
        }
      }
    `;

    // Determine GST type based on presence of tax fields in items or totals
    const hasCgst = items.some(item => item.cgstAmount > 0);
    const hasSgst = items.some(item => item.sgstAmount > 0);
    const hasIgst = items.some(item => item.igstAmount > 0);
    const isIntraState = hasCgst && hasSgst && !hasIgst;
    const isInterState = hasIgst && !hasCgst && !hasSgst;
    // Fallback to state code logic if all are zero
    const fallbackIntra = quote.customerDetails?.gstin?.startsWith('29');
    const showCgstSgst = isIntraState || (!isInterState && fallbackIntra);
    const showIgst = isInterState || (!showCgstSgst && hasIgst);

    // Extract bill to and ship to addresses
    const billTo = quote.customerDetails?.address?.billing || {};
    const shipTo = quote.customerDetails?.address?.shipping || {};
    const billToGstin = quote.customerDetails?.gstin || '-';
    const shipToGstin = quote.customerDetails?.shippingGstin || billToGstin;
    
    // Debug logging
    console.log('📋 StandardPreview - customerDetails:', quote.customerDetails);
    console.log('📋 StandardPreview - billTo address:', billTo);
    console.log('📋 StandardPreview - shipTo address:', shipTo);


    // Safely derive totals; fall back to summing item-level amounts when header-level totals are missing
    const subTotal =
      typeof quote.subTotal !== 'undefined'
        ? Number(quote.subTotal) || 0
        : items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const totalCgst =
      typeof quote.totalCgst !== 'undefined'
        ? Number(quote.totalCgst) || 0
        : items.reduce((sum, item) => sum + (Number(item.cgstAmount) || 0), 0);

    const totalSgst =
      typeof quote.totalSgst !== 'undefined'
        ? Number(quote.totalSgst) || 0
        : items.reduce((sum, item) => sum + (Number(item.sgstAmount) || 0), 0);

    const totalIgst =
      typeof quote.totalIgst !== 'undefined'
        ? Number(quote.totalIgst) || 0
        : items.reduce((sum, item) => sum + (Number(item.igstAmount) || 0), 0);
    const discount = quote.discount?.value ? (subTotal * Number(quote.discount.value) / 100) : 0;
    const tdsValue = quote.tdsValue ? (subTotal * Number(quote.tdsValue) / 100) : 0;

    const grandTotal = isIntraState
      ? subTotal + totalCgst + totalSgst - discount - tdsValue
      : subTotal + totalIgst - discount - tdsValue;
    const amountWithheld = parseFloat(quote.amountWithheld) || 0;
    const isQuote = !isInvoice && !isCreditNote && !isPurchaseOrder;

    const totalInWords = grandTotal ? `Indian Rupees ${toWords(Math.floor(grandTotal)).replace(/(^\w|\s\w)/g, m => m.toUpperCase())} Only` : '';
    
    // Calculate colspan for footer rows
    const getColspan = () => {
        let baseCols = isIntraState ? 7 : 6;
        if (quote.items.some(item => item.ratePerSqft)) baseCols += 1;
        if (quote.items.some(item => item.measurements)) baseCols += 1;
        return baseCols;
    };
    
    return (
        <div className="w-full max-w-4xl bg-white shadow-lg relative mx-auto my-8 print:shadow-none print:my-0">
            <style>{pdfStyles}</style>
            <div className="p-4">
                <table className="w-full text-xs" style={{ border: '1px solid #ccc', borderCollapse: 'collapse' }}>
                    <tbody>
                        {/* Row 1: Company Info & Doc Type */}
                        <tr>
                            <td className="p-2 align-top" style={{ border: '1px solid #ccc', width: '60%' }}>
                                {/* For quotes, show vendor identity instead of company branding */}
                                {isQuote ? (
                                  <div className="flex flex-col gap-1 mb-2">
                                    <div className="font-bold text-xl">{vendorName}</div>
                                    {vendorEmail && <div className="text-xs">{vendorEmail}</div>}
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-4 mb-2">
                                      {company.logo && (
                                        <img
                                          src={company.logo}
                                          alt="Logo"
                                          className="h-12 w-12 object-contain rounded bg-gray-100 border"
                                        />
                                      )}
                                      <div className="font-bold text-xl">{company.name}</div>
                                    </div>
                                    <div className="text-xs">{company.address}</div>
                                    <div className="text-xs">{company.country}</div>
                                    {company.gstin && <div className="text-xs">GSTIN: {company.gstin}</div>}
                                    <div className="text-xs">{company.email}</div>
                                  </>
                                )}
                                <div className="mt-4 text-xs">
                                    <span className="font-semibold">{referenceLabel}:</span>
                                    <span className="ml-2">{invoiceNumber}</span>
                                </div>
                                <div className="text-xs">
                                    <span className="font-semibold">
                                        {isCreditNote
                                            ? 'Credit Note Date'
                                            : isInvoice
                                            ? 'Invoice Date'
                                            : isPurchaseOrder
                                            ? 'PO Date'
                                            : 'Date'} :
                                    </span>
                                    <span className="ml-2">{invoiceDate}</span>
                                </div>
                                {isPurchaseOrder && linkedReferenceNumber && (
                                    <div className="text-xs">
                                        <span className="font-semibold">Reference Quote # :</span>
                                        <span className="ml-2">{linkedReferenceNumber}</span>
                                    </div>
                                )}
                            </td>
                            <td className="p-3 align-top text-right font-bold text-4xl" style={{ border: '1px solid #ccc', width: '40%' }}>
                                {displayDocType}
                            </td>
                        </tr>

                        {/* Row 2: Bill To / Ship To */}
                        <tr>
                            <td className="p-2 align-top" style={{ border: '1px solid #ccc' }}>
                                <div className="font-semibold text-xs mb-1" style={{ background: '#f0f0f0', padding: '2px 4px' }}>Bill To</div>
                                <div className="font-bold text-blue-700 mt-1">{customerName}</div>
                                <pre className="whitespace-pre-line text-xs" style={{ fontFamily: 'inherit' }}>{formatAddress(billTo)}</pre>
                                {billToGstin && (
                                  <div className="text-xs text-gray-600 mt-1">GSTIN: {billToGstin}</div>
                                )}
                            </td>
                            <td className="p-2 align-top" style={{ border: '1px solid #ccc' }}>
                                <div className="font-semibold text-xs mb-1" style={{ background: '#f0f0f0', padding: '2px 4px' }}>Ship To</div>
                                <pre className="whitespace-pre-line text-xs mt-1" style={{ fontFamily: 'inherit' }}>{formatAddress(shipTo)}</pre>
                                {shipToGstin && (
                                  <div className="text-xs text-gray-600 mt-1">GSTIN: {shipToGstin}</div>
                                )}
                            </td>
                        </tr>

                        {/* Row 3: Item Table */}
                        <tr className="items-table-row">
                            <td colSpan={2} style={{ border: '1px solid #ccc', padding: 0 }}>
                                <div className="items-table-container">
                                <table className="w-full text-xs" style={{ borderCollapse: 'collapse', pageBreakInside: 'auto' }}>
                                    <thead style={{ display: 'table-header-group' }}>
                                        <tr className="bg-gray-100">
                                            <th className="p-2 border font-semibold text-left">#</th>
                                            <th className="p-2 border font-semibold text-left">Item & Description</th>
                                            <th className="p-2 border font-semibold text-left">HSN/SAC</th>
                                            <th className="p-2 border font-semibold text-right">Qty</th>
                                            <th className="p-2 border font-semibold text-right">Rate</th>
                                            {quote.items.some(item => item.ratePerSqft) && <th className="p-2 border font-semibold text-right">Rate/Sqft</th>}
                                            {quote.items.some(item => item.measurements) && <th className="p-2 border font-semibold text-center">Measurements</th>}
                                            {showCgstSgst && <th className="p-2 border font-semibold text-right">CGST</th>}
                                            {showCgstSgst && <th className="p-2 border font-semibold text-right">SGST</th>}
                                            {showIgst && <th className="p-2 border font-semibold text-right">IGST</th>}
                                            <th className="p-2 border font-semibold text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quote.items.map((item, index) => (
                                            <tr key={index} style={{ pageBreakInside: 'avoid' }}>
                                                <td className="p-2 border">{index + 1}</td>
                                                <td className="p-2 border">
                                                    {item.selectedItem?.name && (
                                                        <div className="font-medium">{item.selectedItem.name}</div>
                                                    )}
                                                    {item.description && (
                                                        <div className="text-sm text-gray-600">{item.description}</div>
                                                    )}
                                                    {!item.selectedItem?.name && !item.description && (
                                                        <div className="text-gray-400 italic text-sm">No item selected</div>
                                                    )}
                                                </td>
                                                <td className="p-2 border">{item.hsn}</td>
                                                <td className="p-2 border text-right">{formatQuantity(item.quantity)}</td>
                                                <td className="p-2 border text-right">{formatCurrency(item.rate)}</td>
                                                {quote.items.some(item => item.ratePerSqft) && <td className="p-2 border text-right">{item.ratePerSqft ? formatCurrency(item.ratePerSqft) : '-'}</td>}
                                                {quote.items.some(item => item.measurements) && <td className="p-2 border text-center">{item.measurements || '-'}</td>}
                                                {showCgstSgst && <td className="p-2 border text-right">{formatCurrency(item.cgstAmount)}<br/><span className="text-gray-500 text-xs">@{item.cgstRate}%</span></td>}
                                                {showCgstSgst && <td className="p-2 border text-right">{formatCurrency(item.sgstAmount)}<br/><span className="text-gray-500 text-xs">@{item.sgstRate}%</span></td>}
                                                {showIgst && <td className="p-2 border text-right">{formatCurrency(item.igstAmount)}<br/><span className="text-gray-500 text-xs">@{item.igstRate}%</span></td>}
                                                <td className="p-2 border text-right">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot style={{ display: 'table-footer-group' }}>
                                        <tr>
                                            <td colSpan={getColspan()} className="text-right p-2 border font-semibold">Sub Total</td>
                                            <td className="text-right p-2 border">{formatCurrency(subTotal)}</td>
                                        </tr>
                                        {showCgstSgst && (
                                            <>
                                                <tr>
                                                    <td colSpan={getColspan()} className="text-right p-2 border font-semibold">CGST</td>
                                                    <td className="text-right p-2 border">{formatCurrency(totalCgst)}</td>
                                                </tr>
                                                <tr>
                                                    <td colSpan={getColspan()} className="text-right p-2 border font-semibold">SGST</td>
                                                    <td className="text-right p-2 border">{formatCurrency(totalSgst)}</td>
                                                </tr>
                                            </>
                                        )}
                                        {showIgst && (
                                            <tr>
                                                <td colSpan={getColspan()} className="text-right p-2 border font-semibold">IGST</td>
                                                <td className="text-right p-2 border">{formatCurrency(totalIgst)}</td>
                                            </tr>
                                        )}
                                        {quote.discount?.value > 0 && (
                                            <tr>
                                                <td colSpan={getColspan()} className="text-right p-2 border font-semibold">Discount ({quote.discount.value}%)</td>
                                                <td className="text-right p-2 border">- {formatCurrency((quote.subTotal * quote.discount.value) / 100)}</td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td colSpan={getColspan()} className="text-right p-2 border font-semibold">Total</td>
                                            <td className="text-right p-2 border font-bold">{formatCurrency(grandTotal)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                                </div>
                            </td>
                        </tr>
                        
                        {/* Row 4: Totals, Notes, Terms, Signature */}
                        <tr className="footer-section">
                            <td className="align-top p-2" style={{ border: '1px solid #ccc' }}>
                                <div className="mb-2">
                                    <div className="font-semibold text-xs">Total In Words</div>
                                    <div className="italic text-gray-700">{totalInWords}</div>
                                </div>
                                <div className="mb-2">
                                    <div className="font-semibold text-xs">Notes</div>
                                    <div className="text-xs mt-1">{notes || quote.notes || 'Looking forward for your business.'}</div>
                                </div>
                                <div className="font-semibold text-xs mt-6 mb-1">Terms & Conditions</div>
                                <div className="whitespace-pre-line text-xs text-gray-700">
                                    {terms ? formatTermsAndConditions(terms) : 'Payment Terms: All invoices issued by the Company must be paid in full within 7 days from the date of the invoice. Late payments may incur additional charges or interest as permitted by applicable law.\n\nServices/Goods: The Company agrees to provide the goods or services as specified in the invoice or related agreement. The Client agrees to accept and pay for these goods or services in accordance with these terms.\n\nLate Payment: If payment is not received within the 15 days period, the Company reserves the right to suspend services, withhold delivery of goods, or pursue legal remedies to recover the outstanding amount.\n\nDisputes: Any disputes regarding the invoice or services must be reported in writing within 5 days of receiving the invoice. The Client agrees to pay any undisputed portion of the invoice within the 25-day payment period.'}
                                </div>
                            </td>
                            <td className="align-top p-2" style={{ border: '1px solid #ccc' }}>
                                <div className="flex flex-col gap-1 text-xs mb-8">
                                    <div className="flex justify-between"><span>Sub Total</span><span>{formatCurrency(subTotal)}</span></div>
                                    {discount > 0 && <div className="flex justify-between"><span>Discount(2.00%)</span><span>(-) {formatCurrency(discount)}</span></div>}
                                    {amountWithheld > 0 && <div className="flex justify-between"><span>Amount Withheld (Section 194 I)</span><span className="text-red-600">(-) {formatCurrency(amountWithheld)}</span></div>}
                                    <div className="flex justify-between font-bold border-t border-gray-300 pt-1 mt-1"><span>Total</span><span>₹{formatCurrency(grandTotal)}</span></div>
                                </div>
                                <div className="mt-8 text-right text-xs text-gray-700 signature-section" style={{borderTop: '1px solid #ccc', paddingTop: '4px'}}>
                                    <div>Authorized Signature</div>
                                    <div className="mt-2 font-semibold text-sm">{vendorName}</div>
                                    <div className="mt-8">
                                        <div className="border-t border-gray-400 w-32 ml-auto mb-2"></div>
                                        <div className="text-xs text-gray-500">Vendor/Client Signature</div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        
                        {/* Row 5: Page Number */}
                        <tr>
                           <td colSpan={2} className="text-right text-xs text-gray-400 p-2">1</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            {/* Extra padding to ensure signature section is captured */}
            <div style={{ height: '100px' }}></div>
        </div>
    );
} 