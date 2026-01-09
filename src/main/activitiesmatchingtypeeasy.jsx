import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './rfid.css';
import { database } from '../config'; // Import database instead of db
import { ref, onValue, off, set } from "firebase/database";
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
    <p className="win-message">You're a matching expert! 🎯</p>
  </div>
);

const LoseAnimation = () => (
  <div className="lose-animation">
    <svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="75" cy="75" r="70" fill="#FFD54F" />
      <circle cx="50" cy="60" r="8" fill="#000" />
      <circle cx="100" cy="60" r="8" fill="#000" />
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

// MediaContent Component for displaying images from database
const MediaContent = ({ mediaContent, status = null }) => {
  if (!mediaContent) {
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

  try {
    // Create data URL from base64 string
    let mediaUrl;
    
    if (typeof mediaContent === 'string') {
      if (mediaContent.startsWith('data:')) {
        mediaUrl = mediaContent;
      } else {
        // Add appropriate prefix for image
        const prefix = 'data:image/jpeg;base64,';
        mediaUrl = prefix + mediaContent;
      }
      
      // Apply different border colors based on answer status
      let borderStyle = {};
      if (status === 'correct') {
        borderStyle = {
          border: '6px solid #4CAF50', // Thicker green border for correct
          boxShadow: '0 0 15px rgba(76, 175, 80, 0.7)'
        };
      } else if (status === 'incorrect') {
        borderStyle = {
          border: '4px solid #F44336', // Red border for incorrect
          boxShadow: '0 0 10px rgba(244, 67, 54, 0.7)'
        };
      } else {
        borderStyle = {
          border: '4px solid #2196F3', // Blue border for neutral/waiting
          boxShadow: '0 0 10px rgba(33, 150, 243, 0.7)'
        };
      }
      
      // Add animation class for correct answers
      const animationClass = status === 'correct' ? 'correct-image-pulse' : '';
      
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          borderRadius: '10px',
          transition: 'all 0.3s ease',
          ...borderStyle
        }} className={animationClass}>
          <img 
            src={mediaUrl} 
            alt="Matching Item" 
            className={`question-media ${status === 'correct' ? 'correct-image' : ''}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '6px'
            }}
          />
        </div>
      );
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
};

const ActivitiesMatchingTypeEasy = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [hearts, setHearts] = useState([true, true, true]); // Three full hearts initially
  const [imageWrongAttempts, setImageWrongAttempts] = useState({});
  const [timer, setTimer] = useState(120); // 1 minute timer
  const [startTime, setStartTime] = useState(null); // Track when the game started
  const [elapsedTime, setElapsedTime] = useState(0); // Time spent in game
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
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if question is being spoken
  const [progressSaved, setProgressSaved] = useState(false); // Track if progress has been saved
  const [questionResults, setQuestionResults] = useState([]); // Track results for each question
  const [score, setScore] = useState(0); // Track correct answers
  
  // New state for RFID matching game
  const [imageStatuses, setImageStatuses] = useState([]);
  const [waitingForUIDs, setWaitingForUIDs] = useState(true);
  const [currentRFIDs, setCurrentRFIDs] = useState({
    uid1: null,
    uid2: null, 
    uid3: null
  });
  const [correctAnswers, setCorrectAnswers] = useState({
    uid1: false,
    uid2: false,
    uid3: false
  });
  
  // Get props from router location
  const location = useLocation();
  const navigate = useNavigate();
  const { studentID, category, difficulty, questionIDs } = location.state || {};
  
  // Access the audio context
  const { toggleAudio, isPlaying, pauseAudio } = useAudio();

  // Audio references for sound effects
  const successSoundRef = useRef(null);
  const finalSuccessSoundRef = useRef(null);
  const heartbreakSoundRef = useRef(null);
  const yeheySoundRef = useRef(null);

  // API URLs
  const API_BASE_URL = 'http://localhost:8000';

  // Initialize sound effects
  useEffect(() => {
    // Create audio elements for sound effects
    heartbreakSoundRef.current = new Audio(wrongSound);
    successSoundRef.current = new Audio(successSound2);
    finalSuccessSoundRef.current = new Audio(successSound3);
    yeheySoundRef.current = new Audio(yeheySound);
    
    // Clean up audio resources when component unmounts
    return () => {
      const audioRefs = [
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

  // Initialize the component and print debug info for loaded questions
  useEffect(() => {
    if (questions.length > 0 && !loading) {
      console.log("RFID Matching Game initialized with questions:", questions.map(q => ({
        id: q.questionID,
        text: q.question,
        uid1: q.uid1,
        uid2: q.uid2,
        uid3: q.uid3
      })));
      
      // Initialize Firebase with empty UIDs to start clean
      try {
        const uid1Ref = ref(database, 'uid1');
        const uid2Ref = ref(database, 'uid2');
        const uid3Ref = ref(database, 'uid3');
        
        set(uid1Ref, "");
        set(uid2Ref, "");
        set(uid3Ref, "");
        
        console.log("Firebase UIDs cleared on initialization");
      } catch (error) {
        console.error("Error clearing Firebase UIDs:", error);
      }
    }
  }, [questions, loading]);
  
  // Debug function for quickly testing UIDs (for development only)
  const testUIDs = () => {
    if (!questions[currentQuestion]) return;
    
    const currentQ = questions[currentQuestion];
    console.log("Testing UIDs for current question:", currentQ);
    
    // Only use in development environment
    if (process.env.NODE_ENV === 'development') {
      try {
        // Write expected UIDs to Firebase for testing
        const uid1Ref = ref(database, 'uid1');
        const uid2Ref = ref(database, 'uid2');
        const uid3Ref = ref(database, 'uid3');
        
        set(uid1Ref, currentQ.uid1);
        set(uid2Ref, currentQ.uid2);
        set(uid3Ref, currentQ.uid3);
        
        console.log("Test UIDs written to Firebase");
      } catch (error) {
        console.error("Error writing test UIDs:", error);
      }
    }
  };

  // Function to speak the question using Web Speech API with child-like voice
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
    
    // Try to find a child-like voice
    const childVoice = voices.find(voice => 
      voice.name.includes('Ivy') || 
      voice.name.includes('Google UK English Female') || 
      voice.name.includes('Microsoft Zira')
    );
    
    if (childVoice) {
      console.log("Using child-like voice:", childVoice.name);
      utterance.voice = childVoice;
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

 // Function to save progress to the database
// Improved saveProgress function for the RFID Matching Game
const saveProgress = async () => {
  if (progressSaved) return; // Prevent duplicate saves
  
  try {
    // Calculate the time spent in seconds properly
    const maxGameTimeSeconds = 120; // Maximum time of the game is 2:00 minutes (120 seconds)
    const timeSpent = Math.min(elapsedTime, maxGameTimeSeconds); // Cap at max game time
    
    // Format the time as "minutes:seconds" (mm:ss)
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    console.log("Time spent on activity:", timeSpent, "seconds, formatted as:", formattedTime);
    
    // Ensure question results are properly set before saving
    // This is important for tracking which questions were answered correctly
    const updatedResults = [...questionResults];
    
    // Make sure we have results for all questions that were answered correctly
    for (let i = 0; i < questions.length; i++) {
      // If this question has all images correct, make sure it's marked as correct
      if (imageStatuses[i] && imageStatuses[i].every(status => status === 'correct')) {
        updatedResults[i] = true;
      }
    }
    
    // Format the question results for API (convert to ✓, X, or N/A)
    const formattedResults = updatedResults.map(result => {
      if (result === null) return 'N/A';
      return result ? '✓' : 'X';
    });
    
    // Get the question texts
    const questionTexts = questions.map(q => q.text || 'N/A');
    
    // Calculate the final score (number of correct answers)
    const correctCount = updatedResults.filter(result => result === true).length;
    
    // Create the payload
    const payload = {
      studentID,
     
      category,
      difficulty,
      questionResults: formattedResults,
      questionTexts: questionTexts, // Include the question texts
      timeallotment: formattedTime,
      score: correctCount // Use the calculated correct count as the score
    };
    
    console.log("Saving progress with payload:", payload);
    
    // Send the data to the API
    const response = await fetch(`${API_BASE_URL}/save_activity_progress.php`, {
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
  // Fetch questions using the questionIDs from props
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
      
      console.log("Fetching questions with URL:", `${API_BASE_URL}/fetch_rfid_questions.php?questionIDs=${questionIDsString}`);
      
      // Fetch questions by IDs
      const response = await fetch(`${API_BASE_URL}/fetch_rfid_questions.php?questionIDs=${questionIDsString}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // First check if we can get the text response
      const text = await response.text();
      
      if (!text || text.trim() === '') {
        throw new Error("Received empty response from server");
      }
      
      console.log("Received response length:", text.length);
      
      // Parse the JSON response
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        throw new Error(`Failed to parse JSON response: ${error.message}. Response start: ${text.substring(0, 100)}...`);
      }
      
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch questions");
      }
      
      // Format the questions data, including expected UID values and all three image contents
      const formattedQuestions = data.questions.map(q => ({
        id: q.questionID,
        questionID: q.questionID,
        text: q.question,
        uid1: q.uid1, // Storing UID values directly with these keys
        uid2: q.uid2,
        uid3: q.uid3,
        image1_content: q.image1_content,
        image2_content: q.image2_content,
        image3_content: q.image3_content,
        mediaType: q.media_type
      }));
      
      console.log("Fetched questions with UIDs:", formattedQuestions.map(q => ({
        id: q.id,
        uid1: q.uid1,
        uid2: q.uid2,
        uid3: q.uid3
      })));
      
      setQuestions(formattedQuestions);
      
      // Initialize the image statuses array for all questions
      const initialImageStatuses = formattedQuestions.map(() => [null, null, null]);
      setImageStatuses(initialImageStatuses);
      
      // Initialize the question results array
      setQuestionResults(new Array(formattedQuestions.length).fill(null));
      
      setLoading(false);
      setWaitingForUIDs(true); // Start waiting for UIDs after loading questions
      
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError(`Failed to load questions: ${err.message}`);
      setLoading(false);
    }
  };
  
  fetchQuestions();
}, [questionIDs]);

  // Set start time when game starts
  useEffect(() => {
    if (!showInstructions && !startTime) {
      setStartTime(Date.now());
    }
  }, [showInstructions, startTime]);
  
  // Update elapsed time
  useEffect(() => {
    if (startTime && !gameOver && !gameWon) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [startTime, gameOver, gameWon]);

  // Listen for UID values from Firebase Realtime Database
 // Listen for UID values from Firebase Realtime Database
useEffect(() => {
  if (loading || !waitingForUIDs || questions.length === 0) {
    return;
  }

  console.log("Setting up Firebase listeners for UID values");
  console.log("Current question expected UIDs:", {
    uid1: questions[currentQuestion]?.uid1,
    uid2: questions[currentQuestion]?.uid2,
    uid3: questions[currentQuestion]?.uid3
  });
  
  // References to the UID nodes
  const uid1Ref = ref(database, 'uid1');
  const uid2Ref = ref(database, 'uid2');
  const uid3Ref = ref(database, 'uid3');
  
  // Set up real-time listeners for each UID
  const handleUID1Change = (snapshot) => {
    if (snapshot.exists()) {
      const uid1Value = snapshot.val();
      if (uid1Value && uid1Value.toString().trim() !== "") {
        console.log("Firebase UID1 value received:", uid1Value);
        setCurrentRFIDs(prev => ({ ...prev, uid1: uid1Value }));
        
        // Check if this UID matches the expected one
        checkUID(uid1Value, 'uid1', 0);
      }
    }
  };
  
  const handleUID2Change = (snapshot) => {
    if (snapshot.exists()) {
      const uid2Value = snapshot.val();
      if (uid2Value && uid2Value.toString().trim() !== "") {
        console.log("Firebase UID2 value received:", uid2Value);
        setCurrentRFIDs(prev => ({ ...prev, uid2: uid2Value }));
        
        // Check if this UID matches the expected one
        checkUID(uid2Value, 'uid2', 1);
      }
    }
  };
  
  const handleUID3Change = (snapshot) => {
    if (snapshot.exists()) {
      const uid3Value = snapshot.val();
      if (uid3Value && uid3Value.toString().trim() !== "") {
        console.log("Firebase UID3 value received:", uid3Value);
        setCurrentRFIDs(prev => ({ ...prev, uid3: uid3Value }));
        
        // Check if this UID matches the expected one
        checkUID(uid3Value, 'uid3', 2);
      }
    }
  };
  
  // Clean existing values before attaching listeners
  try {
    set(uid1Ref, "");
    set(uid2Ref, "");
    set(uid3Ref, "");
    console.log("Cleared existing Firebase UID values");
  } catch (error) {
    console.error("Error clearing Firebase UIDs:", error);
  }
  
  // Attach listeners
  onValue(uid1Ref, handleUID1Change);
  onValue(uid2Ref, handleUID2Change);
  onValue(uid3Ref, handleUID3Change);
  
  // Clean up listeners on component unmount or when not waiting anymore
  return () => {
    console.log("Cleaning up Firebase listeners");
    off(uid1Ref);
    off(uid2Ref);
    off(uid3Ref);
  };
}, [loading, waitingForUIDs, questions, currentQuestion]);
  
 // Function to check if a UID matches the expected value
 const checkUID = (uidValue, uidKey, imageIndex) => {
  if (!waitingForUIDs || !questions[currentQuestion]) return;
  
  const currentQ = questions[currentQuestion];
  
  // Get the expected UID value directly from the question object
  const expectedUIDValue = currentQ[uidKey];
  
  console.log(`Checking ${uidKey}:
  - Received from Firebase: "${uidValue}" (${typeof uidValue})
  - Expected from Database: "${expectedUIDValue}" (${typeof expectedUIDValue})
  `);
  
  // Convert both to strings and do a direct comparison
  let isCorrect = false;
  
  // Handle the case where the value might be null in the database
  if (expectedUIDValue === null || expectedUIDValue === undefined || expectedUIDValue === "") {
    console.log(`Expected UID value is empty/null for ${uidKey}`);
    isCorrect = false;
  } else {
    // Convert both to strings and trim whitespace for comparison
    const receivedStr = String(uidValue).trim();
    const expectedStr = String(expectedUIDValue).trim();
    
    // Do the comparison
    isCorrect = receivedStr === expectedStr;
    console.log(`String comparison: "${receivedStr}" === "${expectedStr}" => ${isCorrect}`);
  }
  
  // Only update if this image isn't already correct
  // This ensures we don't overwrite a 'correct' status with 'incorrect'
  const currentStatus = imageStatuses[currentQuestion][imageIndex];
  
  if (currentStatus !== 'correct') {
    // Update the image status for this specific UID
    const newImageStatuses = [...imageStatuses];
    newImageStatuses[currentQuestion][imageIndex] = isCorrect ? 'correct' : 'incorrect';
    setImageStatuses(newImageStatuses);
    
    // Update the correct answers state only if it's correct or was previously not correct
    if (isCorrect) {
      setCorrectAnswers(prev => ({
        ...prev,
        [uidKey]: true
      }));
      
      console.log(`✅ CORRECT: ${uidKey} matches for image ${imageIndex + 1}`);
      playCorrectSound(imageIndex);
    } else {
      // Only set to false if it wasn't already true (preserve correct statuses)
      if (!correctAnswers[uidKey]) {
        setCorrectAnswers(prev => ({
          ...prev,
          [uidKey]: false
        }));
        
        console.log(`❌ INCORRECT: ${uidKey} does not match for image ${imageIndex + 1}`);
        playWrongSound();
        
        // Pass the UID key to handleWrongAnswer
        handleWrongAnswer(uidKey);
      }
    }
  } else {
    console.log(`Image ${imageIndex + 1} already marked as correct, ignoring scan`);
  }
  
  // Reset the UID value in Firebase after processing
  try {
    const uidRef = ref(database, uidKey);
    set(uidRef, "");
    console.log(`Reset ${uidKey} in Firebase after processing`);
  } catch (error) {
    console.error(`Error resetting ${uidKey} in Firebase:`, error);
  }
  
  // Check if all UIDs for this question are correctly matched
  setTimeout(() => {
    checkAllUIDsCorrect();
  }, 500);
};
  
const checkAllUIDsCorrect = () => {
  console.log("Checking if all UIDs are correct:", correctAnswers);
  
  // Check if all images have a 'correct' status instead of checking correctAnswers
  const allImagesCorrect = imageStatuses[currentQuestion] && 
                          imageStatuses[currentQuestion].every(status => status === 'correct');
  
  if (!allImagesCorrect) {
    console.log("Not all images are correct yet. Waiting for more correct matches.");
    return;
  }
  
  console.log("🎉 SUCCESS! All images for this question are correct!");
  
  // Show celebration
  handleQuestionComplete();
  
  // Update question results
  const updatedResults = [...questionResults];
  updatedResults[currentQuestion] = true; // Mark as correct
  setQuestionResults(updatedResults);
  
  // Increase score
  setScore(prevScore => prevScore + 1);
  
  // Reset correct answers for next question after a delay
  setTimeout(() => {
    setCorrectAnswers({
      uid1: false,
      uid2: false,
      uid3: false
    });
    
    // Clear Firebase values
    try {
      const uid1Ref = ref(database, 'uid1');
      const uid2Ref = ref(database, 'uid2');
      const uid3Ref = ref(database, 'uid3');
      
      set(uid1Ref, "");
      set(uid2Ref, "");
      set(uid3Ref, "");
      console.log("Reset all Firebase UIDs after successful question");
    } catch (error) {
      console.error("Error resetting Firebase UIDs:", error);
    }
    
    // Move to next question or end game if this was the last question
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      console.log("Moving to next question");
      
      // Reset image statuses for the new question
      const newImageStatuses = [...imageStatuses];
      newImageStatuses[currentQuestion + 1] = [null, null, null];
      setImageStatuses(newImageStatuses);
      
      // Announce the new question (optional)
      setTimeout(() => {
        if (!muted) {
          speakQuestion();
        }
      }, 1000);
    } else {
      // Game won!
      setGameWon(true);
      console.log("Game completed successfully!");
      saveProgress();
    }
  }, 2000);
};
  // Play correct answer sound
  const playCorrectSound = (imageIndex) => {
    if (muted) return;
    
    try {
      // Play a different success sound based on which image was matched
      const soundToPlay = imageIndex === 2 ? successSoundRef.current : new Audio(successSound2);
      soundToPlay.play();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };
  
  // Play wrong answer sound
  const playWrongSound = () => {
    if (muted) return;
    
    try {
      heartbreakSoundRef.current.play();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  // Handle question complete (all UIDs correct)
  const handleQuestionComplete = () => {
    setIsCorrect(true);
    setShowPopper(true);
    setShowEmojis(true);
    setShowCorrect(true);
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Play celebration sounds with error handling
    if (!muted) {
      try {
        finalSuccessSoundRef.current.play();
        
        setTimeout(() => {
          yeheySoundRef.current.play();
        }, 300);
      } catch (error) {
        console.error("Error playing celebration sounds:", error);
      }
    }
    
    // Show "Good job!" bubble after delay
    setTimeout(() => {
      setShowGoodJob(true);
    }, 1000);
    
    // Set timeout to reset celebration animation
    setTimeout(() => {
      setShowPopper(false);
      setIsCorrect(false);
      setShowEmojis(false);
      setShowGoodJob(false);
      setShowCorrect(false);
    }, 3000);
  };

  // Handle wrong answer
  const handleWrongAnswer = (uidKey) => {
    setIsWrong(true);
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Keep track of incorrect cards for this question
    const updatedImageWrongAttempts = { ...imageWrongAttempts };
    
    // If this question hasn't been tracked yet, initialize it
    if (!updatedImageWrongAttempts[currentQuestion]) {
      updatedImageWrongAttempts[currentQuestion] = new Set();
    }
    
    // Only decrease heart if this particular card hasn't been marked wrong before for this question
    if (!updatedImageWrongAttempts[currentQuestion].has(uidKey)) {
      updatedImageWrongAttempts[currentQuestion].add(uidKey);
      setImageWrongAttempts(updatedImageWrongAttempts);
      
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
              saveProgress();
            }, 1000);
          }
        }, 1000);
      }
    }
    
    // Reset wrong answer state
    setTimeout(() => {
      setIsWrong(false);
      setCurrentHeartIndex(-1);
      setHeartBreakingStage(0);
    }, 1500);
  };
  // Countdown timer logic
  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const intervalId = setInterval(() => {
        setCountdown(prevCount => prevCount - 1);
      }, 1000);
      
      return () => clearInterval(intervalId);
    } else if (isCountingDown && countdown === 0) {
      setIsCountingDown(false);
      setWaitingForUIDs(true); // Resume waiting for UIDs after countdown
    }
  }, [isCountingDown, countdown]);

  // Handle game timer
  useEffect(() => {
    if (timer > 0 && !gameOver && !gameWon && !showInstructions && !loading) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setGameOver(true);
      saveProgress();
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

  // Toggle sound and speaking functionality
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
    setWaitingForUIDs(true); // Start waiting for UIDs when game starts
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
      // Pause waiting for UIDs
      setWaitingForUIDs(false);
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

  // If no questions were found or missing required data
  if (!studentID || !category || !difficulty) {
    return (
      <div className="error-container">
        <h2>Missing required information</h2>
        <p>Some required information is missing to load this activity.</p>
        <button onClick={() => window.history.back()}>Back to Selection</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading matching activity...</p>
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
  
  if (!questions || questions.length === 0) {
    return (
      <div className="error-container">
        <h2>No questions available</h2>
        <p>Please try again later or contact your teacher.</p>
        <button onClick={() => window.history.back()}>Back to Activities</button>
      </div>
    );
  }

  return (
    <div className="rfid-matching-container">
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
  {[...Array(3)].map((_, index) => (
    <div 
      key={index}
      className={`heart ${currentHeartIndex === index ? "heart-breaking heart-stage-" + heartBreakingStage : ""}`}
    >
      {hearts[index] ? <HeartFull /> : <HeartBroken />}
    </div>
  ))}
</div>
      </div>
      
      {/* Main content container with three images side by side */}
      <div className={`matching-content-wrapper ${isCorrect ? 'correct-answer' : ''} ${isWrong ? 'wrong-answer' : ''}`}>
        {/* Display the three images from database side by side */}
        {questions[currentQuestion] && (
          <div className="matching-images-container">
            {/* First Image Container */}
            <div className="matching-image-box">
              <MediaContent 
                mediaContent={questions[currentQuestion].image1_content}
                status={imageStatuses[currentQuestion]?.[0]}
              />
              <div className="image-label">Card 1</div>
            </div>
            
            {/* Second Image Container */}
            <div className="matching-image-box">
              <MediaContent 
                mediaContent={questions[currentQuestion].image2_content}
                status={imageStatuses[currentQuestion]?.[1]}
              />
              <div className="image-label">Card 2</div>
            </div>
            
            {/* Third Image Container */}
            <div className="matching-image-box">
              <MediaContent 
                mediaContent={questions[currentQuestion].image3_content}
                status={imageStatuses[currentQuestion]?.[2]}
              />
              <div className="image-label">Card 3</div>
            </div>
          </div>
        )}
      </div>
            {/* Question text in cloud container */}
      <div className="question-container">
        <CloudContainer>
          <h2 className="question-text">
            {questions[currentQuestion]?.text || "Loading question..."}
          </h2>
        </CloudContainer>
      </div>
      
      
      {/* Sound button with speaking indicator */}
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
      
      {/* Game win screen */}
      {gameWon && (
        <div className="game-result win-result">
          <WinCelebration />
          <button className="play-again-btn" onClick={() => window.location.reload()}>Play Again</button>
          <button className="back-btn" onClick={() => window.history.back()}>Back to Selection</button>
        </div>
      )}
      
     {/* Game over screen */}
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
      <h2>RFID Matching Game! 🎯</h2>
      <div className="instruction-steps">
        <div className="step">
          <div className="step-number">1</div>
          <p>Look at the three images</p>
        </div>
        <div className="step">
          <div className="step-number">2</div>
          <p>Scan the correct RFID card for each image</p>
        </div>
        <div className="step">
          <div className="step-number">3</div>
          <p>Each image needs the right card!</p>
        </div>
      </div>
      <div className="instruction-note">
        <p>Click the sound button to hear the question read aloud!</p>
        <p>You have 2 minutes to complete as many matches as you can.</p>
      </div>
      <div className="waiting-status">
        Tap anywhere to start!
      </div>
      <div className="pulse-button">Start Game!</div>
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
      
      {/* Status indicator showing we're waiting for RFID cards */}
      {!showInstructions && waitingForUIDs && !gameOver && !gameWon && (
        <div className="answer-status-indicator">
          Waiting for RFID cards...
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
    </div>
  );
};

export default ActivitiesMatchingTypeEasy;