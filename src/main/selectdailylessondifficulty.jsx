import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './SelectDifficulty.css';
import { FiSettings, FiChevronLeft } from 'react-icons/fi';
import Settings from './settings';

const SelectDailyLessonDifficulty = () => {
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the activity from location state
  const activity = location.state?.activity || 'COLOR'; // Default to COLOR if not set

  const handleBack = () => {
    // Navigate back to the activities selection screen
    navigate('/select-day');
  };

  const difficulties = [
    { name: 'EASY', color: '#4CAF50' },    // Green
    { name: 'MEDIUM', color: '#e6c700' },  // Yellow
    { name: 'HARD', color: '#f44336' }     // Red
  ];

  const handleDifficultySelect = (difficulty) => {
    // Construct the route path based on activity type and difficulty
    // Format: activities{activity}{difficulty}.jsx
    // Example: activitiescoloreasy, activitiesshapemedium, etc.
    const activityLower = activity.toLowerCase();
    const difficultyLower = difficulty.toLowerCase();
    const routePath = `/activities-daily-lesson-${activityLower}-${difficultyLower}`;
    
    // Navigate to the appropriate activity screen
    navigate(routePath);
  };

  return (
    <div className="selectdifficulty__container">
      <div className="selectdifficulty__header">
        <button className="selectdifficulty__back-button" onClick={handleBack}>
          <FiChevronLeft size={32} className="back-icon" />
          <span className="selectdifficulty__back-label">Back</span>
        </button>
        <div className="header-title">Difficulty - {activity}</div>
        <button className="selectdifficulty__settings-button" onClick={() => setShowSettings(true)}>
          <FiSettings size={32} className="settings-icon" />
          <span className="selectdifficulty__settings-label">Settings</span>
        </button>
      </div>

      <div className="selectdifficulty__content">
        <div className="selectdifficulty__title-container">
          <h1 className="selectdifficulty__title">SELECT DIFFICULTY</h1>
          <h2 className="selectdifficulty__subtitle">Activity: {activity}</h2>
        </div>

        <div className="selectdifficulty__options-container">
          <div className="selectdifficulty__options-list">
            {difficulties.map((difficulty, index) => (
              <button 
                key={index}
                className="selectdifficulty__option-button" 
                style={{ background: difficulty.color }}
                onClick={() => handleDifficultySelect(difficulty.name)}
              >
                {difficulty.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default SelectDailyLessonDifficulty;