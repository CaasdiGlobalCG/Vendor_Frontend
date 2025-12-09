import React from "react";

const ArrowControls = ({ onScrollUp, onScrollDown, currentIndex, maxIndex }) => {
  return (
    <nav className="arrow-controls" aria-label="Gallery Navigation">
      <button 
        className={`arrow-button up ${currentIndex === 0 ? 'disabled' : ''}`}
        onClick={onScrollUp}
        aria-label="Scroll Up"
        disabled={currentIndex === 0}
      >
        <div className="arrow-right-circle" role="img" aria-hidden="true"></div>
      </button>
      
      <button 
        className={`arrow-button down ${currentIndex === maxIndex ? 'disabled' : ''}`}
        onClick={onScrollDown}
        aria-label="Scroll Down"
        disabled={currentIndex === maxIndex}
      >
        <div className="arrow-right-circle-4" role="img" aria-hidden="true"></div>
      </button>
    </nav>
  );
};

export default ArrowControls;
