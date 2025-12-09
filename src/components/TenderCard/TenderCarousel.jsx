// src/components/TenderCard/TenderCarousel.jsx
import React, { useState, useEffect, useRef } from 'react';
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

  if (!Array.isArray(tenders) || tenders.length === 0) return null;

  return (
    <div 
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Carousel track */}
      <div 
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {tenders.map((tender, index) => (
          <div key={index} className="w-full flex-shrink-0 px-2">
            <TenderCard tender={tender} className="min-h-[180px]" />
          </div>
        ))}
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {tenders.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${index === currentIndex ? 'bg-gray-600 w-4' : 'bg-gray-300'}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default TenderCarousel;