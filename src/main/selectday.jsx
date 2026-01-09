import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './SelectDay.css';
import { FiSettings } from 'react-icons/fi';
import Settings from './settings';
// Import click sound
import clickSound from "/src/assets/click_button.mp3";

const SelectDay = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [currentDay, setCurrentDay] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get studentID from location state
  const { studentID } = location.state || {};

  // Create audio element for click sound
  const buttonClickSound = new Audio(clickSound);

  // Function to play button click sound
  const playButtonClickSound = () => {
    buttonClickSound.currentTime = 0; // Reset audio to start
    buttonClickSound.play();
  };

  // Log the studentID for tracking
  console.log("SelectDay - Received studentID:", studentID);

  // Handle case when no studentID is provided
  useEffect(() => {
    if (!studentID) {
      console.warn('No studentID found in location state, redirecting to login');
      navigate('/');
      return;
    }

    // Get current day of the week
    const getCurrentDay = () => {
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const today = new Date();
      const dayName = days[today.getDay()];
      
      // Only highlight weekdays (Monday to Friday)
      const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      if (weekdays.includes(dayName)) {
        setCurrentDay(dayName);
      }
    };

    getCurrentDay();
  }, [studentID, navigate]);

  const days = [
    { name: 'MONDAY', color: '#f44336' },
    { name: 'TUESDAY', color: '#ff9800' },
    { name: 'WEDNESDAY', color: '#e6c700' },
    { name: 'THURSDAY', color: '#66cc33' },
    { name: 'FRIDAY', color: '#2196f3' },
  ];

  const handleDaySelect = (day) => {
    // Play button click sound
    playButtonClickSound();
    
    console.log("SelectDay - Selected day:", day);
    console.log("SelectDay - Navigating with studentID:", studentID);
    
    // Navigate directly to video-presentation with the selected day
    navigate('/video-presentation', { 
      state: { 
        studentID, 
        selectedDay: day,
        // You can add more data here as needed
        category: day.toLowerCase() // temporary category based on day
      } 
    });
  };

  const handleSettingsClick = () => {
    // Play button click sound
    playButtonClickSound();
    
    setShowSettings(true);
  };

  // Function to get button style with current day highlighting
  const getButtonStyle = (day) => {
    // If this is the current day, keep it bright and vibrant with gentle animation
    if (currentDay === day.name) {
      return {
        background: day.color,
        boxShadow: '0 0 25px rgba(255, 255, 255, 0.9), 0 8px 25px rgba(0, 0, 0, 0.3)',
        border: '5px solid #fff',
        opacity: 1,
        filter: 'brightness(1.1) saturate(1.2)',
        animation: 'gentlePulse 3s ease-in-out infinite'
      };
    }

    // For non-current days, make them grayed out but still clearly interactive
    return {
      background: '#b0b0b0',
      opacity: 0.7,
      filter: 'grayscale(80%) brightness(0.9)',
      transition: 'all 0.3s ease',
      border: '4px solid #999'
    };
  };

  return (
    <div className="selectday__container">
      <div className="selectday__header">
          <div className="selectday__title-container">
          <h1 className="selectday__title">SELECT DAY</h1>
          {currentDay && (
            <p className="selectday__current-day">Today is {currentDay}</p>
          )}
        </div>
        <div className="settings">
        <button className="selectday__settings-button" onClick={handleSettingsClick}>
          <FiSettings size={48} className="settings-icon" />
          <span className="selectday__settings-label">Settings</span>
        </button>
        </div>
      </div>

      <div className="selectday__content">


        <div className="selectday__days-container">
          <div className="selectday__days-grid">
            <div className="selectday__row">
              <button 
                className={`selectday__day-button ${currentDay === days[0].name ? 'selectday__day-button--current' : ''}`}
                style={getButtonStyle(days[0])}
                onClick={() => handleDaySelect(days[0].name)}
              >
                {days[0].name}
              </button>
              <button 
                className={`selectday__day-button ${currentDay === days[1].name ? 'selectday__day-button--current' : ''}`}
                style={getButtonStyle(days[1])}
                onClick={() => handleDaySelect(days[1].name)}
              >
                {days[1].name}
              </button>
            </div>
            <div className="selectday__row">
              <button 
                className={`selectday__day-button ${currentDay === days[2].name ? 'selectday__day-button--current' : ''}`}
                style={getButtonStyle(days[2])}
                onClick={() => handleDaySelect(days[2].name)}
              >
                {days[2].name}
              </button>
              <button 
                className={`selectday__day-button ${currentDay === days[3].name ? 'selectday__day-button--current' : ''}`}
                style={getButtonStyle(days[3])}
                onClick={() => handleDaySelect(days[3].name)}
              >
                {days[3].name}
              </button>
            </div>
            <div className="selectday__row selectday__row--center">
              <button 
                className={`selectday__day-button ${currentDay === days[4].name ? 'selectday__day-button--current' : ''}`}
                style={getButtonStyle(days[4])}
                onClick={() => handleDaySelect(days[4].name)}
              >
                {days[4].name}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSettings && <Settings onClose={() => {
        // Play button click sound when closing settings
        playButtonClickSound();
        setShowSettings(false);
      }} />}
    </div>
  );
};

export default SelectDay;