import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './activitiescolor.css';
import { database } from '../config'; // Import database instead of db
import { ref, onValue, off, set } from "firebase/database";
import Settings from './settings';
import { useAudio } from '../context/AudioContext'; // Import the audio context

// Import your local sound assets

import successSound2 from '/src/assets/success_2.mp3';
import successSound3 from '/src/assets/success_3.mp3';
import wrongSound from '/src/assets/wrong_2.mp3';
import yeheySound from '/src/assets/yeyy.mp3';



const CloudContainer = ({ children }) => (
  <div className="cloud-question-container">
    <div className="cloud-shape cloud-animated">
      {children}
    </div>
  </div>
);

// SVG assets as React components
const BackButton = () => (
  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="28" fill="#1E88E5" stroke="white" strokeWidth="4"/>
    <path d="M38 15L22 30L38 45" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SoundButton = ({ muted }) => (
  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="30" fill="#1E88E5"/>
    <path d="M20 22H25L32 15V45L25 38H20V22Z" fill="white"/>
    {muted ? (
      <path d="M42 20L35 27M35 20L42 27" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    ) : (
      <>
        <path d="M39 21C42.3137 24.3137 42.3137 35.6863 39 39" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <path d="M44 16C49.5228 21.5228 49.5228 38.4772 44 44" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </>
    )}
  </svg>
);

// Heart components 
const HeartFull = () => (
  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 45.8333L21.75 42.875C11.5 33.5417 5 27.5833 5 20.2083C5 14.25 9.75 9.5 15.7083 9.5C19.1667 9.5 22.5 11.125 25 13.75C27.5 11.125 30.8333 9.5 34.2917 9.5C40.25 9.5 45 14.25 45 20.2083C45 27.5833 38.5 33.5417 28.25 42.8958L25 45.8333Z" fill="#E53935"/>
  </svg>
);

const HeartBroken = () => (
  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 45.8333L21.75 42.875C11.5 33.5417 5 27.5833 5 20.2083C5 14.25 9.75 9.5 15.7083 9.5C19.1667 9.5 22.5 11.125 25 13.75C27.5 11.125 30.8333 9.5 34.2917 9.5C40.25 9.5 45 14.25 45 20.2083C45 27.5833 38.5 33.5417 28.25 42.8958L25 45.8333Z" fill="#9E9E9E"/>
    <path d="M21 15L27 25L23 35L33 25L29 15" stroke="#424242" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Enhanced celebration components
const PopperImage = () => (
  <svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 18C68.5 30 55 32 45 30C35 30 28 40 28 50C28 60 20 65 10 65C20 70 25 75 28 85C31 95 40 98 50 95C60 92 68 100 70 110C72 100 80 92 90 95C100 98 109 95 112 85C115 75 120 70 130 65C120 65 112 60 112 50C112 40 105 30 95 30C85 32 71.5 30 75 18Z" fill="#FFD54F"/>
    <path d="M75 18C68.5 30 55 32 45 30M75 18C71.5 30 85 32 95 30M75 18L75 5M45 30C35 30 28 40 28 50M45 30L32 17M28 50C28 60 20 65 10 65M28 50L15 50M10 65C20 70 25 75 28 85M10 65L0 57.5M28 85C31 95 40 98 50 95M28 85L15 97.5M50 95C60 92 68 100 70 110M50 95L50 107.5M70 110C72 100 80 92 90 95M70 110L70 122.5M90 95C100 98 109 95 112 85M90 95L90 107.5M112 85C115 75 120 70 130 65M112 85L125 97.5M130 65C120 65 112 60 112 50M130 65L140 57.5M112 50C112 40 105 30 95 30M112 50L125 50M95 30L108 17" stroke="#F57C00" strokeWidth="2"/>
    <circle cx="75" cy="60" r="20" fill="#FF5722"/>
    <path d="M65 55L73 62L85 50" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Emoji components
const SmilingEmoji = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="#FFEB3B"/>
    <circle cx="35" cy="40" r="5" fill="#212121"/>
    <circle cx="65" cy="40" r="5" fill="#212121"/>
    <path d="M30 65C30 65 40 75 50 75C60 75 70 65 70 65" stroke="#212121" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const ExcitedEmoji = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="#FFEB3B"/>
    <path d="M30 40L35 35L40 40L35 45L30 40Z" fill="#212121"/>
    <path d="M60 40L65 35L70 40L65 45L60 40Z" fill="#212121"/>
    <path d="M25 65C25 65 37 80 50 80C63 80 75 65 75 65" stroke="#212121" strokeWidth="4" strokeLinecap="round"/>
    <path d="M50 30L55 15" stroke="#212121" strokeWidth="3" strokeLinecap="round"/>
    <path d="M60 28L70 15" stroke="#212121" strokeWidth="3" strokeLinecap="round"/>
    <path d="M40 28L30 15" stroke="#212121" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const PartyEmoji = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="#FFEB3B"/>
    <path d="M35 38C35 38 33 33 30 33C33 33 35 38 35 38Z" fill="#212121"/>
    <path d="M65 38C65 38 67 33 70 33C67 33 65 38 65 38Z" fill="#212121"/>
    <path d="M30 65C30 65 40 80 50 80C60 80 70 65 70 65" stroke="#212121" strokeWidth="4" strokeLinecap="round"/>
    <path d="M85 15L75 25" stroke="#E53935" strokeWidth="3" strokeLinecap="round"/>
    <path d="M15 15L25 25" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round"/>
    <path d="M15 85L25 75" stroke="#3F51B5" strokeWidth="3" strokeLinecap="round"/>
    <path d="M85 85L75 75" stroke="#FF9800" strokeWidth="3" strokeLinecap="round"/>
    <path d="M20 40L25 43L20 46" stroke="#9C27B0" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M80 40L75 43L80 46" stroke="#00BCD4" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="45" y="10" width="10" height="5" rx="2.5" fill="#FF5722"/>
  </svg>
);

// Text bubbles
const GoodJobBubble = () => (
  <svg width="200" height="120" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 20C10 14.4772 14.4772 10 20 10H180C185.523 10 190 14.4772 190 20V80C190 85.5228 185.523 90 180 90H110L100 110L90 90H20C14.4772 90 10 85.5228 10 80V20Z" fill="#4CAF50"/>
    <text x="100" y="55" fontFamily="Comic Sans MS" fontSize="24" fill="white" textAnchor="middle">GOOD JOB!</text>
  </svg>
);

const CorrectBubble = () => (
  <svg width="200" height="120" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 20C10 14.4772 14.4772 10 20 10H180C185.523 10 190 14.4772 190 20V80C190 85.5228 185.523 90 180 90H110L100 110L90 90H20C14.4772 90 10 85.5228 10 80V20Z" fill="#3F51B5"/>
    <text x="100" y="55" fontFamily="Comic Sans MS" fontSize="24" fill="white" textAnchor="middle">CORRECT!</text>
  </svg>
);

const WinCelebration = () => (
  <div className="win-celebration">
    <div className="trophy-container">
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M80 30H120V60C120 82.0914 102.091 100 80 100H80V30Z" fill="#FFD700" />
        <path d="M120 30H80V60C80 82.0914 97.9086 100 120 100V30Z" fill="#FFC400" />
        <rect x="70" y="20" width="60" height="10" rx="5" fill="#FFB300" />
        <rect x="90" y="100" width="20" height="40" fill="#FFA000" />
        <rect x="70" y="140" width="60" height="10" rx="5" fill="#FF8F00" />
        <path d="M50 40H80V50C80 61.0457 71.0457 70 60 70V40H50Z" fill="#FFD700" />
        <path d="M150 40H120V50C120 61.0457 128.954 70 140 70V40H150Z" fill="#FFC400" />
      </svg>

      <div className="confetti-container">
        {[...Array(50)].map((_, i) => {
          const size = 6 + Math.random() * 8;
          return (
            <div 
              key={i}
              className="confetti"
              style={{
                '--delay': `${Math.random() * 2}s`,
                '--left': `${Math.random() * 100}%`,
                '--duration': `${2 + Math.random() * 2}s`,
                '--size': `${size}px`,
                '--rotation': `${Math.random() * 720}deg`,
                '--color': `hsl(${Math.random() * 360}, 100%, 50%)`
              }}
            />
          );
        })}
      </div>
    </div>

    <h2 className="win-text">FANTASTIC JOB!</h2>
    <p className="win-message">You're a color expert! 🌈</p>
  </div>
);

const LoseAnimation = () => (
  <div className="lose-animation">
    <svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="75" cy="75" r="70" fill="#FFD54F" />
      <circle cx="50" cy="60" r="8" fill="#000" />
      <circle cx="100" cy="60" r="8" fill="#000" />
      {/* Smiling mouth */}
      <path d="M50 95C55 105 95 105 100 95" stroke="#000" strokeWidth="5" strokeLinecap="round" />
    </svg>

    <h2 className="lose-text">DON'T GIVE UP</h2>
    <p className="lose-message">Every try makes you better. Let's go again! 😊</p>
  </div>
);

// Enhanced Cloud component for background
const Cloud = () => (
  <svg width="180" height="100" viewBox="0 0 180 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M165 65C165 82.6731 150.673 97 133 97H47C29.3269 97 15 82.6731 15 65C15 47.3269 29.3269 33 47 33C47.7879 33 48.5691 33.0335 49.3422 33.0992C55.9699 20.1144 69.5668 11 85 11C104.33 11 120.45 24.6645 124.191 43.0828C146.479 44.6504 165 56.5705 165 65Z" fill="white"/>
  </svg>
);

  // Media Content Component (for displaying images or videos from database)
 // Modified MediaContent Component to properly handle BLOB data
// MediaContent Component with improved sizing to fill the container
const MediaContent = ({ mediaType, mediaContent }) => {
  console.log("MediaContent render:", { 
    mediaType, 
    mediaContentLength: mediaContent ? mediaContent.length : 0,
    mediaContentType: mediaContent ? typeof mediaContent : 'undefined'
  });
  
  // Process different media types
  if (mediaType === 'colorReview') {
    // Create a colored box based on the answer
    const colorMap = {
      'r': 'red',
      'b': 'blue',
      'g': 'green',
      'y': 'yellow',
      'p': 'purple'
    };
    
    // Get current question to determine color
    const currentQ = questions[currentQuestion] || {};
    const colorKey = currentQ.correctAnswer?.toLowerCase() || 'r';
    const colorValue = colorMap[colorKey] || 'gray';
    
    return (
      <div 
        className="color-box" 
        style={{ 
          backgroundColor: colorValue,
          width: '100%',
          height: '100%',
          borderRadius: '10px',
          margin: '0 auto'
        }}
      />
    );
  } 
  
  if (mediaType === 'yesNoReview') {
    return (
      <div className="yes-no-container">
        <p className="yes-no-text">Look at the color and answer the question</p>
      </div>
    );
  }
  
  // Check if mediaContent exists
  if (!mediaContent) {
    console.log("No media content available");
    return (
      <div className="no-media-content" style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: '10px'
      }}>
        <p>No media available</p>
      </div>
    );
  }

  // For base64 encoded blob data from database
  try {
    // Create data URL from base64 string
    let mediaUrl;
    
    // The mediaContent might already be a base64 string from PHP
    // If it's a string but doesn't start with data:, assume it's a base64 string needing a prefix
    if (typeof mediaContent === 'string') {
      if (mediaContent.startsWith('data:')) {
        mediaUrl = mediaContent;
      } else {
        // Add appropriate prefix based on media type
        const prefix = mediaType === 'video' ? 'data:video/mp4;base64,' : 'data:image/jpeg;base64,';
        mediaUrl = prefix + mediaContent;
      }
      
      console.log("Created media URL:", mediaUrl.substring(0, 50) + "...");
      
      if (mediaType === 'image' || mediaType === 'colorReview' || mediaType === 'matchType') {
        return (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          }}>
            <img 
              src={mediaUrl} 
              alt="Question" 
              className="question-media" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '10px'
              }}
            />
          </div>
        );
      } else if (mediaType === 'video') {
        return (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          }}>
            <video 
              className="question-media" 
              controls 
              autoPlay 
              loop
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '10px'
              }}
            >
              <source src={mediaUrl} type="video/mp4" />
              Your browser does not support video playback.
            </video>
          </div>
        );
      }
    } else {
      console.log("Media content is not a string:", typeof mediaContent);
      return (
        <div className="invalid-media-format" style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f0f0f0',
          borderRadius: '10px'
        }}>
          <p>Invalid media format</p>
        </div>
      );
    }
  } catch (error) {
    console.error("Error displaying media:", error);
    return (
      <div className="media-error" style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: '10px'
      }}>
        <p>Error displaying media: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="unknown-media-type" style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f0f0',
      borderRadius: '10px'
    }}>
      <p>Unknown media type: {mediaType}</p>
    </div>
  );
};

