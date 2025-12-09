import { useState, useEffect } from 'react';

export default function ApiTimeDisplay() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const fetchTime = async () => {
      try {
        setIsLoading(true);
        
        // Skip external API calls and use local time directly
        // This avoids network issues with time APIs
        setCurrentDate(new Date());
        console.log("Using local time for date display");
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error handling time:", err);
        setErrorMessage("Using local time");
        setCurrentDate(new Date());
        setIsLoading(false);
      }
    };

    fetchTime();

    // Refresh every minute, but use local time for refreshes
    const intervalId = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const formatDate = (date) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    // Add suffix to day
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    if (day === 2 || day === 22) suffix = "nd";
    if (day === 3 || day === 23) suffix = "rd";
    
    return `${month} ${day}${suffix}, ${year}`;
  };

  return (
    <>
      {/* Date Section */}
      <div className="flex items-center">
        <img src="https://c.animaapp.com/VmmSqCQF/img/hugeicons-date-time.svg" alt="Calendar" className="w-[18px] h-[18px] mr-2" />
        <span className="text-white text-sm lg:text-[15px] font-medium font-['Montserrat']">
          {isLoading ? "Loading..." : formatDate(currentDate)}
        </span>
      </div>
    </>
  );
}