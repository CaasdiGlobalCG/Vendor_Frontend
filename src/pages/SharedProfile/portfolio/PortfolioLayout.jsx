import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Menu, X, Download, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

// A4 aspect ratio: 210mm x 297mm = 1:1.4143
const A4_WIDTH_PX = 794; // ~210mm at 96dpi
const A4_HEIGHT_PX = 1123; // ~297mm at 96dpi

/**
 * Magazine-style portfolio layout with A4-sized pages and PDF download.
 */
export default function PortfolioLayout({ children, companyName, accentColor = '#F5A623' }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showTOC, setShowTOC] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState('next');
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef(null);
  const pdfContainerRef = useRef(null);

  const pages = React.Children.toArray(children).filter(Boolean);
  const totalPages = pages.length;

  const goToPage = (index) => {
    if (index === currentPage || isAnimating) return;
    setDirection(index > currentPage ? 'next' : 'prev');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentPage(index);
      setIsAnimating(false);
    }, 300);
    setShowTOC(false);
  };

  const nextPage = () => { if (currentPage < totalPages - 1) goToPage(currentPage + 1); };
  const prevPage = () => { if (currentPage > 0) goToPage(currentPage - 1); };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage();
      if (e.key === 'Escape') setShowTOC(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentPage, totalPages]);

  const touchStart = useRef(null);
  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) { diff > 0 ? nextPage() : prevPage(); }
    touchStart.current = null;
  };

  const pageTitles = pages.map((page, i) => page.props?.pageTitle || `Page ${i + 1}`);

  // PDF Download
  const handleDownloadPDF = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const container = pdfContainerRef.current;
      if (!container) return;

      // Make the hidden PDF container visible for rendering
      container.style.display = 'block';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';

      // Wait for images/charts to render
      await new Promise(r => setTimeout(r, 500));

      const opt = {
        margin: 0,
        filename: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Portfolio.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          width: A4_WIDTH_PX,
          windowWidth: A4_WIDTH_PX,
          logging: false,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'], before: '.pdf-page-break' },
      };

      await html2pdf().set(opt).from(container).save();
      container.style.display = 'none';
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [companyName, isDownloading]);

  return (
    <div className="portfolio-root min-h-screen bg-gray-200 flex flex-col items-center relative"
      style={{ '--portfolio-accent': accentColor }}>

      {/* ===== TABLE OF CONTENTS SIDEBAR ===== */}
      {showTOC && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTOC(false)} />
          <div className="relative bg-white w-80 max-w-[85vw] h-full shadow-2xl z-10 overflow-y-auto animate-slide-in-left">
            <div className="p-6 border-b" style={{ backgroundColor: accentColor }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Table of Contents</h2>
                <button onClick={() => setShowTOC(false)} className="text-white/80 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-1">{companyName}</p>
            </div>
            <div className="p-4">
              {pageTitles.map((title, i) => (
                <button key={i} onClick={() => goToPage(i)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center gap-3 transition-all ${
                    currentPage === i ? 'text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={currentPage === i ? { backgroundColor: accentColor } : {}}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0"
                    style={currentPage === i ? { borderColor: 'white', color: 'white' } : { borderColor: accentColor, color: accentColor }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm">{title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== TOP NAVIGATION BAR ===== */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowTOC(true)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Menu size={20} className="text-gray-700" />
            </button>
            <div className="h-5 w-px bg-gray-300" />
            <span className="font-bold text-gray-900 text-sm tracking-wide">{companyName}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-60 hover:opacity-90"
              style={{ backgroundColor: accentColor }}>
              {isDownloading ? (
                <><Loader2 size={16} className="animate-spin" /> Generating...</>
              ) : (
                <><Download size={16} /> Download PDF</>
              )}
            </button>
            <span className="text-xs font-semibold px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: accentColor }}>
              {currentPage + 1} / {totalPages}
            </span>
          </div>
        </div>
        <div className="h-0.5 bg-gray-200">
          <div className="h-full transition-all duration-500 ease-out"
            style={{ width: `${((currentPage + 1) / totalPages) * 100}%`, backgroundColor: accentColor }} />
        </div>
      </div>

      {/* ===== MAIN A4 PAGE (Interactive View) ===== */}
      <div ref={containerRef}
        className="mt-20 mb-24 px-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>
        <div className={`transition-all duration-300 ${isAnimating ? (direction === 'next' ? 'opacity-0 translate-x-8' : 'opacity-0 -translate-x-8') : 'opacity-100 translate-x-0'}`}>
          <div className="a4-page bg-white shadow-2xl mx-auto overflow-hidden"
            style={{
              width: '100%',
              maxWidth: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_HEIGHT_PX}px`,
              aspectRatio: '210 / 297',
            }}>
            {pages[currentPage]}
          </div>
        </div>
      </div>

      {/* ===== BOTTOM NAVIGATION ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={prevPage} disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
            style={{ color: currentPage === 0 ? '#999' : accentColor }}>
            <ChevronLeft size={18} /> Previous
          </button>
          <div className="hidden md:flex items-center gap-1.5">
            {pageTitles.map((_, i) => (
              <button key={i} onClick={() => goToPage(i)}
                className="w-2.5 h-2.5 rounded-full transition-all"
                style={{ backgroundColor: currentPage === i ? accentColor : '#D1D5DB', transform: currentPage === i ? 'scale(1.3)' : 'scale(1)' }} />
            ))}
          </div>
          <button onClick={nextPage} disabled={currentPage === totalPages - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
            style={{ color: currentPage === totalPages - 1 ? '#999' : accentColor }}>
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ===== HIDDEN PDF CONTAINER (all pages stacked for PDF export) ===== */}
      <div ref={pdfContainerRef} style={{ display: 'none' }} className="pdf-export-container">
        {pages.map((page, i) => (
          <div key={i} className={`pdf-page bg-white ${i > 0 ? 'pdf-page-break' : ''}`}
            style={{
              width: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_HEIGHT_PX}px`,
              overflow: 'hidden',
              pageBreakBefore: i > 0 ? 'always' : 'auto',
              boxSizing: 'border-box',
            }}>
            {page}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.3s ease-out;
        }
        .a4-page {
          border-radius: 2px;
          box-shadow: 0 4px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
        }
        .pdf-page-break {
          page-break-before: always;
        }
        @media print {
          .portfolio-root { background: white !important; }
          .a4-page { box-shadow: none !important; }
        }
        @media (max-width: 840px) {
          .a4-page {
            min-height: auto !important;
            aspect-ratio: 210 / 297;
          }
        }
      `}</style>
    </div>
  );
}
