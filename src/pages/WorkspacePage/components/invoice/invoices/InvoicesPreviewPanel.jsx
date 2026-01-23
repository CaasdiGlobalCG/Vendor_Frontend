import React, { useContext, useState, useRef } from 'react';
import { Download, Send, Settings, Edit2, X, Upload } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import StandardPreview from '../shared/StandardPreview.jsx';
import { VendorContext } from '../../../../../context/VendorContext';

export default function QuotesPreviewPanel({ quotes, selectedQuoteId, onSelectQuote, onClose }) {
  const { currentUser: vendorUser } = useContext(VendorContext);
  const [selectedId, setSelectedId] = useState(selectedQuoteId || (quotes[0]?.id || quotes[0]?.quotationId));
  const [quotesWithCustomDetails, setQuotesWithCustomDetails] = useState(
    quotes.map(q => ({
      ...q,
      _customCompanyDetails: q._customCompanyDetails || null
    }))
  );
  const [selectedQuote, setSelectedQuote] = useState(
    quotesWithCustomDetails.find(q => q.id === selectedId || q.quotationId === selectedId)
  );
  const previewRef = useRef(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedCompany, setEditedCompany] = useState(null);

  const handleDownloadPDF = () => {
    if (!previewRef.current) return;
    
    const element = previewRef.current;
    const opt = {
      margin: 10,
      filename: `Quote-${selectedQuote?.customQuoteId || selectedQuote?.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const handleSendToPM = async () => {
    if (!selectedQuote) return;
    
    try {
      const storageUser = (() => {
        try {
          return JSON.parse(sessionStorage.getItem('vendor') || '{}');
        } catch {
          return {};
        }
      })();

      const currentUser = vendorUser || storageUser;
      const vendorId = currentUser?.vendorId || currentUser?.id;
      const invoiceId = selectedQuote.invoiceId || selectedQuote.id;

      console.log('📤 Sending invoice to PM:', invoiceId);

      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const response = await fetch(`/api/workspace/invoices/${invoiceId}/send-to-pm`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ vendorId })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Invoice sent to PM successfully');
        alert('Invoice sent to PM for review successfully!');
        setShowActionsMenu(false);
        // Refresh data if needed
        if (window.location.pathname.includes('invoice')) {
          window.location.reload();
        }
      } else {
        throw new Error(result.message || 'Failed to send invoice to PM');
      }
    } catch (error) {
      console.error('❌ Error sending invoice to PM:', error);
      alert('Failed to send invoice to PM: ' + error.message);
    }
  };

  const handleDownloadClick = () => {
    handleDownloadPDF();
    setShowActionsMenu(false);
  };

  const handleEditCompanyClick = () => {
    setEditedCompany({
      logo: 'https://dummyimage.com/80x80/0d6b5c/ffffff.png&text=CG',
      name: 'Caasdi Ventures LLP',
      address: '262, 80 FEET ROAD, SRINIVASANAGAR, Banashankari Stage 1, Bengaluru, Karnataka, 560050',
      gstin: '29AATFC6608I2ZB',
      email: 'corporate@caasdiglobal.in',
      country: 'India'
    });
    setShowEditModal(true);
    setShowActionsMenu(false);
  };

  const handleSaveCompanyEdit = () => {
    // Update the quote in the quotesWithCustomDetails array
    const updatedQuotes = quotesWithCustomDetails.map(q => {
      if ((q.id === selectedQuote.id || q.quotationId === selectedQuote.quotationId)) {
        return {
          ...q,
          _customCompanyDetails: editedCompany
        };
      }
      return q;
    });
    
    setQuotesWithCustomDetails(updatedQuotes);
    
    // Update the selected quote
    const updatedSelectedQuote = updatedQuotes.find(
      q => q.id === selectedQuote.id || q.quotationId === selectedQuote.quotationId
    );
    setSelectedQuote(updatedSelectedQuote);
    setShowEditModal(false);
  };

  const handleQuoteSelect = (q) => {
    const quoteId = q.id || q.quotationId;
    setSelectedId(quoteId);
    
    // Get the quote from quotesWithCustomDetails to preserve custom details
    const quoteFromState = quotesWithCustomDetails.find(
      quote => quote.id === quoteId || quote.quotationId === quoteId
    );
    setSelectedQuote(quoteFromState || q);
    onSelectQuote && onSelectQuote(q);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditedCompany({ ...editedCompany, logo: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Left: Quotes List */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 font-bold text-lg border-b border-gray-200">Quotes</div>
        <ul>
          {quotesWithCustomDetails.map(q => (
            <li
              key={q.id || q.quotationId}
              className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-100 ${selectedId === (q.id || q.quotationId) ? 'bg-white font-semibold' : ''}`}
              onClick={() => handleQuoteSelect(q)}
            >
              <div>{q.customQuoteId || q.quoteNumber || q.displayQuoteId || q.id}</div>
              <div className="text-xs text-gray-500">{q.customer}</div>
              <div className="text-xs text-gray-400">{q.date}</div>
            </li>
          ))}
        </ul>
      </div>
      {/* Right: Quote Preview */}
      <div className="flex-1 bg-white overflow-y-auto flex flex-col">
        {/* Action Header */}
        {selectedQuote && (
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10">
            <h3 className="font-semibold text-gray-900">Tax Invoice #{selectedQuote.customQuoteId || selectedQuote.id}</h3>
            <div className="flex items-center space-x-3">
              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Actions"
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                </button>
                
                {/* Dropdown Menu */}
                {showActionsMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <button
                      onClick={handleDownloadClick}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors border-b border-gray-100"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download as PDF</span>
                    </button>
                    <button
                      onClick={handleSendToPM}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors border-b border-gray-100"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send to PM</span>
                    </button>
                    <button
                      onClick={handleEditCompanyClick}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Logo & Address</span>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Close Button */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                  title="Close"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedQuote ? (
            <div ref={previewRef}>
              <StandardPreview
                quote={selectedQuote}
                company={selectedQuote._customCompanyDetails || {
                  logo: 'https://dummyimage.com/80x80/0d6b5c/ffffff.png&text=CG',
                  name: 'Caasdi Ventures LLP',
                  address: '262, 80 FEET ROAD, SRINIVASANAGAR, Banashankari Stage 1, Bengaluru, Karnataka, 560050',
                  gstin: '29AATFC6608I2ZB',
                  email: 'corporate@caasdiglobal.in',
                  country: 'India'
                }}
                terms={selectedQuote.termsAndConditions}
                notes={selectedQuote.customerNotes}
                docType="invoice"
              />
            </div>
          ) : (
            <div className="p-8 text-gray-400">Select a quote to preview.</div>
          )}
        </div>
      </div>

      {/* Edit Company Details Modal */}
      {showEditModal && editedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Logo & Address</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                <div className="flex items-center space-x-3">
                  {editedCompany.logo && (
                    <img
                      src={editedCompany.logo}
                      alt="Logo preview"
                      className="w-16 h-16 object-contain rounded-lg border border-gray-300"
                    />
                  )}
                  <label className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg cursor-pointer transition-colors border border-blue-200">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={editedCompany.name}
                  onChange={(e) => setEditedCompany({ ...editedCompany, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={editedCompany.address}
                  onChange={(e) => setEditedCompany({ ...editedCompany, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={editedCompany.gstin}
                  onChange={(e) => setEditedCompany({ ...editedCompany, gstin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editedCompany.email}
                  onChange={(e) => setEditedCompany({ ...editedCompany, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={editedCompany.country}
                  onChange={(e) => setEditedCompany({ ...editedCompany, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCompanyEdit}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
