import React, { useState, useEffect } from 'react';
import './Settings.css';
import { FiX, FiLogOut, FiVolumeX, FiVolume2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext'; // Import audio context hook

const Settings = ({ onClose }) => {
  const navigate = useNavigate();
  
  // Get audio controls from context
  const { isPlaying, toggleAudio, setVolume, audio } = useAudio();
  
  // State for volume sliders
  const [musicVolume, setMusicVolume] = useState(70);
  const [soundVolume, setSOundVolume] = useState(80);

  // Initialize volume slider based on current audio volume when component mounts
  useEffect(() => {
    if (audio) {
      setMusicVolume(Math.round(audio.volume * 100));
    }
  }, [audio]);

  const handleLogout = () => {
    // perform logout logic here if needed (e.g., clearing tokens)
    navigate('/MainPage'); // navigate to root
  };

  // Handle music volume change
  const handleMusicVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setMusicVolume(newVolume);
    
    // Convert to 0-1 range for audio API and set volume
    setVolume(newVolume / 100);
  };

  // Toggle music on/off
  const handleToggleMusic = () => {
    toggleAudio();
  };

  return (
    <div className="settings__overlay">
      <div className="settings__modal">
        <div className="settings__header">
          <h2 className="settings__title">SETTINGS</h2>
          <button className="settings__close-btn" onClick={onClose}>
            <FiX size={40} />
          </button>
        </div>
        
        <div className="settings__content">
          <div className="settings__option">
            <div className="settings__option-header">
              <span className="settings__option-label">MUSIC</span>
              <button 
                className="settings__toggle-btn" 
                onClick={handleToggleMusic}
                aria-label={isPlaying ? "Mute music" : "Unmute music"}
              >
                {isPlaying ? <FiVolume2 size={30} /> : <FiVolumeX size={20} />}
              </button>
            </div>
            <input 
              type="range" 
              className="settings__slider" 
              min="0" 
              max="100" 
              value={musicVolume}
              onChange={handleMusicVolumeChange}
              disabled={!isPlaying}
            />
          </div>
          
          <div className="settings__option">
            <span className="settings__option-label">SOUND</span>
            <input 
              type="range" 
              className="settings__slider" 
              min="0" 
              max="100" 
              defaultValue="80" 
            />
          </div>
          
          <button className="settings__logout-btn" onClick={handleLogout}>
            <span className="settings__logout-icon"><FiLogOut /></span>
            LOGOUT
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;