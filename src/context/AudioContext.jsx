// src/context/AudioContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import bgSound from '/src/assets/bg_sound1.mp3'; // Update this path if needed

// Create the audio context
const AudioContext = createContext();

// Create a provider component
export const AudioProvider = ({ children }) => {
  const [audio, setAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize audio on mount
  useEffect(() => {
    const audioElement = new Audio(bgSound);
    audioElement.loop = true; // Set to loop continuously
    audioElement.volume = 0.5; // Set default volume
    setAudio(audioElement);

    // Cleanup on unmount
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, []);

  // Play audio function
  const playAudio = () => {
    if (audio) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Error playing audio:", err);
      });
    }
  };

  // Pause audio function
  const pauseAudio = () => {
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  // Toggle audio function
  const toggleAudio = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  // Set volume function (0 to 1)
  const setVolume = (level) => {
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, level));
    }
  };

  // Context value
  const contextValue = {
    audio,
    isPlaying,
    playAudio,
    pauseAudio,
    toggleAudio,
    setVolume
  };

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
};

// Custom hook to use the audio context
export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};