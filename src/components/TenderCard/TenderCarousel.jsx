// src/components/TenderCard/TenderCarousel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TenderCard } from './TenderCard';

const TenderCarousel = ({ tenders = [], interval = 3000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef(null);

  // Auto-advance slides with pause control
  useEffect(() => {
    if (isPaused || tenders.length <= 1) return;
    
    timeoutRef.current = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % tenders.length);
    }, interval);

    return () => clearTimeout(timeoutRef.current);
  }, [currentIndex, isPaused, tenders.length, interval]);

  if (!Array.isArray(tenders) || tenders.length === 0) {
    return (
      <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-slate-50 p-4">
            <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">No tenders available</p>
          <p className="mt-1 text-xs text-slate-500">Check back later for new opportunities</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-700">Tender watch</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Upcoming opportunities</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev - 1 + tenders.length) % tenders.length)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
            aria-label="Previous tender"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % tenders.length)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
            aria-label="Next tender"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Carousel track */}
      <div 
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {tenders.map((tender, index) => (
          <div key={index} className="w-full flex-shrink-0">
            <TenderCard tender={tender} className="min-h-[240px]" />
          </div>
        ))}
      </div>

      {/* Navigation dots */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-400">
          {String(currentIndex + 1).padStart(2, '0')} / {String(tenders.length).padStart(2, '0')}
        </p>

        <div className="flex justify-center space-x-2">
        {tenders.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all ${index === currentIndex ? 'w-6 bg-emerald-600' : 'w-2 bg-slate-300'}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
        </div>
      </div>
    </div>
  );
};

export default TenderCarousel;