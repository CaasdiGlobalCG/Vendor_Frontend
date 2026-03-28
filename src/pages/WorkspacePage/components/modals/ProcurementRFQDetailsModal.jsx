import React from 'react';
import { X, ClipboardList, Package, Truck, Building2, IndianRupee } from 'lucide-react';

const Row = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-sm text-gray-900 break-words">{value || '-'}</p>
  </div>
);

const ProcurementRFQDetailsModal = ({ isOpen, onClose, nodeData }) => {
  if (!isOpen || !nodeData) return null;

  const rfq = nodeData.procurementRFQData || {};
  const form = rfq.rfqFormData || {};
  const request = rfq.request || {};

  const product = form.productDetails || {};
  const quantityPricing = form.quantityPricing || {};
  const trade = form.tradeLogistics || {};
  const supplier = form.supplierRequirements || {};
  const notes = form.attachmentsAndNotes || {};

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-600" />
              Procurement RFQ Details
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Request ID: {request.requestId || '-'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-200"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section className="rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-gray-600" />
              Product and RFQ Basics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Row label="RFQ Title" value={product.title} />
              <Row label="Category" value={product.category} />
              <Row label="Product Name" value={product.productName || request.item} />
              <Row label="Brand Preference" value={product.brandPreference} />
              <Row label="Description" value={product.productDescription} />
              <Row label="Technical Specifications" value={product.technicalSpecifications} />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <IndianRupee className="w-4 h-4 text-gray-600" />
              Quantity and Pricing
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Row label="Quantity" value={`${quantityPricing.quantity || request.quantity || '-'} ${quantityPricing.quantityUnit || ''}`.trim()} />
              <Row label="Pricing Type" value={quantityPricing.pricingType} />
              <Row label="Currency" value={quantityPricing.currency} />
              <Row label="Budget Min" value={quantityPricing.budgetMin} />
              <Row label="Budget Max" value={quantityPricing.budgetMax} />
              <Row label="Estimated Amount" value={request.amount} />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-gray-600" />
              Trade and Logistics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Row label="Incoterm" value={trade.incoterm} />
              <Row label="Shipping Method" value={trade.shippingMethod} />
              <Row label="Delivery Location" value={trade.deliveryLocation} />
              <Row label="Required By" value={trade.requiredByDate || request.requiredByDate} />
              <Row label="Packaging Requirements" value={trade.packagingRequirements} />
              <Row label="Priority" value={request.priority} />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gray-600" />
              Supplier Requirements
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Row label="Minimum Experience" value={supplier.minimumExperienceYears ? `${supplier.minimumExperienceYears} years` : ''} />
              <Row label="Minimum Rating" value={supplier.minimumRating} />
              <Row label="Required Certifications" value={supplier.requiredCertifications} />
              <Row label="Preferred Regions" value={supplier.preferredRegions} />
              <Row label="Payment Terms" value={supplier.paymentTerms} />
              <Row label="Warranty" value={supplier.warrantyRequirement} />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Attachments and Notes</h4>
            <div className="space-y-3 text-sm text-gray-800">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Attachments</p>
                <div className="mt-1">
                  {(notes.attachmentNames || []).length > 0 ? (
                    (notes.attachmentNames || []).map((fileName) => (
                      <p key={fileName} className="text-sm text-gray-900">{fileName}</p>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No attachments added</p>
                  )}
                </div>
              </div>
              <Row label="Additional Notes" value={notes.notes} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProcurementRFQDetailsModal;
