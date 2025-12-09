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
        className={`p-2 text-center cursor-pointer hover:bg-blue-100 ${
          isSelected ? 'bg-blue-500 text-white' : ''
        } ${isToday ? 'font-bold border border-blue-300' : ''}`}
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
      <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigateMonth(-1);
          }}
          className="px-3 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold text-gray-800">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigateMonth(1);
          }}
          className="px-3 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
        >
          →
        </button>
      </div>
      
      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-semibold text-gray-600 text-sm">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 border border-gray-300 rounded-lg p-2 bg-white">
        {days}
      </div>
      
      {/* Selected date display */}
      <div className="mt-3 text-center text-sm text-gray-600">
        Selected: {selectedDate.toLocaleDateString()}
      </div>
    </div>
  );
};

export default CalendarRenderer;



