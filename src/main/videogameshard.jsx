import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSettings, FiChevronLeft } from 'react-icons/fi';
import Settings from './settings';
import './VideoGames.css';
import clickSound from "/src/assets/click_button.mp3";

const HardVideoGames = () => {
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const buttonClickSound = new Audio(clickSound);

  const playButtonClickSound = () => {
    buttonClickSound.currentTime = 0;
    buttonClickSound.play();
  };

  const handleBack = () => {
    playButtonClickSound();
    navigate(-1); // or any route you prefer
  };

  const handleSettingsClick = () => {
    playButtonClickSound();
    setShowSettings(true);
  };

  return (
    <div className="videogames__container">
      {/* Back Button */}
      <button className="videogames__back-button" onClick={handleBack}>
        <FiChevronLeft size={32} className="back-icon" />
        <span className="videogames__back-label">Back</span>
      </button>

      {/* Settings Button */}
      <button className="videogames-settings-button" onClick={handleSettingsClick}>
        <FiSettings size={30} />
      </button>

      {/* Video Container */}
      <div className="videogames__video-container">
        <video
          ref={videoRef}
          className="videogames__video-player"
          src="/src/assets/videos/introduction.mp4" // Replace with your desired video
          autoPlay
          muted={false}
          disablePictureInPicture
          controlsList="nodownload noplaybackrate"
          playsInline
          controls
        />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <Settings onClose={() => {
          playButtonClickSound();
          setShowSettings(false);
        }} />
      )}
    </div>
  );
};

export default HardVideoGames;
