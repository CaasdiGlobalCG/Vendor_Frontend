import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, FileText, DollarSign, Download, RefreshCw } from 'lucide-react';
import boqAggregator from './boq-engine/boqAggregator.js';

/**
 * BOQGenerator
 * 
 * Props:
 *  - onGenerate(boqData, costBreakdown): called after user fills form and clicks Generate.
 *    Parent should store the data and render <BOQTableDisplay />.
 *  - onClose(): called when modal is dismissed without generating.
 *  - show: boolean controlling modal visibility.
 */

/* ─────────── Reusable sub-components (module scope to avoid re-mount) ─────────── */
const BOQInput = ({ label, value, onChange, type = 'text', step = 'any' }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
    <input type={type} value={value} onChange={onChange} step={step}
      onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
      autoComplete="off"
      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
  </div>
);

const BOQSelect = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
    <select value={value} onChange={onChange}
      onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const BOQChk = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer py-1">
    <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded accent-blue-600" />
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </label>
);

const BOQTab = ({ label, active, onClick }) => (
  <button onClick={onClick}
    className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition border-b-2 ${
      active ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 bg-white hover:text-gray-800 hover:bg-gray-50'}`}>
    {label}
  </button>
);

/* ─────────────── INPUT MODAL (portaled to body) ─────────────── */
const BOQInputModal = ({ show, onClose, onGenerate }) => {
  const [activeTab, setActiveTab] = useState('project');

  const [formData, setFormData] = useState({
    projectName: '', projectDescription: '', clientName: '',
    includeExcavation: true, includeConcrete: true, includeSteel: true,
    includeMasonry: true, includePlaster: true, includeFlooring: true,
    overheadPercent: 10, contingencyPercent: 5, gstPercent: 18
  });
  const [excavationData, setExcavationData] = useState({
    numberOfFootings: 4, footingLength: 1.5, footingWidth: 1.5,
    excavationDepth: 1.2, soilType: 'medium',
    numberOfTrenches: 2, trenchLength: 20, trenchWidth: 0.6, trenchDepth: 1.0
  });
  const [concreteData, setConcreteData] = useState({
    slabLength: 0, slabWidth: 0, slabThickness: 0.15,
    beamLength: 0, beamWidth: 0.25, beamDepth: 0.5,
    numberOfColumns: 0, columnWidth: 0.4, columnDepth: 0.35,
    footingLength: 1.5, footingWidth: 1.5, footingDepth: 0.6,
    concreteGrade: 'M20', wastagePercent: 5
  });
  const [steelData, setSteelData] = useState({
    mode: 'percentage', totalConcretevolume: 0, percentageValue: 100, wastagePercent: 3
  });
  const [masonryData, setMasonryData] = useState({
    interiorWallArea: 0, exteriorWallArea: 0, deductionsArea: 0
  });
  const [plasterData, setPlasterData] = useState({
    interiorWallArea: 0, exteriorWallArea: 0, deductionsArea: 0,
    internalThickness: 0.012, externalThickness: 0.020
  });
  const [flooringData, setFlooringData] = useState({
    carpetArea: 0, tileSize: 'medium', installationType: 'mortar-bed',
    flooringType: 'ceramic', wastagePercent: 10
  });

  const handleGenerate = () => {
    try {
      const boqParams = {
        projectName: formData.projectName || 'Untitled Project',
        projectDescription: formData.projectDescription,
        clientName: formData.clientName,
        excavationParams: formData.includeExcavation ? excavationData : null,
        concreteParams: formData.includeConcrete ? concreteData : null,
        steelParams: formData.includeSteel ? steelData : null,
        masonryParams: formData.includeMasonry ? masonryData : null,
        plasterParams: formData.includePlaster ? plasterData : null,
        flooringParams: formData.includeFlooring ? flooringData : null
      };
      const boq = boqAggregator.aggregateAllModules(boqParams);
      const cost = boqAggregator.calculateBOQCost(boq, {
        overheadPercent: formData.overheadPercent,
        contingencyPercent: formData.contingencyPercent,
        gstPercent: formData.gstPercent
      });
      onGenerate(boq, cost);
    } catch (err) {
      alert('Error generating BOQ: ' + err.message);
    }
  };

  if (!show) return null;

  const tabOrder = ['project', 'excavation', 'concrete', 'steel', 'masonry', 'plaster', 'flooring', 'costs'];
  const currentTabIndex = tabOrder.indexOf(activeTab);
  const isLastTab = currentTabIndex === tabOrder.length - 1;

  const handleNext = () => {
    if (currentTabIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentTabIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabOrder[currentTabIndex - 1]);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl w-[95vw] max-w-5xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><FileText size={22} /> Bill of Quantities Generator</h2>
            <p className="text-xs text-blue-100 mt-1">Step {currentTabIndex + 1} of {tabOrder.length} • {(['Project Details', 'Excavation', 'Concrete', 'Steel', 'Masonry', 'Plaster', 'Flooring', 'Costs'][currentTabIndex])}</p>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-2 rounded-lg transition"><X size={22} /></button>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-blue-100">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${((currentTabIndex + 1) / tabOrder.length) * 100}%` }}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 flex gap-0 px-2 py-0 overflow-x-auto">
          <BOQTab label="Project" active={activeTab === 'project'} onClick={() => setActiveTab('project')} />
          <BOQTab label="Excavation" active={activeTab === 'excavation'} onClick={() => setActiveTab('excavation')} />
          <BOQTab label="Concrete" active={activeTab === 'concrete'} onClick={() => setActiveTab('concrete')} />
          <BOQTab label="Steel" active={activeTab === 'steel'} onClick={() => setActiveTab('steel')} />
          <BOQTab label="Masonry" active={activeTab === 'masonry'} onClick={() => setActiveTab('masonry')} />
          <BOQTab label="Plaster" active={activeTab === 'plaster'} onClick={() => setActiveTab('plaster')} />
          <BOQTab label="Flooring" active={activeTab === 'flooring'} onClick={() => setActiveTab('flooring')} />
          <BOQTab label="Costs" active={activeTab === 'costs'} onClick={() => setActiveTab('costs')} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-gray-50">
          {activeTab === 'project' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-4">Project Information</h3>
                <div className="space-y-3">
                  <BOQInput label="Project Name" value={formData.projectName}
                    onChange={e => setFormData({ ...formData, projectName: e.target.value })} />
                  <BOQInput label="Project Description" value={formData.projectDescription}
                    onChange={e => setFormData({ ...formData, projectDescription: e.target.value })} />
                  <BOQInput label="Client Name" value={formData.clientName}
                    onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
                </div>
              </div>
              <div className="border-t pt-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4">Include Sections</h3>
                <div className="grid grid-cols-2 gap-2">
                  <BOQChk label="Excavation" checked={formData.includeExcavation}
                    onChange={e => setFormData({ ...formData, includeExcavation: e.target.checked })} />
                  <BOQChk label="Concrete" checked={formData.includeConcrete}
                    onChange={e => setFormData({ ...formData, includeConcrete: e.target.checked })} />
                  <BOQChk label="Steel" checked={formData.includeSteel}
                    onChange={e => setFormData({ ...formData, includeSteel: e.target.checked })} />
                  <BOQChk label="Masonry" checked={formData.includeMasonry}
                    onChange={e => setFormData({ ...formData, includeMasonry: e.target.checked })} />
                  <BOQChk label="Plaster" checked={formData.includePlaster}
                    onChange={e => setFormData({ ...formData, includePlaster: e.target.checked })} />
                  <BOQChk label="Flooring" checked={formData.includeFlooring}
                    onChange={e => setFormData({ ...formData, includeFlooring: e.target.checked })} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'excavation' && (
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <BOQInput label="Number of Footings" type="number" value={excavationData.numberOfFootings}
                onChange={e => setExcavationData({ ...excavationData, numberOfFootings: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Footing Length (m)" type="number" step="0.1" value={excavationData.footingLength}
                onChange={e => setExcavationData({ ...excavationData, footingLength: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Footing Width (m)" type="number" step="0.1" value={excavationData.footingWidth}
                onChange={e => setExcavationData({ ...excavationData, footingWidth: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Excavation Depth (m)" type="number" step="0.1" value={excavationData.excavationDepth}
                onChange={e => setExcavationData({ ...excavationData, excavationDepth: parseFloat(e.target.value) || 0 })} />
              <BOQSelect label="Soil Type" value={excavationData.soilType}
                onChange={e => setExcavationData({ ...excavationData, soilType: e.target.value })}
                options={[{ value: 'loose', label: 'Loose (10%)' }, { value: 'medium', label: 'Medium (20%)' }, { value: 'hard', label: 'Hard (30%)' }]} />
            </div>
          )}

          {activeTab === 'concrete' && (
            <div className="grid grid-cols-2 gap-4">
              <BOQInput label="Slab Length (m)" type="number" step="0.1" value={concreteData.slabLength}
                onChange={e => setConcreteData({ ...concreteData, slabLength: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Slab Width (m)" type="number" step="0.1" value={concreteData.slabWidth}
                onChange={e => setConcreteData({ ...concreteData, slabWidth: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Slab Thickness (m)" type="number" step="0.01" value={concreteData.slabThickness}
                onChange={e => setConcreteData({ ...concreteData, slabThickness: parseFloat(e.target.value) || 0 })} />
              <BOQSelect label="Concrete Grade" value={concreteData.concreteGrade}
                onChange={e => setConcreteData({ ...concreteData, concreteGrade: e.target.value })}
                options={[{ value: 'M10', label: 'M10' }, { value: 'M15', label: 'M15' }, { value: 'M20', label: 'M20' }, { value: 'M25', label: 'M25' }]} />
              <BOQInput label="Number of Columns" type="number" value={concreteData.numberOfColumns}
                onChange={e => setConcreteData({ ...concreteData, numberOfColumns: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Wastage (%)" type="number" step="0.1" value={concreteData.wastagePercent}
                onChange={e => setConcreteData({ ...concreteData, wastagePercent: parseFloat(e.target.value) || 0 })} />
            </div>
          )}

          {activeTab === 'steel' && (
            <div className="space-y-4">
              <BOQSelect label="Calculation Mode" value={steelData.mode}
                onChange={e => setSteelData({ ...steelData, mode: e.target.value })}
                options={[{ value: 'percentage', label: 'Percentage (kg/m³)' }, { value: 'element', label: 'Element-wise' }]} />
              <BOQInput label="Total Concrete Volume (m³)" type="number" step="0.1" value={steelData.totalConcretevolume}
                onChange={e => setSteelData({ ...steelData, totalConcretevolume: parseFloat(e.target.value) || 0 })} />
              <BOQInput label={steelData.mode === 'percentage' ? 'Steel Rate (kg/m³)' : 'Base Steel (kg)'}
                type="number" step="0.1" value={steelData.percentageValue}
                onChange={e => setSteelData({ ...steelData, percentageValue: parseFloat(e.target.value) || 0 })} />
            </div>
          )}

          {activeTab === 'masonry' && (
            <div className="grid grid-cols-2 gap-4">
              <BOQInput label="Interior Wall Area (m²)" type="number" step="0.1" value={masonryData.interiorWallArea}
                onChange={e => setMasonryData({ ...masonryData, interiorWallArea: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Exterior Wall Area (m²)" type="number" step="0.1" value={masonryData.exteriorWallArea}
                onChange={e => setMasonryData({ ...masonryData, exteriorWallArea: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Deductions Area (m²)" type="number" step="0.1" value={masonryData.deductionsArea}
                onChange={e => setMasonryData({ ...masonryData, deductionsArea: parseFloat(e.target.value) || 0 })} />
            </div>
          )}

          {activeTab === 'plaster' && (
            <div className="grid grid-cols-2 gap-4">
              <BOQInput label="Interior Wall Area (m²)" type="number" step="0.1" value={plasterData.interiorWallArea}
                onChange={e => setPlasterData({ ...plasterData, interiorWallArea: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Exterior Wall Area (m²)" type="number" step="0.1" value={plasterData.exteriorWallArea}
                onChange={e => setPlasterData({ ...plasterData, exteriorWallArea: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Internal Thickness (m)" type="number" step="0.001" value={plasterData.internalThickness}
                onChange={e => setPlasterData({ ...plasterData, internalThickness: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="External Thickness (m)" type="number" step="0.001" value={plasterData.externalThickness}
                onChange={e => setPlasterData({ ...plasterData, externalThickness: parseFloat(e.target.value) || 0 })} />
            </div>
          )}

          {activeTab === 'flooring' && (
            <div className="grid grid-cols-2 gap-4">
              <BOQInput label="Carpet Area (m²)" type="number" step="0.1" value={flooringData.carpetArea}
                onChange={e => setFlooringData({ ...flooringData, carpetArea: parseFloat(e.target.value) || 0 })} />
              <BOQSelect label="Tile Size" value={flooringData.tileSize}
                onChange={e => setFlooringData({ ...flooringData, tileSize: e.target.value })}
                options={[{ value: 'small', label: '200×200mm' }, { value: 'medium', label: '300×300mm' }, { value: 'large', label: '600×600mm' }, { value: 'extra', label: '800×800mm' }]} />
              <BOQSelect label="Installation" value={flooringData.installationType}
                onChange={e => setFlooringData({ ...flooringData, installationType: e.target.value })}
                options={[{ value: 'glue-down', label: 'Glue-down' }, { value: 'mortar-bed', label: 'Mortar Bed' }, { value: 'floating', label: 'Floating' }]} />
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="grid grid-cols-2 gap-4">
              <BOQInput label="Overhead (%)" type="number" step="0.1" value={formData.overheadPercent}
                onChange={e => setFormData({ ...formData, overheadPercent: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="Contingency (%)" type="number" step="0.1" value={formData.contingencyPercent}
                onChange={e => setFormData({ ...formData, contingencyPercent: parseFloat(e.target.value) || 0 })} />
              <BOQInput label="GST (%)" type="number" step="0.1" value={formData.gstPercent}
                onChange={e => setFormData({ ...formData, gstPercent: parseFloat(e.target.value) || 0 })} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm transition">
            Cancel
          </button>
          <div className="flex gap-3">
            {currentTabIndex > 0 && (
              <button onClick={handleBack}
                className="px-5 py-2 rounded-lg font-semibold bg-gray-500 hover:bg-gray-600 text-white text-sm transition">
                ← Back
              </button>
            )}
            {!isLastTab ? (
              <button onClick={handleNext}
                className="px-6 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-sm hover:shadow-md">
                Next →
              </button>
            ) : (
              <button onClick={handleGenerate}
                className="px-6 py-2 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm flex items-center gap-2 transition shadow-sm hover:shadow-md">
                <FileText size={16} /> Generate BOQ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};


/* ─────────── BOQ TABLE DISPLAY (rendered inline in node) ─────────── */
const BOQTableDisplay = ({ boqData, costBreakdown, onRegenerate }) => {
  if (!boqData) return null;

  const { projectInfo, sections } = boqData;
  let serial = 0;

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate">{projectInfo.projectName || 'BOQ'}</h3>
          {projectInfo.clientName && <p className="text-xs text-blue-100 truncate">{projectInfo.clientName}</p>}
        </div>
        <button onClick={onRegenerate} title="Edit BOQ"
          className="ml-2 hover:bg-blue-500 p-1 rounded transition-colors flex-shrink-0">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Scrollable Table Container - allows flexible height */}
      <div className="overflow-auto" style={{ maxHeight: '600px' }}>
        <table className="w-full border-collapse min-w-[550px]">
          <thead className="sticky top-0">
            <tr className="bg-gray-700 text-white">
              <th className="border border-gray-500 px-1.5 py-1 text-left font-semibold text-xs w-10">S#</th>
              <th className="border border-gray-500 px-1.5 py-1 text-left font-semibold text-xs">Description</th>
              <th className="border border-gray-500 px-1.5 py-1 text-right font-semibold text-xs w-14">Qty</th>
              <th className="border border-gray-500 px-1.5 py-1 text-center font-semibold text-xs w-12">Unit</th>
              <th className="border border-gray-500 px-1.5 py-1 text-right font-semibold text-xs w-16">Rate</th>
              <th className="border border-gray-500 px-1.5 py-1 text-right font-semibold text-xs w-16">Amount</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {sections.map((section) => (
              <React.Fragment key={section.sectionNo}>
                {/* Section Header */}
                <tr className="bg-blue-100 hover:bg-blue-150">
                  <td colSpan={6} className="border border-gray-300 px-2 py-1 font-bold text-blue-900">
                    {section.sectionNo}. {section.sectionName}
                  </td>
                </tr>
                {/* Items */}
                {section.items.map((item, idx) => {
                  serial++;
                  const amount = (item.quantity || 0) * (item.rate || 0);
                  return (
                    <tr key={idx} className={`${serial % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}>
                      <td className="border border-gray-300 px-1.5 py-0.5 text-center font-medium text-gray-700">{serial}</td>
                      <td className="border border-gray-300 px-1.5 py-0.5 text-gray-800">{item.description}</td>
                      <td className="border border-gray-300 px-1.5 py-0.5 text-right font-semibold text-gray-700">{(item.quantity || 0).toFixed(2)}</td>
                      <td className="border border-gray-300 px-1.5 py-0.5 text-center text-gray-700">{item.unit}</td>
                      <td className="border border-gray-300 px-1.5 py-0.5 text-right text-gray-700">{(item.rate || 0).toLocaleString('en-IN')}</td>
                      <td className="border border-gray-300 px-1.5 py-0.5 text-right font-semibold text-green-700">{amount.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cost Summary */}
      {costBreakdown && (
        <div className="bg-gray-50 border-t border-gray-300">
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="bg-white border-b border-gray-300">
                <td className="px-2 py-1 font-semibold text-gray-800 col-span-5">Subtotal</td>
                <td className="px-2 py-1 text-right font-bold text-gray-900">₹{costBreakdown.itemsCost.subtotal.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-300">
                <td className="px-2 py-0.5 text-gray-600">Overhead ({costBreakdown.overhead.overheadPercent}%)</td>
                <td className="px-2 py-0.5 text-right text-gray-700">₹{costBreakdown.overhead.overheadAmount.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-300">
                <td className="px-2 py-0.5 text-gray-600">Contingency ({costBreakdown.overhead.contingencyPercent}%)</td>
                <td className="px-2 py-0.5 text-right text-gray-700">₹{costBreakdown.overhead.contingencyAmount.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-300">
                <td className="px-2 py-0.5 text-gray-600">GST ({costBreakdown.gst.gstPercent}%)</td>
                <td className="px-2 py-0.5 text-right text-gray-700">₹{costBreakdown.gst.gstAmount.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="bg-green-600 text-white">
                <td className="px-2 py-1.5 font-bold text-sm">GRAND TOTAL</td>
                <td className="px-2 py-1.5 text-right font-bold text-sm">₹{costBreakdown.summary.grandTotal.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Export Footer */}
      <div className="bg-gray-100 px-2 py-2 flex justify-end gap-1.5 border-t border-gray-300">
        <button onClick={() => boqAggregator.exportToExcel(boqData, costBreakdown)}
          className="px-2.5 py-1 rounded text-xs font-semibold bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 transition-colors">
          <Download size={11} /> XLS
        </button>
        <button onClick={() => boqAggregator.exportToPDF(boqData, costBreakdown)}
          className="px-2.5 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 transition-colors">
          <Download size={11} /> PDF
        </button>
      </div>
    </div>
  );
};


/* ─────────── MAIN COMPONENT (used in ElementNode) ─────────── */
const BOQGenerator = ({ onClose }) => {
  const [showModal, setShowModal] = useState(true); // auto-open on mount
  const [boqData, setBOQData] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const tableContainerRef = React.useRef(null);

  const handleGenerate = (boq, cost) => {
    setBOQData(boq);
    setCostBreakdown(cost);
    setShowModal(false); // close modal, show table inline
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (!boqData && onClose) onClose(); // no data generated, close element
  };

  const handleRegenerate = () => {
    setShowModal(true); // re-open modal
  };

  // Auto-fit content using ResizeObserver for better layout
  React.useEffect(() => {
    if (!boqData || !tableContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // ResizeObserver monitors content size - ReactFlow node will expand gracefully
    });

    resizeObserver.observe(tableContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [boqData]);

  // If no data yet and modal is closed, show placeholder
  if (!boqData && !showModal) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-lg border-2 border-blue-200 min-h-[140px] shadow-sm">
        <div className="bg-blue-100 p-3 rounded-full mb-3">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Bill of Quantities</h3>
        <p className="text-xs text-gray-500 mb-4">Click to generate a professional BOQ</p>
        <button onClick={() => setShowModal(true)}
          className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg">
          Generate BOQ
        </button>
      </div>
    );
  }

  return (
    <div ref={tableContainerRef} className="w-full">
      {/* Inline table (when data exists) */}
      {boqData && (
        <BOQTableDisplay boqData={boqData} costBreakdown={costBreakdown} onRegenerate={handleRegenerate} />
      )}

      {/* Portaled modal (for input) */}
      <BOQInputModal show={showModal} onClose={handleCloseModal} onGenerate={handleGenerate} />
    </div>
  );
};

export default BOQGenerator;
