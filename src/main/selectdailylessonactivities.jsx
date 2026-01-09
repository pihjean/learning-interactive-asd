import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SelectActivities.css';
import { FiSettings, FiChevronLeft } from 'react-icons/fi';
import Settings from './settings';

const SelectDailyLessonActivities = () => {
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/select-type');
  };

  const activities = [
    { name: 'COLOR', color: '#f44336', icon: '🎨' },
    { name: 'NUMBER', color: '#66cc33', icon: '1️⃣3️⃣' },
    { name: 'SHAPE', color: '#ff9800', icon: '🔺' },
    { name: 'ANIMALS', color: '#2196f3', icon: '🐶' },
    { name: 'MONEY', color: '#e6c700', icon: '💵' },
    { name: 'MATCHINGTYPE', color: '#9c27b0', icon: '🔍' }
  ];

  const handleActivitySelect = (activity) => {
    // Navigate to the difficulty selection screen and pass the activity
    navigate('/select-daily-lesson-difficulty', { state: { from: 'activities', activity } });
  };

  return (
    <div className="selectactivities__container">
      <div className="selectactivities__header">
        <button className="selectactivities__back-button" onClick={handleBack}>
          <FiChevronLeft size={32} className="back-icon" />
          <span className="selectactivities__back-label">Back</span>
        </button>
        <div className="header-title">Activities - Main Menu</div>
        <button className="selectactivities__settings-button" onClick={() => setShowSettings(true)}>
          <FiSettings size={32} className="settings-icon" />
          <span className="selectactivities__settings-label">Settings</span>
        </button>
      </div>

      <div className="selectactivities__content">
        <div className="selectactivities__title-container">
          <h1 className="selectactivities__title">SELECT ACTIVITIES</h1>
        </div>

        <div className="selectactivities__activities-container">
          <div className="selectactivities__activities-grid">
            <div className="selectactivities__row">
              <button 
                className="selectactivities__activity-button" 
                style={{ background: activities[0].color }}
                onClick={() => handleActivitySelect(activities[0].name)}
              >
                <span className="activity-icon">{activities[0].icon}</span>
                {activities[0].name}
              </button>
              <button 
                className="selectactivities__activity-button" 
                style={{ background: activities[1].color }}
                onClick={() => handleActivitySelect(activities[1].name)}
              >
                <span className="activity-icon">{activities[1].icon}</span>
                {activities[1].name}
              </button>
            </div>
            <div className="selectactivities__row">
              <button 
                className="selectactivities__activity-button" 
                style={{ background: activities[2].color }}
                onClick={() => handleActivitySelect(activities[2].name)}
              >
                <span className="activity-icon">{activities[2].icon}</span>
                {activities[2].name}
              </button>
              <button 
                className="selectactivities__activity-button" 
                style={{ background: activities[3].color }}
                onClick={() => handleActivitySelect(activities[3].name)}
              >
                <span className="activity-icon">{activities[3].icon}</span>
                {activities[3].name}
              </button>
            </div>
            <div className="selectactivities__row">
              <button 
                className="selectactivities__activity-button" 
                style={{ background: activities[4].color }}
                onClick={() => handleActivitySelect(activities[4].name)}
              >
                <span className="activity-icon">{activities[4].icon}</span>
                {activities[4].name}
              </button>
              <button 
                className="selectactivities__activity-button" 
                style={{ background: activities[5].color }}
                onClick={() => handleActivitySelect(activities[5].name)}
              >
                <span className="activity-icon">{activities[5].icon}</span>
                {activities[5].name}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default SelectDailyLessonActivities;