import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './SelectDifficulty.css';
import { FiSettings, FiChevronLeft } from 'react-icons/fi';
import Settings from './settings';
// Import click sound
import clickSound from "/src/assets/click_button.mp3";

const SelectDifficulty = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get all data from location state
  const { studentID, selectedType, selectedDay, category, from } = location.state || {};
  
  // Create audio element for click sound
  const buttonClickSound = new Audio(clickSound);

  // Function to play button click sound
  const playButtonClickSound = () => {
    buttonClickSound.currentTime = 0; // Reset audio to start
    buttonClickSound.play();
  };
  
  // Log values for tracking
  console.log("SelectDifficulty - Received studentID:", studentID);
  console.log("SelectDifficulty - Received selectedType:", selectedType);
  console.log("SelectDifficulty - Received selectedDay:", selectedDay);
  console.log("SelectDifficulty - Received category:", category);
  console.log("SelectDifficulty - Received from:", from);

  const handleBack = () => {
    // Play button click sound
    playButtonClickSound();
    
    // Navigate back based on where the user came from
    if (from === 'activities') {
      navigate('/select-activities', { 
        state: { 
          studentID, 
          selectedType 
        } 
      });
    } else {
      // Default back to day selection (for daily lessons flow)
      navigate('/select-day', { 
        state: { 
          studentID, 
          selectedType 
        } 
      });
    }
  };

  const difficulties = [
    { name: 'EASY', color: '#4CAF50' },    // Green
    { name: 'MEDIUM', color: '#e6c700' },  // Yellow
    { name: 'HARD', color: '#f44336' }     // Red
  ];

  // Helper function to format path based on route patterns in App.jsx
  const getFormattedPath = (categoryStr, difficultyStr, isDailyLesson = false) => {
    // Convert to lowercase
    const categoryLower = categoryStr.toLowerCase();
    const difficultyLower = difficultyStr.toLowerCase();
    
    // Special case handling for specific categories to match App.jsx routes
    let formattedCategory;
    
    // Based on App.jsx routes, these are the exact path formats:
    if (categoryLower === 'colors') {
      formattedCategory = 'color';
    } else if (categoryLower === 'shapes') {
      formattedCategory = 'shape';
    } else if (categoryLower === 'numbers') {
      formattedCategory = 'number';
    } else if (categoryLower === 'animals') {
      formattedCategory = 'animals'; // Note: This stays 'animals' in routes
    } else if (categoryLower === 'money') {
      formattedCategory = 'money';
    } else if (categoryLower === 'matching type' || categoryLower === 'matching types' || categoryLower === 'matchingtype' || categoryLower === 'matchingtypes') {
      formattedCategory = 'matchingtype'; // Remove spaces for URL
    } else {
      // Default case - remove spaces and use category as is
      formattedCategory = categoryLower.replace(/\s+/g, '');
    }
    
    // Format based on whether it's a daily lesson or regular activity
    if (isDailyLesson) {
      return `/activities-daily-lesson-${formattedCategory}-${difficultyLower}`;
    } else {
      return `/activities-${formattedCategory}-${difficultyLower}`;
    }
  };

  // New function to standardize category names for API requests
  const getStandardizedCategory = (categoryStr) => {
    // Lowercase for consistent comparison
    const categoryLower = categoryStr.toLowerCase();
    
    // Map to standard database format (with plural 's' where needed)
    if (categoryLower === 'color' || categoryLower === 'colors') {
      return 'Colors';
    } else if (categoryLower === 'shape' || categoryLower === 'shapes') {
      return 'Shapes';
    } else if (categoryLower === 'number' || categoryLower === 'numbers') {
      return 'Numbers';
    } else if (categoryLower === 'animal' || categoryLower === 'animals') {
      return 'Animals';
    } else if (categoryLower === 'money') {
      return 'Money';
    } else if (categoryLower.includes('matching')) {
      return 'Matching Type';
    } else {
      // Default - capitalize first letter
      return categoryStr.charAt(0).toUpperCase() + categoryStr.slice(1);
    }
  };

  const handleDifficultySelect = async (difficulty) => {
    // Play button click sound
    playButtonClickSound();
    
    console.log("SelectDifficulty - Selected difficulty:", difficulty);
    setLoading(true);
    
    // Get standardized category name for API request
    const standardizedCategory = getStandardizedCategory(category);
    console.log("Using standardized category for API:", standardizedCategory);
    
    try {
      // Handle different flow based on where user came from
      if (from === 'activities') {
        // This is for the Activities flow
        
        // Check if there are questions for this category-difficulty combination
        const response = await axios.get('http://localhost:8000/check_activity_questions.php', {
          params: { 
            category: standardizedCategory,
            difficulty
          }
        });
        
        if (response.data.success) {
          const { question1, question2, question3 } = response.data.questionIDs;
          const activityID = response.data.activityID;
          
          console.log("SelectDifficulty - Fetched activity questionIDs:", [question1, question2, question3]);
          console.log("SelectDifficulty - Fetched activityID:", activityID);
          
          // Get correctly formatted path for activities
          const routePath = getFormattedPath(category, difficulty, false);
          
          console.log("Navigating to route:", routePath);
          
          navigate(routePath, { 
            state: { 
              studentID,
              selectedType,
              category,
              difficulty,
              activityID,
              questionIDs: [question1, question2, question3]
            } 
          });
        } else {
          // No questions for this combination
          setError(`No activities found for ${standardizedCategory} - ${difficulty}. Please try another option.`);
          setLoading(false);
        }
      } else {
        // This is for the Daily Lessons flow
        
        // Check if there are questions for this day-category-difficulty combination
        const response = await axios.get('http://localhost:8001/check_day_questions.php', {
          params: { 
            day: selectedDay,
            category: standardizedCategory,
            difficulty
          }
        });
        
        if (response.data.success) {
          const { question1, question2, question3 } = response.data.questionIDs;
          console.log("SelectDifficulty - Fetched questionIDs:", [question1, question2, question3]);
          
          // Get correctly formatted path for daily lessons
          const routePath = getFormattedPath(category, difficulty, true);
          
          console.log("Navigating to route:", routePath);
          
          // Navigate to the activity with all necessary data
          navigate(routePath, { 
            state: { 
              studentID,
              selectedType,
              selectedDay,
              category,
              difficulty,
              questionIDs: [question1, question2, question3]
            } 
          });
        } else {
          // No questions for this combination
          setError(`No activities found for ${selectedDay} - ${standardizedCategory} - ${difficulty}. Please try another option.`);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      
      // Different error messages based on where user came from
      const errorMessage = from === 'activities'
        ? `Failed to load activities for ${standardizedCategory} - ${difficulty}. Please try again.`
        : `Failed to load daily lessons for ${selectedDay} - ${standardizedCategory} - ${difficulty}. Please try again.`;
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleSettingsClick = () => {
    // Play button click sound
    playButtonClickSound();
    
    setShowSettings(true);
  };

  const handleTryAgain = () => {
    // Play button click sound
    playButtonClickSound();
    
    setError(null);
  };

  // Determine the header title based on where the user came from
  const headerTitle = from === 'activities' 
    ? `Activities - ${category}` 
    : `${selectedDay} - ${category}`;

  // Determine the subtitle text
  const subtitleText = from === 'activities'
    ? `Category: ${category}`
    : `Day: ${selectedDay} | Category: ${category}`;

  return (
    <div className="selectdifficulty__container">
      <div className="selectdifficulty__header">
        <button className="selectdifficulty__back-button" onClick={handleBack}>
          <FiChevronLeft size={32} className="back-icon" />
          <span className="selectdifficulty__back-label">Back</span>
        </button>
        <div className="header-title">{headerTitle}</div>
        <button className="selectdifficulty__settings-button" onClick={handleSettingsClick}>
          <FiSettings size={32} className="settings-icon" />
          <span className="selectdifficulty__settings-label">Settings</span>
        </button>
      </div>

      <div className="selectdifficulty__content">
        <div className="selectdifficulty__title-container">
          <h1 className="selectdifficulty__title">SELECT DIFFICULTY</h1>
          <h2 className="selectdifficulty__subtitle">{subtitleText}</h2>
        </div>

        {loading ? (
          <div className="selectdifficulty__loading">
            <div className="selectdifficulty__spinner"></div>
            <p>Loading activities...</p>
          </div>
        ) : error ? (
          <div className="selectdifficulty__error">
            <p>{error}</p>
            <button 
              className="selectdifficulty__try-again" 
              onClick={handleTryAgain}
            >
              Try Again
            </button>
          </div>
        ) : (
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
        )}
      </div>

      {showSettings && <Settings onClose={() => {
        // Play button click sound when closing settings
        playButtonClickSound();
        setShowSettings(false);
      }} />}
    </div>
  );
};

export default SelectDifficulty;