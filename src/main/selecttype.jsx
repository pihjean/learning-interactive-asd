import React, { useState, useEffect } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom'; 
import './SelectType.css'; 
import Settings from '../main/settings'; 
import { FiSettings } from 'react-icons/fi'; 
import dailyImg from '/src/assets/1.png'; 
import activityImg from '/src/assets/2.png';
// Import the useAudio hook and click sound
import { useAudio } from '../context/AudioContext';
import clickSound from "/src/assets/click_button.mp3"; // Import the click sound

const SelectType = () => {   
  const [showSettings, setShowSettings] = useState(false);   
  const navigate = useNavigate();   
  const location = useLocation();      
  
  // Get studentID from location state   
  const studentID = location.state?.studentID;
  
  // Access audio controls - keeping this for the auto-play functionality
  const { playAudio } = useAudio();

  // Create audio element for click sound (similar to StudentLogin)
  const buttonClickSound = new Audio(clickSound);

  // Function to play button click sound
  const playButtonClickSound = () => {
    buttonClickSound.currentTime = 0; // Reset audio to start
    buttonClickSound.play();
  };

  // Start playing background audio when component mounts
  useEffect(() => {
    playAudio();
  }, [playAudio]);

  // Handle case when no studentID is provided   
  if (!studentID) {     
    console.warn('No studentID found in location state');     
    // Could redirect to login here or handle the missing ID case   
  }    
  
  const handleDailyLessons = () => {
    // Play button click sound first     
    playButtonClickSound();
    
    navigate('/select-day', {        
      state: { studentID, selectedType: 'daily-lessons' }      
    });   
  };    
  
  const handleActivities = () => {
    // Play button click sound first
    playButtonClickSound();
    
    navigate('/select-activities', {        
      state: { studentID, selectedType: 'activities' }      
    });   
  };

  const handleSettingsClick = () => {
    // Play button click sound first
    playButtonClickSound();
    
    setShowSettings(true);
  };
  
  return (     
    <div className="selecttype__container">       
      <div className="selecttype__header">         
        <h1 className="selecttype__title">SELECT YOUR TYPE</h1>         
        <div className="selecttype__settings-wrapper">
          <button 
            className="selecttype__settings-icon" 
            onClick={handleSettingsClick}
          >             
            <FiSettings size={32} className="settings-icon" />             
            <span className="selecttype__settings-label">Settings</span>           
          </button>         
        </div>       
      </div>        
      
      <div className="selecttype__cards-container">         
        <div className="selecttype__cards">           
          <div className="selecttype__card">             
            <div className="selecttype__image-container">               
              <img src={dailyImg} alt="Daily Lessons" className="selecttype__image" />             
            </div>             
            <button className="selecttype__button" onClick={handleDailyLessons}>DAILY LESSONS</button>           
          </div>           
          <div className="selecttype__card">             
            <div className="selecttype__image-container">               
              <img src={activityImg} alt="Activities" className="selecttype__image" />             
            </div>             
            <button className="selecttype__button" onClick={handleActivities}>GAMES</button>           
          </div>         
        </div>       
      </div>        
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}     
    </div>   
  ); 
};  

export default SelectType;