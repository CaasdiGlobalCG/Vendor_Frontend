import React, { useState, useRef } from 'react';
import { Download, Settings, Edit2, X, Upload } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import StandardPreview from '../shared/StandardPreview.jsx';
import operonLogo from '../../../../../assets/operon-symbol-black.png';
export default function CreditNotesPreviewPanel({ creditNotes, selectedCreditNoteId, onSelectCreditNote, onClose }) {
  const [selectedId, setSelectedId] = useState(selectedCreditNoteId || (creditNotes[0]?.id || creditNotes[0]?.creditNoteId));
  const [creditNotesWithCustomDetails, setCreditNotesWithCustomDetails] = useState(
    creditNotes.map(cn => ({
      ...cn,
      _customCompanyDetails: cn._customCompanyDetails || null
    }))
  );
  const [selectedCreditNote, setSelectedCreditNote] = useState(
    creditNotesWithCustomDetails.find(cn => cn.id === selectedId || cn.creditNoteId === selectedId)
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
      filename: `CreditNote-${selectedCreditNote?.customCreditNoteId || selectedCreditNote?.creditNoteNumber || selectedCreditNote?.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const handleDownloadClick = () => {
    handleDownloadPDF();
    setShowActionsMenu(false);
  };

  const handleEditCompanyClick = () => {
    setEditedCompany({
      logo: operonLogo,
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
    // Update the credit note in the creditNotesWithCustomDetails array
    const updatedCreditNotes = creditNotesWithCustomDetails.map(cn => {
      if ((cn.id === selectedCreditNote.id || cn.creditNoteId === selectedCreditNote.creditNoteId)) {
        return {
          ...cn,
          _customCompanyDetails: editedCompany
        };
      }
      return cn;
    });
    
    setCreditNotesWithCustomDetails(updatedCreditNotes);
    
    // Update the selected credit note
    const updatedSelectedCreditNote = updatedCreditNotes.find(
      cn => cn.id === selectedCreditNote.id || cn.creditNoteId === selectedCreditNote.creditNoteId
    );
    setSelectedCreditNote(updatedSelectedCreditNote);
    setShowEditModal(false);
  };

  const handleCreditNoteSelect = (cn) => {
    const creditNoteId = cn.id || cn.creditNoteId;
    setSelectedId(creditNoteId);
    
    // Get the credit note from creditNotesWithCustomDetails to preserve custom details
    const creditNoteFromState = creditNotesWithCustomDetails.find(
      creditNote => creditNote.id === creditNoteId || creditNote.creditNoteId === creditNoteId
    );
    setSelectedCreditNote(creditNoteFromState || cn);
    onSelectCreditNote && onSelectCreditNote(cn);
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
      {/* Left: Credit Notes List */}
      <div className="w-80 bg-canvas border-r border-line overflow-y-auto">
        <div className="p-4 font-bold text-lg border-b border-line">Credit Notes</div>
        <ul>
          {creditNotesWithCustomDetails.map(cn => (
            <li
              key={cn.id || cn.creditNoteId}
              className={`p-4 cursor-pointer border-b border-line hover:bg-surface-hover ${selectedId === (cn.id || cn.creditNoteId) ? 'bg-surface font-semibold' : ''}`}
              onClick={() => handleCreditNoteSelect(cn)}
            >
              <div>{cn.customCreditNoteId || cn.creditNoteNumber || cn.displayCreditNoteId || cn.id}</div>
              <div className="text-xs text-dim">{cn.customer}</div>
              <div className="text-xs text-dim">{cn.date}</div>
            </li>
          ))}
        </ul>
      </div>
      {/* Right: Credit Note Preview */}
      <div className="flex-1 bg-surface overflow-y-auto flex flex-col">
        {/* Action Header */}
        {selectedCreditNote && (
          <div className="sticky top-0 bg-surface border-b border-line p-4 flex items-center justify-between  z-10">
            <h3 className="font-semibold text-ink">Credit Note #{selectedCreditNote.customCreditNoteId || selectedCreditNote.creditNoteNumber || selectedCreditNote.id}</h3>
            <div className="flex items-center space-x-3">
              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                  title="Actions"
                >
                  <Settings className="w-5 h-5 text-dim" />
                </button>
                
                {/* Dropdown Menu */}
                {showActionsMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface border border-line rounded-lg shadow-lg z-20">
                    <button
                      onClick={handleDownloadClick}
                      className="w-full text-left px-4 py-3 hover:bg-canvas flex items-center space-x-2 text-ink hover:text-ink transition-colors border-b border-line"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download as PDF</span>
                    </button>
                    <button
                      onClick={handleEditCompanyClick}
                      className="w-full text-left px-4 py-3 hover:bg-canvas flex items-center space-x-2 text-ink hover:text-ink transition-colors"
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
                  className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-dim hover:text-ink"
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
          {selectedCreditNote ? (
            <div ref={previewRef}>
              <StandardPreview
                quote={selectedCreditNote}
                company={selectedCreditNote._customCompanyDetails || {
                  logo: operonLogo,
                  name: 'Caasdi Ventures LLP',
                  address: '262, 80 FEET ROAD, SRINIVASANAGAR, Banashankari Stage 1, Bengaluru, Karnataka, 560050',
                  gstin: '29AATFC6608I2ZB',
                  email: 'corporate@caasdiglobal.in',
                  country: 'India'
                }}
                terms={selectedCreditNote.termsAndConditions}
                notes={selectedCreditNote.customerNotes}
                docType="creditnote"
              />
            </div>
          ) : (
            <div className="p-8 text-dim">Select a credit note to preview.</div>
          )}
        </div>
      </div>

      {/* Edit Company Details Modal */}
      {showEditModal && editedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-ink">Edit Logo & Address</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-surface-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dim" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Company Logo</label>
                <div className="flex items-center space-x-3">
                  {editedCompany.logo && (
                    <img
                      src={editedCompany.logo}
                      alt="Logo preview"
                      className="w-16 h-16 object-contain rounded-lg border border-line"
                    />
                  )}
                  <label className="flex items-center space-x-2 px-4 py-2 bg-info/10 hover:bg-info/10 text-info rounded-lg cursor-pointer transition-colors border border-info/20">
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
                <label className="block text-sm font-medium text-ink mb-1">Company Name</label>
                <input
                  type="text"
                  value={editedCompany.name}
                  onChange={(e) => setEditedCompany({ ...editedCompany, name: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Address</label>
                <textarea
                  value={editedCompany.address}
                  onChange={(e) => setEditedCompany({ ...editedCompany, address: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
                  rows="3"
                />
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">GSTIN</label>
                <input
                  type="text"
                  value={editedCompany.gstin}
                  onChange={(e) => setEditedCompany({ ...editedCompany, gstin: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Email</label>
                <input
                  type="email"
                  value={editedCompany.email}
                  onChange={(e) => setEditedCompany({ ...editedCompany, email: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Country</label>
                <input
                  type="text"
                  value={editedCompany.country}
                  onChange={(e) => setEditedCompany({ ...editedCompany, country: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-ink bg-surface-hover hover:bg-surface-hover rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCompanyEdit}
                className="px-4 py-2 text-white bg-info hover:bg-info rounded-lg transition-colors"
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