const DLActivitiesShapeEasy = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [hearts, setHearts] = useState([true, true, true]); // Three full hearts initially
  const [timer, setTimer] = useState(60); // 1 minute timer
  const [startTime, setStartTime] = useState(null); // Track when the game started
  const [elapsedTime, setElapsedTime] = useState(0); // Time spent in game
  const [showSettings, setShowSettings] = useState(false);   
  const [showPopper, setShowPopper] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [currentHeartIndex, setCurrentHeartIndex] = useState(-1);
  const [showGoodJob, setShowGoodJob] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [heartBreakingStage, setHeartBreakingStage] = useState(0); // For heart breaking animation
  const [showInstructions, setShowInstructions] = useState(true); // Show instructions on first load
  const [showExitModal, setShowExitModal] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [userAnswer, setUserAnswer] = useState(''); // Store user's answer from Firebase
  const [error, setError] = useState(null);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false); // Flag to indicate we're waiting for user answer
  const [lastProcessedAnswer, setLastProcessedAnswer] = useState(''); // To track already processed answers
  const [questionResults, setQuestionResults] = useState([null, null, null]); // Track results for each question
  const [score, setScore] = useState(0); // Track correct answers
  const [progressSaved, setProgressSaved] = useState(false); // Track if progress has been saved
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if question is being spoken
  
  // Get props from router location
  const location = useLocation();
  const navigate = useNavigate();
  const { studentID, selectedDay, category, difficulty, questionIDs } = location.state || {};
  
  // Access the audio context
  const { toggleAudio, isPlaying, pauseAudio } = useAudio();
  
  console.log("Activity received data:", { 
    studentID, 
    selectedDay, 
    category, 
    difficulty, 
    questionIDs 
  });
  
  // Audio references for sound effects (different from background music)
  const popperSoundRef = useRef(null);
  const heartbreakSoundRef = useRef(null);
  const successSoundRef = useRef(null);
  const finalSuccessSoundRef = useRef(null);
  const yeheySoundRef = useRef(null);
  const correctVoiceRef = useRef(null);

  // API URLs
  const API_BASE_URL = 'http://localhost:8000';

  // Initialize speech synthesis
  useEffect(() => {
    // Load voices when the component mounts
    const loadVoices = () => {
      // Get and log available voices
      const voices = window.speechSynthesis.getVoices();
      console.log("Available voices loaded:", voices.length);
    };
    
    // Chrome requires this event listener to get voices
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Initial load attempt
    loadVoices();
    
    // Clean up function
    return () => {
      // Cancel any speech when component unmounts
      window.speechSynthesis.cancel();
    };
  }, []);

  // Function to speak the question using Web Speech API with Ivy voice (sounds like a child)
  const speakQuestion = () => {
    // Get the current question text
    const questionText = questions[currentQuestion]?.text;
    if (!questionText) return;
    
    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(questionText);
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    
    console.log("Available voices:", voices.map(v => v.name).join(", "));
    
    // Try to find the Ivy voice - it sounds like a kid
    const ivyVoice = voices.find(voice => voice.name.includes('Ivy'));
    
    // Fallback to other child-like voices if Ivy isn't available
    const childVoice = ivyVoice || voices.find(voice => 
      voice.name.includes('Google UK English Female') || 
      voice.name.includes('Microsoft Zira') || 
      voice.name.includes('Samantha') ||
      voice.name.includes('Google US English Female')
    );
    
    if (ivyVoice) {
      console.log("Using Ivy voice - perfect for a child's voice");
      utterance.voice = ivyVoice;
    } else if (childVoice) {
      console.log("Ivy voice not found, using alternative child-like voice:", childVoice.name);
      utterance.voice = childVoice;
    } else {
      console.log("No specific child-like voice found, using default");
    }
    
    // Make it sound more child-like with pitch and rate
    utterance.pitch = 1.3;  // Higher pitch (range 0-2)
    utterance.rate = 0.9;   // Slightly slower rate
    utterance.volume = 1.0; // Full volume
    
    // Set up event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsSpeaking(false);
    };
    
    // Speak the text
    window.speechSynthesis.speak(utterance);
  };

