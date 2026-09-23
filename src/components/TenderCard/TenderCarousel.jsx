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
      <div className="rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-canvas p-4">
            <svg className="h-8 w-8 text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-ink">No tenders available</p>
          <p className="mt-1 text-xs text-dim">Check back later for new opportunities</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="vd-spotlight relative w-full overflow-hidden rounded-lg border border-line bg-surface p-4 sm:p-5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-dim">Tender watch</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">Upcoming opportunities</h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev - 1 + tenders.length) % tenders.length)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dim transition hover:bg-surface-hover hover:text-ink"
            aria-label="Previous tender"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % tenders.length)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dim transition hover:bg-surface-hover hover:text-ink"
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
        <p className="text-xs font-medium text-dim">
          {String(currentIndex + 1).padStart(2, '0')} / {String(tenders.length).padStart(2, '0')}
        </p>

        <div className="flex justify-center space-x-2">
        {tenders.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all ${index === currentIndex ? 'w-6 bg-cta' : 'w-2 bg-surface-hover'}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
        </div>
      </div>
    </div>
  );
};

export default TenderCarousel;