import React from 'react';

const CalendarRenderer = ({ 
  selectedDate, 
  currentMonth, 
  setSelectedDate, 
  setCurrentMonth 
}) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="p-2"></div>);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const isSelected = selectedDate.toDateString() === date.toDateString();
    const isToday = new Date().toDateString() === date.toDateString();
    
    days.push(
      <div
        key={day}
        className={`p-2 text-center cursor-pointer hover:bg-info/10 ${
          isSelected ? 'bg-info text-white' : ''
        } ${isToday ? 'font-bold border border-info/30' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedDate(date);
        }}
      >
        {day}
      </div>
    );
  }
  
  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };
  
  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 bg-canvas p-3 rounded-lg">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigateMonth(-1);
          }}
          className="px-3 py-1 bg-surface-hover text-dim rounded hover:bg-surface-hover"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold text-ink">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigateMonth(1);
          }}
          className="px-3 py-1 bg-surface-hover text-dim rounded hover:bg-surface-hover"
        >
          →
        </button>
      </div>
      
      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-semibold text-dim text-sm">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 border border-line rounded-lg p-2 bg-surface">
        {days}
      </div>
      
      {/* Selected date display */}
      <div className="mt-3 text-center text-sm text-dim">
        Selected: {selectedDate.toLocaleDateString()}
      </div>
    </div>
  );
};

export default CalendarRenderer;