/// Updated saveProgress function with proper time formatting
// saveProgress function with capped elapsed time
const saveProgress = async () => {
  if (progressSaved) return; // Prevent duplicate saves
  
  try {
    // Get the elapsed time but cap it at the game's maximum time (60 seconds)
    const maxGameTimeSeconds = 60; // Maximum time of the game is 1:00 minute (60 seconds)
    const timeSpent = Math.min(elapsedTime, maxGameTimeSeconds); // Cap at max game time
    
    // Format the time as "minutes:seconds" (mm:ss)
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    console.log("Time spent on activity:", timeSpent, "seconds, formatted as:", formattedTime);
    
    // Create the payload
    const payload = {
      studentID,
      day: selectedDay,
      category,
      difficulty,
      questionResults: questionResults.map(result => {
        if (result === null) return 'N/A';
        return result ? '✓' : 'X';
      }),
      questionTexts: questions.map(q => q.text || 'N/A'),
      timeallotment: formattedTime, // Send the formatted time string (capped at game's max time)
      score
    };
    
    console.log("Saving progress with payload:", payload);
    
    // Send the data to the API
    const response = await fetch(`${API_BASE_URL}/saveProgress.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log("Progress saved successfully:", data);
      setProgressSaved(true);
    } else {
      console.error("Error saving progress:", data.message);
    }
  } catch (error) {
    console.error("Error saving progress:", error);
  }
};
  // Format the fetched questions and log for debugging
  const formatQuestionsForLog = (questionsArray) => {
    if (!questionsArray) return "No questions";
    
    return questionsArray.map(q => ({
      id: q.id,
      text: q.text,
      correctAnswer: q.correctAnswer,
      mediaType: q.mediaType,
      // Don't log the whole media content, just indicate if it exists
      mediaContent: q.mediaContent ? `[Content: ${typeof q.mediaContent === 'string' ? q.mediaContent.substring(0, 30) + '...' : 'invalid'}]` : 'null'
    }));
  };

  // Set start time when game starts
  useEffect(() => {
    if (!showInstructions && !startTime) {
      console.log("Game started, setting start time");
      setStartTime(Date.now());
    }
  }, [showInstructions, startTime]);
  
  // Update elapsed time
  useEffect(() => {
    if (startTime && !gameOver && !gameWon) {
      const interval = setInterval(() => {
        const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(currentElapsed);
        console.log("Updated elapsed time:", currentElapsed, "seconds");
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [startTime, gameOver, gameWon]);
  // Fetch questions using the questionIDs from props
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!questionIDs || !Array.isArray(questionIDs) || questionIDs.length === 0) {
        setError("No question IDs provided.");
        setLoading(false);
        return;
      }
      
      try {
        console.log("About to fetch questions with IDs:", questionIDs);
        
        // Ensure all questionIDs are valid before proceeding
        if(questionIDs.some(id => !id)) {
          throw new Error("Invalid question IDs provided");
        }
        
        // Join question IDs into a comma-separated string
        const questionIDsString = questionIDs.join(',');
        
        console.log("Fetching questions with URL:", `${API_BASE_URL}/fetch_questions.php?questionIDs=${questionIDsString}`);
        
        // Fetch questions by IDs
        const response = await fetch(`${API_BASE_URL}/fetch_questions.php?questionIDs=${questionIDsString}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // First check if we can get the text response
        const text = await response.text();
        
        if (!text || text.trim() === '') {
          throw new Error("Received empty response from server");
        }
        
        console.log("Received response length:", text.length);
        
        // Then try to parse it as JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (error) {
          throw new Error(`Failed to parse JSON response: ${error.message}. Response start: ${text.substring(0, 100)}...`);
        }
        
        if (!data.success) {
          throw new Error(data.message || "Failed to fetch questions");
        }
        
        // Format the questions data
        const formattedQuestions = data.questions.map(q => ({
          id: q.questionID,
          text: q.question,
          correctAnswer: q.answer.toLowerCase(), // Answer format as received from the database
          mediaType: q.media_type,
          mediaContent: q.media_content
        }));
        
        console.log("Fetched and formatted questions:", formatQuestionsForLog(formattedQuestions));
        
        setQuestions(formattedQuestions);
        setLoading(false);
        
        // After loading questions, set waiting for answer to true
        if (formattedQuestions.length > 0) {
          setWaitingForAnswer(true);
        }
        
        // Initialize questionResults array based on the number of questions
        setQuestionResults(new Array(formattedQuestions.length).fill(null));
        
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError(`Failed to load questions: ${err.message}`);
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [questionIDs]);

  // Listen for user answers from Firebase
  useEffect(() => {
    if (loading || !waitingForAnswer || questions.length === 0) {
      return;
    }

    console.log("Setting up Firebase Realtime DB listener for user answers");
    
    // Reference to the userAnswers node directly
    const userAnswerRef = ref(database, `userAnswers`);
    
    // Set up real-time listener
    const handleDataChange = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log("Firebase data fetched:", data);
        
        // Check if there's any data
        if (data) {
          let answer = '';
          
          // Handle different data structures
          if (typeof data === 'object' && data.answer) {
            // If it's an object with an answer property
            answer = data.answer.toLowerCase();
          } else if (typeof data === 'string') {
            // If it's just a string directly
            answer = data.toLowerCase();
          }
          
          // Process any non-empty answer, even if it's the same as before
          if (answer && answer.trim() !== '') {
            console.log("Processing answer from Firebase:", answer);
            
            // Process the answer
            checkAnswer(answer);
            
            // Only clear the answer property while keeping the node
            const answerRef = ref(database, `userAnswers/answer`);
            set(answerRef, "")
              .then(() => {
                console.log("Answer value cleared from Firebase after processing");
              })
              .catch((error) => {
                console.error("Error clearing answer value from Firebase:", error);
              });
          }
        }
      } else {
        console.log("No data available in userAnswers node");
      }
    };

    // Attach the listener
    onValue(userAnswerRef, handleDataChange, (error) => {
      console.error("Error listening to Firebase user answers:", error);
      setError(`Failed to listen for user answers: ${error.message}`);
    });
    
    // Cleanup function
    return () => {
      console.log("Cleaning up Firebase listener");
      off(userAnswerRef);
    };
  }, [loading, waitingForAnswer, questions, currentQuestion]);
  
  // Save progress when game ends
  useEffect(() => {
    if ((gameOver || gameWon) && !progressSaved && startTime) {
      // Calculate final elapsed time when game ends
      const finalElapsedTime = Math.floor((Date.now() - startTime) / 1000);
      console.log("Game ended. Final elapsed time:", finalElapsedTime, "seconds");
      setElapsedTime(finalElapsedTime);
      
      // Save progress with the correct time
      saveProgress();
    }
  }, [gameOver, gameWon, progressSaved, startTime]);

  // Function to check the user's answer
  const checkAnswer = (answer) => {
    if (gameOver || gameWon || isCorrect || isWrong || !waitingForAnswer) return;
    
    const currentQ = questions[currentQuestion];
    if (!currentQ) return;
    
    const correctAnswer = currentQ.correctAnswer?.toLowerCase();
    console.log(`Checking answer: User answered "${answer}", correct is "${correctAnswer}"`);
    
    const isAnswerCorrect = answer === correctAnswer;
    
    // Update question results
    const updatedResults = [...questionResults];
    updatedResults[currentQuestion] = isAnswerCorrect;
    setQuestionResults(updatedResults);
    
    // Update score if answer is correct
    if (isAnswerCorrect) {
      setScore(prevScore => prevScore + 1);
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
    
    // Reset waiting state after processing
    setWaitingForAnswer(false);
  };

  // Initialize audio for sound effects
  useEffect(() => {
    // Create audio elements for sound effects
    popperSoundRef.current = new Audio();
    heartbreakSoundRef.current = new Audio(wrongSound);
    successSoundRef.current = new Audio(successSound2);
    finalSuccessSoundRef.current = new Audio(successSound3);
    yeheySoundRef.current = new Audio(yeheySound);
    
    // Clean up audio resources when component unmounts
    return () => {
      const audioRefs = [
        popperSoundRef, 
        heartbreakSoundRef, 
        successSoundRef,
        finalSuccessSoundRef,
        yeheySoundRef
      ];
      
      audioRefs.forEach(ref => {
        if (ref.current) {
          ref.current.pause();
          ref.current.src = "";
        }
      });
      
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
    };
  }, []);

  // Handle correct answer
  const handleCorrectAnswer = () => {
    setIsCorrect(true);
    setShowPopper(true);
    setShowEmojis(true);
    setShowCorrect(true);
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Play sounds with better error handling
    const playSounds = async () => {
      if (!muted) {
        try {
          // Use the appropriate success sound based on question number
          const isLastQuestion = currentQuestion === questions.length - 1;
          const successSound = isLastQuestion ? finalSuccessSoundRef.current : successSoundRef.current;
          
          await successSound.play();
          
          // Add delays between sounds for better audio experience
          setTimeout(async () => {
            try {
              await yeheySoundRef.current.play();
            } catch (error) {
              console.log("Sound play failed:", error);
            }
          }, 300);
        } catch (error) {
          console.log("Sound play failed:", error);
        }
      }
    };
    
    playSounds();
    
    // Show "Good job!" bubble after delay
    setTimeout(() => {
      setShowGoodJob(true);
    }, 1000);
    
    // Set timeout to move to next question
    setTimeout(() => {
      setShowPopper(false);
      setIsCorrect(false);
      setShowEmojis(false);
      setShowGoodJob(false);
      setShowCorrect(false);
      
      // Check if this was the last question
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setWaitingForAnswer(true); // Start waiting for next answer
      } else {
        // Game won!
        setGameWon(true);
      }
    }, 3000);
  };

  // Handle wrong answer
  const handleWrongAnswer = () => {
    setIsWrong(true);
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Play heartbreak sound with error handling
    if (!muted) {
      heartbreakSoundRef.current.play().catch(error => {
        console.log("Sound play failed:", error);
      });
    }
    
    // Find first full heart
    const firstFullHeartIndex = hearts.findIndex(heart => heart === true);
    if (firstFullHeartIndex !== -1) {
      setCurrentHeartIndex(firstFullHeartIndex);
      setHeartBreakingStage(1);
      
      // Remove heart after animation
      setTimeout(() => {
        const newHearts = [...hearts];
        newHearts[firstFullHeartIndex] = false;
        setHearts(newHearts);
        
        // Check if all hearts are gone
        if (newHearts.every(heart => heart === false)) {
          setTimeout(() => {
            setGameOver(true);
          }, 1000);
        } else {
          // If still have hearts, wait for next answer
          setTimeout(() => {
            setWaitingForAnswer(true);
          }, 1500);
        }
      }, 1000);
    }
    
    // Reset wrong answer state
    setTimeout(() => {
      setIsWrong(false);
      setCurrentHeartIndex(-1);
      setHeartBreakingStage(0);
    }, 1500);
  };

  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const intervalId = setInterval(() => {
        setCountdown(prevCount => prevCount - 1);
      }, 1000);
      
      return () => clearInterval(intervalId);
    } else if (isCountingDown && countdown === 0) {
      setIsCountingDown(false);
      setWaitingForAnswer(true); // Resume waiting for answers after countdown
    }
  }, [isCountingDown, countdown]);

  // Handle timer
  useEffect(() => {
    if (timer > 0 && !gameOver && !gameWon && !showInstructions && !loading) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setGameOver(true);
    }
  }, [timer, gameOver, gameWon, showInstructions, loading]);

  // Heart breaking animation
  useEffect(() => {
    if (heartBreakingStage > 0 && heartBreakingStage < 5) {
      const timeout = setTimeout(() => {
        setHeartBreakingStage(prev => prev + 1);
      }, 200);
      
      return () => clearTimeout(timeout);
    }
  }, [heartBreakingStage]);

  // Format timer to mm:ss
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Modified toggle sound function to also handle speaking
  const toggleSound = () => {
    // If speech is ongoing, stop it
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    
    // If muted, toggle mute first
    if (muted) {
      setMuted(false);
    }
    
    // Start speaking the question
    speakQuestion();
  };

  // Start game
  const startGame = () => {
    setShowInstructions(false);
    setWaitingForAnswer(true); // Start waiting for answers when game starts
    setStartTime(Date.now()); // Set start time
  };

  // Handle back button click
  const handleBackClick = () => {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Only show the exit modal if the game is in progress
    if (!gameOver && !gameWon && !showInstructions) {
      setShowExitModal(true);
      // Pause waiting for answers
      setWaitingForAnswer(false);
    } else {
      // Direct navigation back to difficulty selection
      window.history.back();
    }
  };
  
  const handleExitYes = () => {
    // Navigate back to difficulty selection
    window.history.back();
  };
  
  const handleExitNo = () => {
    setShowExitModal(false);
    setIsCountingDown(true);
    setCountdown(3);
  };

  const ExitConfirmationModal = () => (
    <div className="exit-modal-overlay">
      <div className="exit-modal">
        <h2>Are you sure you want to exit?</h2>
        <p>Your progress will not be saved.</p>
        <div className="exit-modal-buttons">
          <button className="exit-yes-btn" onClick={handleExitYes}>Yes</button>
          <button className="exit-no-btn" onClick={handleExitNo}>No</button>
        </div>
      </div>
    </div>
  );

  // Modified SoundButton component with speech indicator
  const SoundButton = ({ muted, isSpeaking }) => (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="30" fill={isSpeaking ? "#FF5722" : "#1E88E5"} />
      <path d="M20 22H25L32 15V45L25 38H20V22Z" fill="white"/>
      {muted ? (
        <path d="M42 20L35 27M35 20L42 27" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      ) : (
        <>
          <path d="M39 21C42.3137 24.3137 42.3137 35.6863 39 39" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <path d="M44 16C49.5228 21.5228 49.5228 38.4772 44 44" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </>
      )}
      {isSpeaking && (
        <circle cx="48" cy="12" r="5" fill="#FFEB3B" />
      )}
    </svg>
  );

  // If no questions were found or missing required data
  if (!studentID || !selectedDay || !category || !difficulty) {
    return (
      <div className="error-container">
        <h2>Missing required information</h2>
        <p>Some required information is missing to load this activity.</p>
        <button onClick={() => window.history.back()}>Back to Selection</button>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading color activity...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="error-container">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => window.history.back()}>Back to Selection</button>
        </div>
      );
    }
    
    return (
      <div className="error-container">
        <h2>No questions available</h2>
        <p>Please try again later or contact your teacher.</p>
        <button onClick={() => window.history.back()}>Back to Activities</button>
      </div>
    );
  }

  return (
    <div className="color-easy-container">
      {/* Moving clouds background */}
      <div className="clouds-container">
        <div className="cloud cloud1"><Cloud /></div>
        <div className="cloud cloud2"><Cloud /></div>
        <div className="cloud cloud3"><Cloud /></div>
        <div className="cloud cloud4"><Cloud /></div>
        <div className="cloud cloud5"><Cloud /></div>
      </div>
      
      {/* Top navigation */}
      <div className="top-nav">
        <div className="back-button" onClick={handleBackClick}>
          <BackButton />
        </div>
        
        <div className="timer">{formatTime(timer)}</div>
        
        <div className="hearts">
          {hearts.map((heart, index) => (
            <div 
              key={index}
              className={`heart ${currentHeartIndex === index ? "heart-breaking heart-stage-" + heartBreakingStage : ""}`}
            >
              {heart ? <HeartFull /> : <HeartBroken />}
            </div>
          ))}
        </div>
      </div>
      
      {/* Main content container */}
      <div className={`content-wrapper ${isCorrect ? 'correct-answer' : ''} ${isWrong ? 'wrong-answer' : ''}`}>
        <div className="animation-container">
          {/* Display the media content from database here */}
          {questions[currentQuestion] && (
            <div className={`question-display question-${currentQuestion + 1}`} style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            }}>
              <MediaContent 
                mediaType={questions[currentQuestion].mediaType} 
                mediaContent={questions[currentQuestion].mediaContent}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Question text in cloud container */}
      <div className="question-container">
        <CloudContainer>
          <h2 className="question-text">
            {questions[currentQuestion]?.text || "Loading question..."}
          </h2>
        </CloudContainer>
      </div>
      
      {/* Sound button - now showing speaking indicator */}
      <div className="sound-button" onClick={toggleSound}>
        <SoundButton muted={muted} isSpeaking={isSpeaking} />
      </div>
      
      {/* Party popper animation */}
      {showPopper && (
        <>
          <div className="popper popper-left">
            <PopperImage />
          </div>
          <div className="popper popper-right">
            <PopperImage />
          </div>
        </>
      )}
      
      {/* Text bubbles for feedback */}
      {showCorrect && (
        <div className="text-bubble correct-bubble">
          <CorrectBubble />
        </div>
      )}
      
      {showGoodJob && (
        <div className="text-bubble good-job-bubble">
          <GoodJobBubble />
        </div>
      )}
      
      {/* Celebration emojis for correct answers */}
      {showEmojis && (
        <div className="emoji-celebration">
          <div className="emoji emoji-1">
            <SmilingEmoji />
          </div>
          <div className="emoji emoji-2">
            <ExcitedEmoji />
          </div>
          <div className="emoji emoji-3">
            <PartyEmoji />
          </div>
          <div className="celebration-text">Yeeheyy!</div>
        </div>
      )}
      
      {/* Enhanced Game win screen */}
      {gameWon && (
        <div className="game-result win-result">
          <WinCelebration />
          <button className="play-again-btn" onClick={() => window.location.reload()}>Play Again</button>
          <button className="back-btn" onClick={() => window.history.back()}>Back to Selection</button>
        </div>
      )}
      
     {/* Enhanced Game over screen */}
     {gameOver && !gameWon && (
        <div className="game-result lose-result">
          <LoseAnimation />
          <button className="play-again-btn" onClick={() => window.location.reload()}>Try Again</button>
          <button className="back-btn" onClick={() => window.history.back()}>Back to Selection</button>
        </div>
      )}
      
      {/* Simplified instructions overlay */}
      {showInstructions && (
        <div className="instruction-overlay" onClick={startGame}>
          <div className="instruction-content">
            <h2>Color Quest! 🌈</h2>
            <div className="instruction-steps">
              <div className="step">
                <div className="step-number">1</div>
                <p>Look at the picture</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <p>Answer the question with your device</p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <p>Win before time runs out!</p>
              </div>
            </div>
            <div className="instruction-note">
              <p>Click the sound button to hear the question read aloud!</p>
            </div>
            <div className="waiting-status">
              {waitingForAnswer ? 'Waiting for your answer...' : 'Game will start soon!'}
            </div>
            <div className="pulse-button">Tap to Start!</div>
          </div>
        </div>
      )}
      
      {/* Exit confirmation modal */}
      {showExitModal && <ExitConfirmationModal />}

      {/* Countdown overlay */}
      {isCountingDown && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdown}</div>
        </div>
      )}
      
      {/* Status indicator showing if we're waiting for user answer */}
      {!showInstructions && waitingForAnswer && !gameOver && !gameWon && (
        <div className="answer-status-indicator">
          Waiting for your answer...
        </div>
      )}
      
      {/* Speech status indicator */}
      {isSpeaking && (
        <div className="speech-indicator">
          <div className="sound-wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
      
      {/* Audio elements for media */}
      <audio ref={popperSoundRef} src="/src/assets/pop.mp3" preload="auto"></audio>
      <audio ref={heartbreakSoundRef} src="/src/assets/wrong_2.mp3" preload="auto"></audio>
      <audio ref={successSoundRef} src="/src/assets/success_2.mp3" preload="auto"></audio>
      <audio ref={finalSuccessSoundRef} src="/src/assets/success_3.mp3" preload="auto"></audio>
      <audio ref={yeheySoundRef} src="/src/assets/yeyy.mp3" preload="auto"></audio>
    </div>
  );
};

export default DLActivitiesShapeEasy;