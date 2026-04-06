import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Menu, X } from 'lucide-react';

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export default function PortfolioLayout({ children, companyName, accentColor = '#F5A623', downloadUrl }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showTOC, setShowTOC] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState('next');
  const [isDownloading, setIsDownloading] = useState(false);
  const allPagesRef = useRef(null);
  const touchStartRef = useRef(null);

  const pages = React.Children.toArray(children).filter(Boolean);
  const totalPages = pages.length;
  const pageTitles = pages.map((page, index) => page.props?.pageTitle || `Page ${index + 1}`);

  const goToPage = (index) => {
    if (index === currentPage || isAnimating) {
      return;
    }

    setDirection(index > currentPage ? 'next' : 'prev');
    setIsAnimating(true);

    window.setTimeout(() => {
      setCurrentPage(index);
      setIsAnimating(false);
    }, 300);

    setShowTOC(false);
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextPage();
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        prevPage();
      }
      if (event.key === 'Escape') {
        setShowTOC(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  const handleTouchStart = (event) => {
    touchStartRef.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartRef.current == null) {
      return;
    }

    const diff = touchStartRef.current - event.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      if (diff > 0) {
        nextPage();
      } else {
        prevPage();
      }
    }

    touchStartRef.current = null;
  };

  const downloadPortfolio = async () => {
    if (isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      if (!downloadUrl) {
        throw new Error('Portfolio download URL is not configured');
      }

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/pdf'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download portfolio (${response.status})`);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${companyName.replace(/\s+/g, '_')}_Portfolio.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download error:', error);
      window.alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="portfolio-root min-h-screen bg-gray-200 flex flex-col items-center relative"
      style={{ '--portfolio-accent': accentColor }}
    >
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
              {pageTitles.map((title, index) => (
                <button
                  key={index}
                  onClick={() => goToPage(index)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center gap-3 transition-all ${
                    currentPage === index ? 'text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={currentPage === index ? { backgroundColor: accentColor } : {}}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0"
                    style={currentPage === index ? { borderColor: 'white', color: 'white' } : { borderColor: accentColor, color: accentColor }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm">{title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
            <button
              onClick={downloadPortfolio}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              style={{ color: accentColor }}
              title="Download portfolio as PDF"
            >
              <Download size={18} />
              <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'Download'}</span>
            </button>
            <span className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ backgroundColor: accentColor }}>
              {currentPage + 1} / {totalPages}
            </span>
          </div>
        </div>
        <div className="h-0.5 bg-gray-200">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${totalPages ? ((currentPage + 1) / totalPages) * 100 : 0}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>

      <div className="portfolio-interactive-view mt-20 mb-24 px-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div
          className={`transition-all duration-300 ${
            isAnimating
              ? direction === 'next'
                ? 'opacity-0 translate-x-8'
                : 'opacity-0 -translate-x-8'
              : 'opacity-100 translate-x-0'
          }`}
        >
          <div
            className="a4-page bg-white shadow-2xl mx-auto overflow-hidden"
            style={{
              width: '100%',
              maxWidth: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_HEIGHT_PX}px`,
              aspectRatio: '210 / 297'
            }}
          >
            {pages[currentPage]}
          </div>
        </div>
      </div>

      <div ref={allPagesRef} aria-hidden="true" className="portfolio-print-root">
        {pages.map((page, index) => (
          <div
            key={page.key ?? index}
            data-portfolio-print-page
            className="portfolio-print-page a4-page bg-white overflow-hidden"
            style={{
              width: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_HEIGHT_PX}px`,
              maxWidth: `${A4_WIDTH_PX}px`
            }}
          >
            {page}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={prevPage}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
            style={{ color: currentPage === 0 ? '#999' : accentColor }}
          >
            <ChevronLeft size={18} /> Previous
          </button>
          <div className="hidden md:flex items-center gap-1.5">
            {pageTitles.map((_, index) => (
              <button
                key={index}
                onClick={() => goToPage(index)}
                className="w-2.5 h-2.5 rounded-full transition-all"
                style={{
                  backgroundColor: currentPage === index ? accentColor : '#D1D5DB',
                  transform: currentPage === index ? 'scale(1.3)' : 'scale(1)'
                }}
              />
            ))}
          </div>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
            style={{ color: currentPage === totalPages - 1 ? '#999' : accentColor }}
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
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
          box-shadow: 0 4px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
        }

        .portfolio-print-root {
          position: fixed;
          left: -20000px;
          top: 0;
          opacity: 0;
          pointer-events: none;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }

          .portfolio-root {
            background: white !important;
          }

          .portfolio-print-root,
          .portfolio-print-root * {
            visibility: visible !important;
          }

          .portfolio-print-root {
            position: absolute;
            left: 0 !important;
            top: 0 !important;
            opacity: 1 !important;
            pointer-events: auto;
            width: 100%;
          }

          .portfolio-print-page {
            margin: 0 auto;
            break-after: page;
            page-break-after: always;
          }

          .portfolio-print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .portfolio-interactive-view {
            display: none !important;
          }

          .a4-page {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
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
