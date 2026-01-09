import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiSettings, FiChevronLeft } from 'react-icons/fi';
import { FaVolumeUp } from 'react-icons/fa';
import Settings from './settings';
import './VideoGames.css';
// Import click sound to maintain consistency with other components
import clickSound from "/src/assets/click_button.mp3";
// Import Firebase modules for Realtime Database
import { database } from '../config'; // Make sure this path matches your Firebase config
import { ref, onValue, off, set } from "firebase/database";

const VideoGames = () => {
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  
  // Extract data from location.state
  const { studentID, selectedType, category, from } = location.state || {};
  
  // Map the category from SelectActivities format to database format
  const getCategoryForDatabase = (selectedCategory) => {
    const categoryMap = {
      'COLOR': 'colors',
      'NUMBER': 'numbers',
      'SHAPE': 'shapes',
      'ANIMALS': 'animals',
      'MONEY': 'money',
      'MATCHINGTYPE': 'matchingtype'
    };
    
    return categoryMap[selectedCategory] || selectedCategory?.toLowerCase() || '';
  };
  
  const formattedCategory = getCategoryForDatabase(category);
  
  // Game state variables
  const [easyGameData, setEasyGameData] = useState(null);
  const [mediumGameData, setMediumGameData] = useState(null);
  const [hardGameData, setHardGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Video stage tracking
  const [currentDifficulty, setCurrentDifficulty] = useState('easy'); // easy, medium, hard
  const [currentStage, setCurrentStage] = useState('intro'); // intro, map, lesson, question, question1, etc.
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [startButtonVisible, setStartButtonVisible] = useState(false);
  const [startTimer, setStartTimer] = useState(null);
  const [answerTimer, setAnswerTimer] = useState(null);
  const [videoEnded, setVideoEnded] = useState(false);
  
  // ADDED: Firebase answer tracking
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [lastProcessedAnswer, setLastProcessedAnswer] = useState('');
  
  // Track questions answered - UPDATED to match database structure
  const [answeredQuestions, setAnsweredQuestions] = useState({
    easy: false,
    medium: {
      question1: false,
      question2: false
    },
    hard: {
      question1: false,
      question2: false,
      question3: false
    }
  });
  
  // Track unanswered questions for later revisit
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  
  // Track if we're in the revisit stage
  const [isRevisitingQuestions, setIsRevisitingQuestions] = useState(false);
  
  // Track if all questions are answered
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);

  // Track current revisit question
  const [currentRevisitQuestion, setCurrentRevisitQuestion] = useState(null);
  
  // API URLs
  const EASY_API_URL = 'http://localhost:8000/game_easy.php';
  const MEDIUM_API_URL = 'http://localhost:8000/game_medium.php';
  const HARD_API_URL = 'http://localhost:8000/game_hard.php';
  
  // Create audio element for click sound
  const buttonClickSound = new Audio(clickSound);

  // ADDED: Firebase Listener for user answers
  useEffect(() => {
    if (!waitingForAnswer && !startButtonVisible) {
      return; // Only set up listener when waiting for an answer or showing start button
    }

    console.log("Setting up Firebase Realtime DB listener for user answers");
    
    // Reference to the userAnswers node
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
            answer = data.answer;
          } else if (typeof data === 'string') {
            // If it's just a string directly
            answer = data;
          }
          
          // Process any non-empty answer that's different from the last one
          if (answer && answer.trim() !== '' && answer.toLowerCase() !== lastProcessedAnswer.toLowerCase()) {
            console.log("Processing answer from Firebase:", answer);
            
            // Handle "Start" command for the intro screen
            if (startButtonVisible && answer.toLowerCase() === "start") {
              console.log("Received Start command from Firebase");
              handleStart();
            }
            // Handle answers for questions
            else if (waitingForAnswer) {
              setLastProcessedAnswer(answer);
              setUserAnswer(answer);
              
              // Submit the answer
              submitAnswer(answer);
            }
            
            // Clear the answer property while keeping the node
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
  }, [waitingForAnswer, startButtonVisible, lastProcessedAnswer]);

  // Get answer type based on expected answer
  const getAnswerType = () => {
    // Get the expected answer format
    let expectedAnswer = '';
    
    if (isRevisitingQuestions && currentRevisitQuestion) {
      expectedAnswer = currentRevisitQuestion.correctAnswer;
    } else if (currentDifficulty === 'easy') {
      expectedAnswer = easyGameData?.correct_answer || '';
    } else if (currentDifficulty === 'medium') {
      if (currentStage === 'question1') {
        expectedAnswer = mediumGameData?.answer1 || '';
      } else if (currentStage === 'question2') {
        expectedAnswer = mediumGameData?.answer2 || '';
      }
    } else if (currentDifficulty === 'hard') {
      if (currentStage === 'question1') {
        expectedAnswer = hardGameData?.answer1 || '';
      } else if (currentStage === 'question2') {
        expectedAnswer = hardGameData?.answer2 || '';
      } else if (currentStage === 'question3') {
        expectedAnswer = hardGameData?.answer3 || '';
      }
    }
    
    console.log('Determining answer type based on expected answer:', expectedAnswer);
    
    // Determine type based on expected answer
    if (expectedAnswer === 'Yes' || expectedAnswer === 'No') {
      return 'yesno';
    } else if (['Red', 'Blue', 'Green', 'Yellow'].includes(expectedAnswer)) {
      return 'color';
    } else if (!isNaN(expectedAnswer) || /^\d+$/.test(expectedAnswer)) {
      return 'number';
    } else {
      return 'text'; // Default to text for other answer types
    }
  };

  // Determine appropriate instruction based on category and current stage
  const getInstructionText = () => {
    if (startButtonVisible) {
      return "Tap Enter";
    }
    
    if (!showAnswerInput) {
      return null;
    }
    
    // Get the expected answer format
    let expectedAnswer = '';
    
    if (isRevisitingQuestions && currentRevisitQuestion) {
      expectedAnswer = currentRevisitQuestion.correctAnswer;
    } else if (currentDifficulty === 'easy') {
      expectedAnswer = easyGameData?.correct_answer || '';
    } else if (currentDifficulty === 'medium') {
      if (currentStage === 'question1') {
        expectedAnswer = mediumGameData?.answer1 || '';
      } else if (currentStage === 'question2') {
        expectedAnswer = mediumGameData?.answer2 || '';
      }
    } else if (currentDifficulty === 'hard') {
      if (currentStage === 'question1') {
        expectedAnswer = hardGameData?.answer1 || '';
      } else if (currentStage === 'question2') {
        expectedAnswer = hardGameData?.answer2 || '';
      } else if (currentStage === 'question3') {
        expectedAnswer = hardGameData?.answer3 || '';
      }
    }
    
    console.log('Expected answer format:', expectedAnswer);
    
  
  };

  // Function to play button click sound
  const playButtonClickSound = () => {
    buttonClickSound.currentTime = 0; // Reset audio to start
    buttonClickSound.play();
  };

  // IMPROVED: Function to get video URL based on difficulty
  const getVideoUrl = (path, difficulty) => {
    if (!path) return null;
    
    // If it's already a full URL, return it
    if (path.startsWith('http')) return path;
    
    // Add debug information for path handling
    console.log(`Building URL for ${difficulty} path: ${path}`);
    
    // Use appropriate API URL based on difficulty
    let apiUrl;
    switch(difficulty) {
      case 'medium':
        apiUrl = MEDIUM_API_URL;
        break;
      case 'hard':
        apiUrl = HARD_API_URL; // Make sure this points to your hard PHP handler
        break;
      default:
        apiUrl = EASY_API_URL;
    }
    
    // Return the video handler URL with the file parameter
    const videoUrl = `${apiUrl}?action=getVideo&file=${encodeURIComponent(path)}`;
    console.log(`Generated URL for ${difficulty}: ${videoUrl}`);
    return videoUrl;
  };

  // Block video control interactions
  useEffect(() => {
    const preventControls = (e) => {
      if (videoRef.current) {
        // Prevent right-click context menu
        e.preventDefault();
        return false;
      }
    };
    
    // Add event listener to window for right-click prevention
    window.addEventListener('contextmenu', preventControls);
    
    return () => {
      window.removeEventListener('contextmenu', preventControls);
    };
  }, []);

  // Prevent video from being paused
  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (videoElement) {
      const handlePause = () => {
        // If video is paused, play it immediately (except for question stages)
        if (videoElement.paused && !currentStage.includes('question') && !videoEnded) {
          videoElement.play().catch(err => console.error('Error forcing play:', err));
        }
      };
      
      videoElement.addEventListener('pause', handlePause);
      
      return () => {
        videoElement.removeEventListener('pause', handlePause);
      };
    }
  }, [currentStage, videoRef.current, videoEnded]);

  // Handle keyboard inputs for the game
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default actions for certain keys to avoid browser behaviors
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
      }
      
      // Handle START button with Enter key
      if (e.key === 'Enter' && startButtonVisible) {
        handleStart();
        return;
      }
      
      // Handle key press for answers when answer input is showing
      if (showAnswerInput) {
        const answerType = getAnswerType();
        
        if (answerType === 'color') {
          // For color questions
          if (e.key.toLowerCase() === 'r') {
            handleAnswerButtonClick('Red');
          } else if (e.key.toLowerCase() === 'y') {
            handleAnswerButtonClick('Yellow');
          } else if (e.key.toLowerCase() === 'g') {
            handleAnswerButtonClick('Green');
          } else if (e.key.toLowerCase() === 'b') {
            handleAnswerButtonClick('Blue');
          }
        } else if (answerType === 'yesno') {
          // For yes/no questions
          if (e.key.toLowerCase() === 'y') {
            handleAnswerButtonClick('Yes');
          } else if (e.key.toLowerCase() === 'n') {
            handleAnswerButtonClick('No');
          }
        } else if (answerType === 'number') {
          // For number questions
          if ('0123456789'.includes(e.key)) {
            handleAnswerButtonClick(e.key);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [startButtonVisible, showAnswerInput, formattedCategory]);

  // Fetch game data when component mounts
  useEffect(() => {
    console.log('Received in VideoGames:', { 
      originalCategory: category,
      formattedCategory: formattedCategory
    });
    
    // If category is missing, navigate back
    if (!category) {
      console.error('Category is missing');
      setError('Category is missing. Please select an activity.');
      return;
    }
    
    // Fetch game data for all difficulties
    fetchAllGameData();
  }, [category, formattedCategory]);

  // IMPROVED: Check if all questions have been answered
  useEffect(() => {
    // Only need to check if all hard questions have been answered
    const allHardAnswered = 
      answeredQuestions.hard.question1 &&
      answeredQuestions.hard.question2 &&
      answeredQuestions.hard.question3;
    
    console.log('Checking if all hard questions answered:', allHardAnswered);
    console.log('Current state of answered questions:', answeredQuestions);
    
    if (allHardAnswered) {
      console.log('All hard questions have been answered!');
      
      // If we're in hard difficulty and just completed question3/achievement3,
      // transition to final sequence
      if (currentDifficulty === 'hard' && 
          (currentStage === 'question3' || currentStage === 'achievement3')) {
        console.log('Hard question3/achievement3 completed, moving to hard final sequence');
        // Stay in hard difficulty to use hard videos for final sequence
        setCurrentStage('final_achievement');
        setVideoEnded(false);
      }
    }
  }, [answeredQuestions.hard, currentDifficulty, currentStage]);

  // NEW: Dedicated function to fetch hard game data
  const fetchHardGameData = async () => {
    try {
      console.log(`Fetching hard games for category '${formattedCategory}'`);
      const hardUrl = `${HARD_API_URL}?action=getGames&category=${formattedCategory}`;
      console.log(`Hard API URL: ${hardUrl}`);
      
      const hardResponse = await fetch(hardUrl);
      const hardData = await hardResponse.json();
      console.log('Hard games response:', hardData);
      
      if (hardData.success && hardData.games && hardData.games.length > 0) {
        const game = hardData.games[0];
        console.log('Found hard game data:', game);
        
        const processedHardGame = {
          ...game,
          map: game.map ? {
            ...game.map,
            videoUrl: getVideoUrl(game.map.path, 'hard')
          } : null,
          lesson: game.lesson ? {
            ...game.lesson,
            videoUrl: getVideoUrl(game.lesson.path, 'hard')
          } : null,
          question1: game.question1 ? {
            ...game.question1,
            videoUrl: getVideoUrl(game.question1.path, 'hard')
          } : null,
          achievement1: game.achievement1 ? {
            ...game.achievement1,
            videoUrl: getVideoUrl(game.achievement1.path, 'hard')
          } : null,
          question2: game.question2 ? {
            ...game.question2,
            videoUrl: getVideoUrl(game.question2.path, 'hard')
          } : null,
          achievement2: game.achievement2 ? {
            ...game.achievement2,
            videoUrl: getVideoUrl(game.achievement2.path, 'hard')
          } : null,
          question3: game.question3 ? {
            ...game.question3,
            videoUrl: getVideoUrl(game.question3.path, 'hard')
          } : null,
          achievement3: game.achievement3 ? {
            ...game.achievement3,
            videoUrl: getVideoUrl(game.achievement3.path, 'hard')
          } : null,
          final_achievement: game.final_achievement ? {
            ...game.final_achievement,
            videoUrl: getVideoUrl(game.final_achievement.path, 'hard')
          } : null,
          last_map: game.last_map ? {
            ...game.last_map,
            videoUrl: getVideoUrl(game.last_map.path, 'hard')
          } : null,
          outro: game.outro ? {
            ...game.outro,
            videoUrl: getVideoUrl(game.outro.path, 'hard')
          } : null
        };
        
        // Extra logging for achievement3
        console.log('Hard achievement3 path:', game.achievement3?.path);
        console.log('Hard achievement3 videoUrl:', processedHardGame.achievement3?.videoUrl);
        
        setHardGameData(processedHardGame);
        return processedHardGame;
      } else {
        console.error('No hard games found for category:', formattedCategory);
        return null;
      }
    } catch (err) {
      console.error('Error fetching hard game data:', err);
      return null;
    }
  };

  // Fetch all game data from APIs
  const fetchAllGameData = async () => {
    setLoading(true);
    try {
      // Fetch data for Easy level
      console.log(`Fetching easy games for category '${formattedCategory}'`);
      const easyUrl = `${EASY_API_URL}?action=getGames&category=${formattedCategory}`;
      console.log(`Easy API URL: ${easyUrl}`);
      
      // Fetch data for Medium level
      console.log(`Fetching medium games for category '${formattedCategory}'`);
      const mediumUrl = `${MEDIUM_API_URL}?action=getGames&category=${formattedCategory}`;
      console.log(`Medium API URL: ${mediumUrl}`);
      
      // Fetch data for Hard level
      console.log(`Fetching hard games for category '${formattedCategory}'`);
      const hardUrl = `${HARD_API_URL}?action=getGames&category=${formattedCategory}`;
      console.log(`Hard API URL: ${hardUrl}`);
      
      // Use Promise.all to fetch all data concurrently
      const [easyResponse, mediumResponse, hardResponse] = await Promise.all([
        fetch(easyUrl),
        fetch(mediumUrl),
        fetch(hardUrl)
      ]);
      
      const easyData = await easyResponse.json();
      const mediumData = await mediumResponse.json();
      const hardData = await hardResponse.json();
      
      console.log('Easy games response:', easyData);
      console.log('Medium games response:', mediumData);
      console.log('Hard games response:', hardData);
      
      // Process Easy game data
      if (easyData.success && easyData.games && easyData.games.length > 0) {
        // Process game data to add video URLs
        const game = easyData.games[0]; // Use the first game for this difficulty
        console.log('Found easy game data:', game);
        
        const processedEasyGame = {
          ...game,
          introduction: game.introduction ? {
            ...game.introduction,
            videoUrl: getVideoUrl(game.introduction.path, 'easy')
          } : null,
          map: game.map ? {
            ...game.map,
            videoUrl: getVideoUrl(game.map.path, 'easy')
          } : null,
          lesson: game.lesson ? {
            ...game.lesson,
            videoUrl: getVideoUrl(game.lesson.path, 'easy')
          } : null,
          question: game.question ? {
            ...game.question,
            videoUrl: getVideoUrl(game.question.path, 'easy')
          } : null,
          achievement: game.achievement ? {
            ...game.achievement,
            videoUrl: getVideoUrl(game.achievement.path, 'easy')
          } : null
        };
        
        setEasyGameData(processedEasyGame);
      } else {
        console.error('No easy games found for category:', formattedCategory);
      }
      
      // Process Medium game data - UPDATED to match database structure
      if (mediumData.success && mediumData.games && mediumData.games.length > 0) {
        // Process game data to add video URLs
        const game = mediumData.games[0]; // Use the first game for this difficulty
        console.log('Found medium game data:', game);
        
        const processedMediumGame = {
          ...game,
          map: game.map ? {
            ...game.map,
            videoUrl: getVideoUrl(game.map.path, 'medium')
          } : null,
          lesson: game.lesson ? {
            ...game.lesson,
            videoUrl: getVideoUrl(game.lesson.path, 'medium')
          } : null,
          question1: game.question1 ? {
            ...game.question1,
            videoUrl: getVideoUrl(game.question1.path, 'medium')
          } : null,
          achievement1: game.achievement1 ? {
            ...game.achievement1,
            videoUrl: getVideoUrl(game.achievement1.path, 'medium')
          } : null,
          question2: game.question2 ? {
            ...game.question2,
            videoUrl: getVideoUrl(game.question2.path, 'medium')
          } : null,
          achievement2: game.achievement2 ? {
            ...game.achievement2,
            videoUrl: getVideoUrl(game.achievement2.path, 'medium')
          } : null,
          final_achievement: game.final_achievement ? {
            ...game.final_achievement,
            videoUrl: getVideoUrl(game.final_achievement.path, 'medium')
          } : null
        };
        
        setMediumGameData(processedMediumGame);
      } else {
        console.error('No medium games found for category:', formattedCategory);
      }
      
      // Process Hard game data
      if (hardData.success && hardData.games && hardData.games.length > 0) {
        // Process game data to add video URLs
        const game = hardData.games[0]; // Use the first game for this difficulty
        console.log('Found hard game data:', game);
        
        const processedHardGame = {
          ...game,
          map: game.map ? {
            ...game.map,
            videoUrl: getVideoUrl(game.map.path, 'hard')
          } : null,
          lesson: game.lesson ? {
            ...game.lesson,
            videoUrl: getVideoUrl(game.lesson.path, 'hard')
          } : null,
          question1: game.question1 ? {
            ...game.question1,
            videoUrl: getVideoUrl(game.question1.path, 'hard')
          } : null,
          achievement1: game.achievement1 ? {
            ...game.achievement1,
            videoUrl: getVideoUrl(game.achievement1.path, 'hard')
          } : null,
          question2: game.question2 ? {
            ...game.question2,
            videoUrl: getVideoUrl(game.question2.path, 'hard')
          } : null,
          achievement2: game.achievement2 ? {
            ...game.achievement2,
            videoUrl: getVideoUrl(game.achievement2.path, 'hard')
          } : null,
          question3: game.question3 ? {
            ...game.question3,
            videoUrl: getVideoUrl(game.question3.path, 'hard')
          } : null,
          achievement3: game.achievement3 ? {
            ...game.achievement3,
            videoUrl: getVideoUrl(game.achievement3.path, 'hard')
          } : null,
          final_achievement: game.final_achievement ? {
            ...game.final_achievement,
            videoUrl: getVideoUrl(game.final_achievement.path, 'hard')
          } : null,
          last_map: game.last_map ? {
            ...game.last_map,
            videoUrl: getVideoUrl(game.last_map.path, 'hard')
          } : null,
          outro: game.outro ? {
            ...game.outro,
            videoUrl: getVideoUrl(game.outro.path, 'hard')
          } : null
        };
        
        // Extra logging for achievement3
        console.log('Hard achievement3 path:', game.achievement3?.path);
        console.log('Hard achievement3 videoUrl:', processedHardGame.achievement3?.videoUrl);
        
        setHardGameData(processedHardGame);
      } else {
        console.error('No hard games found for category:', formattedCategory);
      }
      
      // Check if we have at least easy games
      if (!easyData.success || !easyData.games || easyData.games.length === 0) {
        setError(`No games found for category: ${category}. Please try another activity.`);
      } else {
        setError(null); // Clear any previous error
      }
      
    } catch (err) {
      console.error('Error fetching game data:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle video ended event - MODIFIED to pause on last frame and start waiting for answer
  const handleVideoEnded = () => {
    console.log('🎥 Video ended for stage:', currentStage, 'in difficulty:', currentDifficulty);
  console.log('🎥 showAnswerInput:', showAnswerInput, 'waitingForAnswer:', waitingForAnswer);
  setVideoEnded(true);
    
    // Pause the video on the last frame
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    // If it's a question, show the answer input and start waiting for answer
    if ((currentStage.includes('question') || 
        (isRevisitingQuestions && currentRevisitQuestion?.stage.includes('question')))) {
      setShowAnswerInput(true);
      setUserAnswer(''); // Clear any previous answer
      setWaitingForAnswer(true); // ADDED: Start waiting for Firebase answer
      setLastProcessedAnswer(''); // Reset last processed answer
    }
    
    // Handle based on current difficulty and stage
    if (currentDifficulty === 'easy') {
      handleEasyVideoEnded();
    } else if (currentDifficulty === 'medium') {
      handleMediumVideoEnded();
    } else if (currentDifficulty === 'hard') {
      handleHardVideoEnded();
    } else if (isRevisitingQuestions) {
      handleRevisitVideoEnded();
    } else if (allQuestionsAnswered) {
      handleFinalVideosEnded();
    }
  };

  // Handle Easy videos
  const handleEasyVideoEnded = () => {
    switch (currentStage) {
      case 'intro':
        // After intro video, show start button and start 20-second timer
        setStartButtonVisible(true);
        const timer = setTimeout(() => {
          // If start button not clicked after 20 seconds, proceed to map video
          if (currentStage === 'intro') {
            handleStart();
          }
        }, 20000);
        setStartTimer(timer);
        break;
        
      case 'map':
        // After map video, proceed to lesson video
        setCurrentStage('lesson');
        setVideoEnded(false);
        break;
        
      case 'lesson':
        // After lesson video, proceed to question video
        setCurrentStage('question');
        setVideoEnded(false);
        break;
        
      case 'question':
  console.log('⏰ Setting 30-second timer for easy question');
  const answerTimeout = setTimeout(() => {
    console.log('⏰ 30-second timer triggered!');
    console.log('⏰ Current conditions - stage:', currentStage, 'showAnswerInput:', showAnswerInput);
    
    if (currentStage === 'question' && showAnswerInput) {
      console.log('✅ Conditions met, skipping to medium difficulty');
      // Skip logic here
    } else {
      console.log('❌ Conditions not met, timer not executing');
      console.log('❌ currentStage:', currentStage, 'expected: question');
      console.log('❌ showAnswerInput:', showAnswerInput, 'expected: true');
    }
  }, 30000);
  setAnswerTimer(answerTimeout);
  console.log('⏰ Timer set with ID:', answerTimeout);
  break;
        
      case 'achievement':
        // After achievement video, move to medium
        setCurrentDifficulty('medium');
        setCurrentStage('map');
        setVideoEnded(false);
        break;
        
      default:
        break;
    }
  };

  // FIXED: Handle Medium videos with corrected flow (no last_map or outro)
  const handleMediumVideoEnded = () => {
    switch (currentStage) {
      case 'map':
        // After map video, proceed to lesson video
        setCurrentStage('lesson');
        setVideoEnded(false);
        break;
        
      case 'lesson':
        // After lesson video, proceed to question1 video
        setCurrentStage('question1');
        setVideoEnded(false);
        break;
        
      case 'question1':
        // After question1 video, stay on last frame and wait for answer
        // Start 30-second timer to go to question2 if no answer
        const answer1Timeout = setTimeout(() => {
          if (currentStage === 'question1' && showAnswerInput) {
            console.log('No answer after 30 seconds for question1, moving to question2');
            // Log unanswered question
            setUnansweredQuestions(prev => [...prev, { 
              difficulty: 'medium', 
              stage: 'question1',
              correctAnswer: mediumGameData?.answer1
            }]);
            // Hide answer input
            setShowAnswerInput(false);
            // Stop waiting for Firebase answer
            setWaitingForAnswer(false);
            // Move to next question
            setCurrentStage('question2');
            setVideoEnded(false);
            setUserAnswer('');
          }
        }, 30000);
        setAnswerTimer(answer1Timeout);
        break;
        
      case 'achievement1':
        // After achievement1 video, go to question2
        setCurrentStage('question2');
        setVideoEnded(false);
        break;
        
      case 'question2':
        // After question2 video, stay on last frame and wait for answer
        // Start 30-second timer to go to final_achievement if no answer
        const answer2Timeout = setTimeout(() => {
          if (currentStage === 'question2' && showAnswerInput) {
            console.log('No answer after 30 seconds for question2, moving to final_achievement');
            // Log unanswered question
            setUnansweredQuestions(prev => [...prev, { 
              difficulty: 'medium', 
              stage: 'question2',
              correctAnswer: mediumGameData?.answer2
            }]);
            // Hide answer input
            setShowAnswerInput(false);
            // Stop waiting for Firebase answer
            setWaitingForAnswer(false);
            
            // Check if both questions have been answered
            if (answeredQuestions.medium.question1 && answeredQuestions.medium.question2) {
              // Both medium questions answered, show final achievement
              setCurrentStage('final_achievement');
            } else {
              // Start revisiting unanswered medium questions
              startRevisitingQuestions();
            }
            setVideoEnded(false);
          }
        }, 30000);
        setAnswerTimer(answer2Timeout);
        break;
        
      case 'achievement2':
        // Check if all medium questions are answered
        if (answeredQuestions.medium.question1 && answeredQuestions.medium.question2) {
          console.log("All medium questions answered, showing medium final achievement");
          setCurrentStage('final_achievement');
          setVideoEnded(false);
        } else {
          // Some medium questions not answered, start revisiting
          console.log("Some medium questions not answered, starting revisit phase");
          const unansweredMediumQuestions = [];
          
          if (!answeredQuestions.medium.question1) {
            unansweredMediumQuestions.push({
              difficulty: 'medium',
              stage: 'question1',
              correctAnswer: mediumGameData?.answer1
            });
          }
          
          if (!answeredQuestions.medium.question2) {
            unansweredMediumQuestions.push({
              difficulty: 'medium',
              stage: 'question2',
              correctAnswer: mediumGameData?.answer2
            });
          }
          
          setUnansweredQuestions(prev => [...prev, ...unansweredMediumQuestions]);
          setIsRevisitingQuestions(true);
          moveToNextUnansweredQuestion();
        }
        break;
        
      case 'final_achievement':
        // After medium final_achievement, move directly to hard difficulty
        // Make sure hard data is loaded for the upcoming transition
        if (!hardGameData || !hardGameData.map) {
          console.log("Pre-fetching hard game data to prepare for transition");
          fetchHardGameData().then(() => {
            setCurrentDifficulty('hard');
            setCurrentStage('map');
            setVideoEnded(false);
          });
        } else {
          // Move to hard difficulty directly after medium final_achievement
          console.log("Medium final_achievement ended, moving to hard difficulty");
          setCurrentDifficulty('hard');
          setCurrentStage('map');
          setVideoEnded(false);
        }
        break;
        
      default:
        break;
    }
  };

  // IMPROVED: Handle Hard videos with better achievement3 transition
  const handleHardVideoEnded = () => {
    switch (currentStage) {
      case 'map':
        // After map video, proceed to lesson video
        console.log("Hard map video ended, moving to hard lesson");
        setCurrentStage('lesson');
        setVideoEnded(false);
        break;
        
      case 'lesson':
        // After lesson video, proceed to question1 video
        console.log("Hard lesson video ended, moving to hard question1");
        setCurrentStage('question1');
        setVideoEnded(false);
        break;
        
      case 'question1':
        // After question1 video, stay on last frame and wait for answer
        // Start 30-second timer to go to question2 if no answer
        console.log("Hard question1 video ended, waiting for answer");
        const answer1Timeout = setTimeout(() => {
          if (currentStage === 'question1' && showAnswerInput) {
            console.log('No answer after 30 seconds for question1, moving to question2');
            // Log unanswered question
            setUnansweredQuestions(prev => [...prev, { 
              difficulty: 'hard', 
              stage: 'question1',
              correctAnswer: hardGameData?.answer1
            }]);
            // Hide answer input
            setShowAnswerInput(false);
            // Stop waiting for Firebase answer
            setWaitingForAnswer(false);
            // Move to next question
            setCurrentStage('question2');
            setVideoEnded(false);
            setUserAnswer('');
          }
        }, 30000);
        setAnswerTimer(answer1Timeout);
        break;
        
      case 'achievement1':
        // After achievement1 video, go to question2
        console.log("Hard achievement1 video ended, moving to hard question2");
        setCurrentStage('question2');
        setVideoEnded(false);
        break;
        
      case 'question2':
        // After question2 video, stay on last frame and wait for answer
        // Start 30-second timer to go to question3 if no answer
        console.log("Hard question2 video ended, waiting for answer");
        const answer2Timeout = setTimeout(() => {
          if (currentStage === 'question2' && showAnswerInput) {
            console.log('No answer after 30 seconds for question2, moving to question3');
            // Log unanswered question
            setUnansweredQuestions(prev => [...prev, { 
              difficulty: 'hard', 
              stage: 'question2',
              correctAnswer: hardGameData?.answer2
            }]);
            // Hide answer input
            setShowAnswerInput(false);
            // Stop waiting for Firebase answer
            setWaitingForAnswer(false);
            // Move to next question
            setCurrentStage('question3');
            setVideoEnded(false);
            setUserAnswer('');
          }
        }, 30000);
        setAnswerTimer(answer2Timeout);
        break;
        
      case 'achievement2':
        // After achievement2 video, go to question3
        console.log("Hard achievement2 video ended, moving to hard question3");
        setCurrentStage('question3');
        setVideoEnded(false);
        break;
        
      case 'question3':
        // After question3 video, stay on last frame and wait for answer
        // Start 30-second timer to start revisiting questions if no answer
        console.log("Hard question3 video ended, waiting for answer");
        const answer3Timeout = setTimeout(() => {
          if (currentStage === 'question3' && showAnswerInput) {
            console.log('No answer after 30 seconds for question3, will start revisiting unanswered questions');
            // Log unanswered question
            setUnansweredQuestions(prev => [...prev, { 
              difficulty: 'hard', 
              stage: 'question3',
              correctAnswer: hardGameData?.answer3
            }]);
            // Hide answer input
            setShowAnswerInput(false);
            // Stop waiting for Firebase answer
            setWaitingForAnswer(false);
            // Start revisiting questions
            startRevisitingQuestions();
          }
        }, 30000);
        setAnswerTimer(answer3Timeout);
        break;
        
      case 'achievement3':
        // FIXED: After achievement3 video, check if all questions are answered
        console.log("Hard achievement3 video ended, checking if all questions answered");
        
        // Check if all questions have been answered
        if (answeredQuestions.easy && 
            answeredQuestions.medium.question1 && 
            answeredQuestions.medium.question2 && 
            answeredQuestions.hard.question1 &&
            answeredQuestions.hard.question2 &&
            answeredQuestions.hard.question3) {
          
          console.log("All questions answered, moving to final sequence");
          // All questions answered, proceed to final sequence
          setAllQuestionsAnswered(true);
          setCurrentStage('final_achievement');
        } else {
          console.log("Some questions not answered, starting revisit phase");
          // Some questions not answered, start revisiting
          startRevisitingQuestions();
        }
        
        setVideoEnded(false);
        break;
        
      case 'final_achievement':
        // After final achievement, proceed to last map (only in hard difficulty)
        console.log("Hard final achievement ended, moving to last_map");
        setCurrentStage('last_map');
        setVideoEnded(false);
        break;
        
      case 'last_map':
        // After last map, proceed to outro (only in hard difficulty)
        console.log("Hard last map ended, moving to outro");
        setCurrentStage('outro');
        setVideoEnded(false);
        break;
        
      case 'outro':
        // End of game, go back to select activities
        console.log("Hard outro ended, returning to select-activities");
        navigate('/select-activities', {
          state: { studentID, selectedType }
        });
        break;
        
      default:
        break;
    }
  };

  // Handle videos for revisiting questions
  const handleRevisitVideoEnded = () => {
    // Start 30-second timer to move to next unanswered question if no answer
    const revisitTimeout = setTimeout(() => {
      if (isRevisitingQuestions && videoEnded && showAnswerInput) {
        console.log('No answer after 30 seconds for revisit question, moving to next unanswered question');
        
        // Get current question from revisit queue
        const currentQuestion = currentRevisitQuestion;
        
        // Hide answer input
        setShowAnswerInput(false);
        // Stop waiting for Firebase answer
        setWaitingForAnswer(false);
        
        // Log the question back to unanswered queue (it will go to the end)
        if (currentQuestion) {
          setUnansweredQuestions(prev => [...prev, currentQuestion]);
        }
        
        // Move to next unanswered question
        moveToNextUnansweredQuestion();
      }
    }, 30000);
    setAnswerTimer(revisitTimeout);
  };

  // Handle final videos sequence
  const handleFinalVideosEnded = () => {
    // This function should handle the final videos when all questions from all difficulties are answered
    // Only the hard difficulty has last_map and outro paths
    
    if (currentDifficulty === 'hard') {
      // For hard completion sequence
      switch (currentStage) {
        case 'final_achievement':
          // After final achievement, proceed to last map
          console.log("Hard final achievement ended, moving to hard last_map");
          setCurrentStage('last_map');
          setVideoEnded(false);
          break;
          
        case 'last_map':
          // After last map, proceed to outro
          console.log("Hard last map ended, moving to hard outro");
          setCurrentStage('outro');
          setVideoEnded(false);
          break;
          
        case 'outro':
          // End of game, go back to select activities
          console.log("Hard outro ended, returning to select-activities");
          navigate('/select-activities', {
            state: { studentID, selectedType }
          });
          break;
          
        default:
          break;
      }
    } else if (currentDifficulty === 'medium') {
      // For medium completion sequence - move directly to hard difficulty
      // Medium does not have last_map or outro videos
      console.log("Medium final sequence completed, moving to hard difficulty");
      setCurrentDifficulty('hard');
      setCurrentStage('map');
      setVideoEnded(false);
    }
  };

  // Handle answer button click for keyboard inputs
  const handleAnswerButtonClick = (selectedAnswer) => {
    // Only process if we're waiting for an answer
    if (!waitingForAnswer) return;
    
    playButtonClickSound();
    
    // Convert short codes to full answers
    let fullAnswer = selectedAnswer;
    
    // For Yes/No questions
    if (selectedAnswer === 'Y') {
      fullAnswer = 'Yes';
    } else if (selectedAnswer === 'N') {
      fullAnswer = 'No';
    }
    
    // For color questions (if someone presses just the letter)
    if (selectedAnswer === 'R') {
      fullAnswer = 'Red';
    } else if (selectedAnswer === 'Y') {
      const answerType = getAnswerType();
      fullAnswer = answerType === 'color' ? 'Yellow' : 'Yes';
    } else if (selectedAnswer === 'G') {
      fullAnswer = 'Green';
    } else if (selectedAnswer === 'B') {
      fullAnswer = 'Blue';
    }
    
    // Set the answer
    setUserAnswer(fullAnswer);
    
    // Submit the answer
    submitAnswer(fullAnswer);
  };

  // Submit user answer
  const submitAnswer = (answer = userAnswer) => {
    // Only process if we're waiting for an answer
    if (!waitingForAnswer) return;
    
    // Hide input field
    setShowAnswerInput(false);
    
    // Stop waiting for Firebase answer
    setWaitingForAnswer(false);
    
    // Check answer
    checkAnswer(answer);
  };

  // Function to check if two strings are equal, ignoring case and extra whitespace
  const areAnswersEqual = (answer1, answer2) => {
    if (!answer1 || !answer2) return false;
    return answer1.trim().toLowerCase() === answer2.trim().toLowerCase();
  };

  // IMPROVED: Check user answer against correct answer
  const checkAnswer = (answer) => {
    // Clear answer timer
     console.log('🧹 Clearing answer timer');
  if (answerTimer) {
    clearTimeout(answerTimer);
    setAnswerTimer(null);
    console.log('🧹 Timer cleared successfully');
  }
   
    let correctAnswer;
    let isCorrect = false;
    
    // Get correct answer based on current difficulty and stage
    if (isRevisitingQuestions) {
      // For revisiting questions
      correctAnswer = currentRevisitQuestion?.correctAnswer || '';
      isCorrect = areAnswersEqual(answer, correctAnswer);
      
      if (isCorrect) {
        // Update answeredQuestions based on the question being revisited
        if (currentRevisitQuestion) {
          const { difficulty, stage } = currentRevisitQuestion;
          
          if (difficulty === 'easy' && stage === 'question') {
            setAnsweredQuestions(prev => ({ ...prev, easy: true }));
          } else if (difficulty === 'medium') {
            if (stage === 'question1') {
              setAnsweredQuestions(prev => ({
                ...prev,
                medium: { ...prev.medium, question1: true }
              }));
            } else if (stage === 'question2') {
              setAnsweredQuestions(prev => ({
                ...prev,
                medium: { ...prev.medium, question2: true }
              }));
            }
          } else if (difficulty === 'hard') {
            if (stage === 'question1') {
              setAnsweredQuestions(prev => ({
                ...prev,
                hard: { ...prev.hard, question1: true }
              }));
            } else if (stage === 'question2') {
              setAnsweredQuestions(prev => ({
                ...prev,
                hard: { ...prev.hard, question2: true }
              }));
            } else if (stage === 'question3') {
              setAnsweredQuestions(prev => ({
                ...prev,
                hard: { ...prev.hard, question3: true }
              }));
            }
          }
        }
      }
    } else if (currentDifficulty === 'easy') {
      // For easy difficulty
      correctAnswer = easyGameData?.correct_answer || '';
      isCorrect = areAnswersEqual(answer, correctAnswer);
      
      if (isCorrect) {
        setAnsweredQuestions(prev => ({ ...prev, easy: true }));
      }
    } else if (currentDifficulty === 'medium') {
      // For medium difficulty
      if (currentStage === 'question1') {
        correctAnswer = mediumGameData?.answer1 || '';
        isCorrect = areAnswersEqual(answer, correctAnswer);
        
        if (isCorrect) {
          setAnsweredQuestions(prev => ({
            ...prev,
            medium: { ...prev.medium, question1: true }
          }));
        }
      } else if (currentStage === 'question2') {
        correctAnswer = mediumGameData?.answer2 || '';
        isCorrect = areAnswersEqual(answer, correctAnswer);
        
        if (isCorrect) {
          setAnsweredQuestions(prev => ({
            ...prev,
            medium: { ...prev.medium, question2: true }
          }));
        }
      }
    } else if (currentDifficulty === 'hard') {
      // For hard difficulty
      if (currentStage === 'question1') {
        correctAnswer = hardGameData?.answer1 || '';
        isCorrect = areAnswersEqual(answer, correctAnswer);
        
        if (isCorrect) {
          setAnsweredQuestions(prev => ({
            ...prev,
            hard: { ...prev.hard, question1: true }
          }));
        }
      } else if (currentStage === 'question2') {
        correctAnswer = hardGameData?.answer2 || '';
        isCorrect = areAnswersEqual(answer, correctAnswer);
        
        if (isCorrect) {
          setAnsweredQuestions(prev => ({
            ...prev,
            hard: { ...prev.hard, question2: true }
          }));
        }
      } else if (currentStage === 'question3') {
        correctAnswer = hardGameData?.answer3 || '';
        isCorrect = areAnswersEqual(answer, correctAnswer);
        
        if (isCorrect) {
          console.log("Hard question3 answered correctly!");
          setAnsweredQuestions(prev => ({
            ...prev,
            hard: { ...prev.hard, question3: true }
          }));
        }
      }
    }
    
    console.log(`Checking answer: ${answer} against correct answer: ${correctAnswer}`);
    console.log(`Answer is ${isCorrect ? 'correct' : 'incorrect'}`);
    
    if (isCorrect) {
      // If correct, play achievement video based on current difficulty and stage
      if (isRevisitingQuestions) {
        // For revisiting questions, move to next question after a short delay
        setTimeout(() => {
          moveToNextUnansweredQuestion();
        }, 500);
      } else if (currentDifficulty === 'easy') {
        setCurrentStage('achievement');
        setVideoEnded(false);
      } else if (currentDifficulty === 'medium') {
        if (currentStage === 'question1') {
          setCurrentStage('achievement1');
          setVideoEnded(false);
        } else if (currentStage === 'question2') {
          setCurrentStage('achievement2');
          setVideoEnded(false);
        }
      } else if (currentDifficulty === 'hard') {
        if (currentStage === 'question1') {
          setCurrentStage('achievement1');
          setVideoEnded(false);
        } else if (currentStage === 'question2') {
          setCurrentStage('achievement2');
          setVideoEnded(false);
        } else if (currentStage === 'question3') {
          console.log("Moving to hard achievement3 after correct answer");
          // CRITICAL FIX: Explicitly move to achievement3 when question3 is correct
          setCurrentStage('achievement3');
          setVideoEnded(false);
        }
      }
    } else {
      // If incorrect, stay on the same question and wait for a new answer
      // Reset the waiting state to allow for more answers
      setShowAnswerInput(true);
      setWaitingForAnswer(true);
      setUserAnswer(''); // Clear the answer for new attempt
      
      // We don't reset the 30-second timer here since it's already running
      // The timer will still expire after the original 30 seconds
    }
  };

  // Start revisiting unanswered questions
  const startRevisitingQuestions = () => {
    console.log('Starting to revisit unanswered questions:', unansweredQuestions);
    
    if (unansweredQuestions.length > 0) {
      setIsRevisitingQuestions(true);
      moveToNextUnansweredQuestion();
    } else {
      // No questions to revisit, check which ones need to be added
      const newUnansweredQuestions = [];
      
      // Check easy question
      if (!answeredQuestions.easy) {
        newUnansweredQuestions.push({
          difficulty: 'easy',
          stage: 'question',
          correctAnswer: easyGameData?.correct_answer
        });
      }
      
      // Check medium questions
      if (!answeredQuestions.medium.question1) {
        newUnansweredQuestions.push({
          difficulty: 'medium',
          stage: 'question1',
          correctAnswer: mediumGameData?.answer1
        });
      }
      
      if (!answeredQuestions.medium.question2) {
        newUnansweredQuestions.push({
          difficulty: 'medium',
          stage: 'question2',
          correctAnswer: mediumGameData?.answer2
        });
      }
      
      // Check hard questions
      if (!answeredQuestions.hard.question1) {
        newUnansweredQuestions.push({
          difficulty: 'hard',
          stage: 'question1',
          correctAnswer: hardGameData?.answer1
        });
      }
      
      if (!answeredQuestions.hard.question2) {
        newUnansweredQuestions.push({
          difficulty: 'hard',
          stage: 'question2',
          correctAnswer: hardGameData?.answer2
        });
      }
      
      if (!answeredQuestions.hard.question3) {
        newUnansweredQuestions.push({
          difficulty: 'hard',
          stage: 'question3',
          correctAnswer: hardGameData?.answer3
        });
      }
      
      if (newUnansweredQuestions.length > 0) {
        setUnansweredQuestions(newUnansweredQuestions);
        setIsRevisitingQuestions(true);
        moveToNextUnansweredQuestion();
      } else {
        // All questions have been answered
        setAllQuestionsAnswered(true);
        setCurrentDifficulty('hard'); // Use hard videos for final sequence
        setCurrentStage('final_achievement');
        setVideoEnded(false);
      }
    }
  };

  // Move to next unanswered question
  const moveToNextUnansweredQuestion = () => {
    if (unansweredQuestions.length > 0) {
      // Get the next question from the queue
      const nextQuestion = unansweredQuestions[0];
      
      // Remove this question from the queue
      setUnansweredQuestions(prev => prev.slice(1));
      
      // Set as current revisit question
      setCurrentRevisitQuestion(nextQuestion);
      
      // Navigate to this question's video
      setCurrentDifficulty(nextQuestion.difficulty);
      setCurrentStage(nextQuestion.stage);
      setVideoEnded(false);
      setUserAnswer('');
      
      console.log(`Moving to next unanswered question: ${nextQuestion.difficulty} - ${nextQuestion.stage}`);
    } else {
      // No more questions to revisit
      console.log("No more questions to revisit, checking if all questions are answered");
      
      // Check if all questions are truly answered now
      const allAnswered = 
        answeredQuestions.easy &&
        answeredQuestions.medium.question1 && 
        answeredQuestions.medium.question2 && 
        answeredQuestions.hard.question1 &&
        answeredQuestions.hard.question2 &&
        answeredQuestions.hard.question3;
      
      if (allAnswered) {
        // All questions have been answered
        console.log("All questions have been answered, moving to final sequence");
        setIsRevisitingQuestions(false);
        setCurrentRevisitQuestion(null);
        setAllQuestionsAnswered(true);
        setCurrentDifficulty('hard'); // Use hard videos for final sequence
        setCurrentStage('final_achievement');
        setVideoEnded(false);
      } else {
        // Still some unanswered questions, start scanning again
        console.log("Still have unanswered questions, scanning again");
        startRevisitingQuestions();
      }
    }
  };

  // Reset game state for a new game
  const resetGameState = () => {
    setAnsweredQuestions({
      easy: false,
      medium: {
        question1: false,
        question2: false
      },
      hard: {
        question1: false,
        question2: false,
        question3: false
      }
    });
    setUnansweredQuestions([]);
    setIsRevisitingQuestions(false);
    setCurrentRevisitQuestion(null);
    setAllQuestionsAnswered(false);
    setUserAnswer('');
    setShowAnswerInput(false);
    setWaitingForAnswer(false);
    setLastProcessedAnswer('');
  };

  // Handle video error event - IMPROVED with better debugging
  const handleVideoError = (e) => {
    console.error('Video error:', e);
    const videoUrl = getCurrentVideo();
    console.error('Video URL causing error:', videoUrl);
    console.error('Current difficulty:', currentDifficulty);
    console.error('Current stage:', currentStage);
    
    // Log specific data for hard videos
    if (currentDifficulty === 'hard') {
      console.error('Hard game data:', hardGameData);
      console.error('Hard map URL:', hardGameData?.map?.videoUrl);
    }
    
    // Stop waiting for Firebase answer if there's an error
    setWaitingForAnswer(false);
    
    // For hard difficulty errors, try refetching hard data
    if (currentDifficulty === 'hard') {
      console.log("Trying to refetch hard data due to video error");
      fetchHardGameData().then(data => {
        if (data) {
          console.log("Successfully refetched hard data after error");
          // Try to continue with current stage after refetch
          setVideoEnded(false);
        } else {
          console.error("Still couldn't fetch hard data, skipping to next stage");
          // Skip to next stage
          handleHardVideoSkip();
        }
      });
    } else {
      // For other difficulties, skip to next stage
      handleVideoSkip();
    }
  };

  // NEW: Function to handle hard video skips more carefully
  const handleHardVideoSkip = () => {
    console.log("Skipping hard video due to error");
    
    switch (currentStage) {
      case 'map':
        console.log('Error playing hard map video, trying to proceed to hard lesson');
        setCurrentStage('lesson');
        break;
      case 'lesson':
        console.log('Error playing hard lesson video, trying to proceed to hard question1');
        setCurrentStage('question1');
        break;
      case 'question1':
        console.log('Error playing hard question1 video, trying to proceed to hard question2');
        setCurrentStage('question2');
        break;
      case 'achievement1':
        console.log('Error playing hard achievement1 video, trying to proceed to hard question2');
        setCurrentStage('question2');
        break;
      case 'question2':
        console.log('Error playing hard question2 video, trying to proceed to hard question3');
        setCurrentStage('question3');
        break;
      case 'achievement2':
        console.log('Error playing hard achievement2 video, trying to proceed to hard question3');
        setCurrentStage('question3');
        break;
      case 'question3':
        console.log('Error playing hard question3 video, moving to revisit questions');
        startRevisitingQuestions();
        return;
      case 'achievement3':
        console.log('Error playing hard achievement3 video, moving to revisit questions');
        startRevisitingQuestions();
        return;
      case 'final_achievement':
        console.log('Error playing hard final_achievement video, trying to proceed to hard last_map');
        setCurrentStage('last_map');
        break;
      case 'last_map':
        console.log('Error playing hard last_map video, trying to proceed to hard outro');
        setCurrentStage('outro');
        break;
      case 'outro':
        console.log('Error playing hard outro video, returning to select activities');
        navigate('/select-activities', {
          state: { studentID, selectedType }
        });
        return;
      default:
        console.log('Unknown hard stage with error, returning to medium');
        setCurrentDifficulty('medium');
        setCurrentStage('map');
        break;
    }
    
    setVideoEnded(false);
  };

  // General video skip function for non-hard videos
  const handleVideoSkip = () => {
    // Skip to next stage if video fails to load
    if (currentDifficulty === 'easy') {
      // For easy difficulty
      if (currentStage === 'intro') {
        console.log('Error playing intro video, trying to proceed to map');
        setCurrentStage('map');
      } else if (currentStage === 'map') {
        console.log('Error playing map video, trying to proceed to lesson');
        setCurrentStage('lesson');
      } else if (currentStage === 'lesson') {
        console.log('Error playing lesson video, trying to proceed to question');
        setCurrentStage('question');
      } else if (currentStage === 'question') {
        console.log('Error playing question video, moving to medium difficulty');
        setCurrentDifficulty('medium');
        setCurrentStage('map');
      } else if (currentStage === 'achievement') {
        console.log('Error playing achievement video, moving to medium difficulty');
        setCurrentDifficulty('medium');
        setCurrentStage('map');
      }
    } else if (currentDifficulty === 'medium') {
      // For medium difficulty
      if (currentStage === 'map') {
        setCurrentStage('lesson');
      } else if (currentStage === 'lesson') {
        setCurrentStage('question1');
      } else if (currentStage === 'question1') {
        setCurrentStage('question2');
      } else if (currentStage === 'achievement1') {
        setCurrentStage('question2');
     } else if (currentStage === 'question2') {
        // Check if both questions have been answered
        if (answeredQuestions.medium.question1 && answeredQuestions.medium.question2) {
          setCurrentStage('final_achievement');
        } else {
          startRevisitingQuestions();
        }
      } else if (currentStage === 'achievement2') {
        if (answeredQuestions.medium.question1 && answeredQuestions.medium.question2) {
          setCurrentStage('final_achievement');
        } else {
          startRevisitingQuestions();
        }
      } else if (currentStage === 'final_achievement') {
        // Try to fetch hard data again
        fetchHardGameData().then(data => {
          if (data) {
            setCurrentDifficulty('hard');
            setCurrentStage('map');
          } else {
            // Skip hard and go to revisit questions if we can't load hard data
            startRevisitingQuestions();
          }
        });
        return;
      }
    } else if (isRevisitingQuestions) {
      // For revisiting questions, move to next question
      moveToNextUnansweredQuestion();
      return;
    }
    
    setVideoEnded(false);
  };

  // Handle start button click
  const handleStart = () => {
    playButtonClickSound();
    
    // Clear any existing timer
    if (startTimer) {
      clearTimeout(startTimer);
      setStartTimer(null);
    }
    
    // Proceed to map video
    setCurrentStage('map');
    setStartButtonVisible(false);
    setVideoEnded(false);
  };

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (startTimer) clearTimeout(startTimer);
      if (answerTimer) clearTimeout(answerTimer);
    };
  }, [startTimer, answerTimer]);

  // IMPROVED: Get current video URL with better logging
  const getCurrentVideo = () => {
    // Add debugging info for all difficulty/stage combinations
    console.log(`Getting video for ${currentDifficulty} difficulty, ${currentStage} stage`);
    console.log(`AllQuestionsAnswered: ${allQuestionsAnswered}, IsRevisitingQuestions: ${isRevisitingQuestions}`);
    
    // Extra debugging for the hard achievement3 issue
    if (currentDifficulty === 'hard' && currentStage === 'achievement3') {
      console.log("CRITICAL PATH: Getting hard achievement3 video");
      console.log("Hard achievement3 data:", hardGameData?.achievement3);
    }
    
    if (isRevisitingQuestions) {
      // For revisiting questions, get the video based on the current question
      if (!currentRevisitQuestion) return null;
      
      const { difficulty, stage } = currentRevisitQuestion;
      
      if (difficulty === 'easy' && stage === 'question') {
        return easyGameData?.question?.videoUrl;
      } else if (difficulty === 'medium') {
        if (stage === 'question1') return mediumGameData?.question1?.videoUrl;
        if (stage === 'question2') return mediumGameData?.question2?.videoUrl;
      } else if (difficulty === 'hard') {
        if (stage === 'question1') return hardGameData?.question1?.videoUrl;
        if (stage === 'question2') return hardGameData?.question2?.videoUrl;
        if (stage === 'question3') return hardGameData?.question3?.videoUrl;
      }
      
      return null;
    }
    
    // For regular game flow
    if (currentDifficulty === 'easy') {
      // Easy difficulty videos
      if (!easyGameData) return null;
      
      switch (currentStage) {
        case 'intro':
          return easyGameData.introduction?.videoUrl;
        case 'map':
          return easyGameData.map?.videoUrl;
        case 'lesson':
          return easyGameData.lesson?.videoUrl;
        case 'question':
          return easyGameData.question?.videoUrl;
        case 'achievement':
          return easyGameData.achievement?.videoUrl;
        default:
          return null;
      }
    } else if (currentDifficulty === 'medium') {
      // Medium difficulty videos
      if (!mediumGameData) return null;
      
      switch (currentStage) {
        case 'map':
          return mediumGameData.map?.videoUrl;
        case 'lesson':
          return mediumGameData.lesson?.videoUrl;
        case 'question1':
          return mediumGameData.question1?.videoUrl;
        case 'achievement1':
          return mediumGameData.achievement1?.videoUrl;
        case 'question2':
          return mediumGameData.question2?.videoUrl;
        case 'achievement2':
          return mediumGameData.achievement2?.videoUrl;
        case 'final_achievement':
          return mediumGameData.final_achievement?.videoUrl;
        default:
          return null;
      }
    } else if (currentDifficulty === 'hard') {
      // Hard difficulty videos
      if (!hardGameData) {
        console.error("Trying to get hard video but hardGameData is null");
        return null;
      }
      
      switch (currentStage) {
        case 'map':
          console.log("Getting hard map video URL:", hardGameData.map?.videoUrl);
          return hardGameData.map?.videoUrl;
        case 'lesson':
          console.log("Getting hard lesson video URL:", hardGameData.lesson?.videoUrl);
          return hardGameData.lesson?.videoUrl;
        case 'question1':
          console.log("Getting hard question1 video URL:", hardGameData.question1?.videoUrl);
          return hardGameData.question1?.videoUrl;
        case 'achievement1':
          console.log("Getting hard achievement1 video URL:", hardGameData.achievement1?.videoUrl);
          return hardGameData.achievement1?.videoUrl;
        case 'question2':
          console.log("Getting hard question2 video URL:", hardGameData.question2?.videoUrl);
          return hardGameData.question2?.videoUrl;
        case 'achievement2':
          console.log("Getting hard achievement2 video URL:", hardGameData.achievement2?.videoUrl);
          return hardGameData.achievement2?.videoUrl;
        case 'question3':
          console.log("Getting hard question3 video URL:", hardGameData.question3?.videoUrl);
          return hardGameData.question3?.videoUrl;
        case 'achievement3':
          console.log("Getting hard achievement3 video URL:", hardGameData.achievement3?.videoUrl);
          // CRITICAL FIX: Extra logging for the achievement3 issue
          if (!hardGameData.achievement3?.videoUrl) {
            console.error("achievement3 videoUrl is missing or null!");
            console.error("Full hard game data:", hardGameData);
          }
          return hardGameData.achievement3?.videoUrl;
        case 'final_achievement':
          console.log("Getting hard final_achievement video URL:", hardGameData.final_achievement?.videoUrl);
          return hardGameData.final_achievement?.videoUrl;
        case 'last_map':
          console.log("Getting hard last_map video URL:", hardGameData.last_map?.videoUrl);
          return hardGameData.last_map?.videoUrl;
        case 'outro':
          console.log("Getting hard outro video URL:", hardGameData.outro?.videoUrl);
          return hardGameData.outro?.videoUrl;
        default:
          console.log("Unknown hard stage:", currentStage);
          return null;
      }
    }
    
    return null;
  };

  // Handle back button click
  const handleBack = () => {
    playButtonClickSound();
    
    // Clear any timers
    if (startTimer) clearTimeout(startTimer);
    if (answerTimer) clearTimeout(answerTimer);
    
    // Stop waiting for Firebase answer
    setWaitingForAnswer(false);
    
    navigate('/select-activities', {
      state: { studentID, selectedType }
    });
  };

  // Handle settings button click
  const handleSettingsClick = () => {
    playButtonClickSound();
    setShowSettings(true);
  };

  // Handle retry button click
  const handleRetry = () => {
    playButtonClickSound();
    fetchAllGameData();
  };

  // Render the color answer buttons
  const renderColorButtons = () => {
    return (
      <div className="videogames__color-buttons">
        <button 
          className="videogames__color-button videogames__color-button--red"
          onClick={() => handleAnswerButtonClick('Red')}
        >
          R
        </button>
        <button 
          className="videogames__color-button videogames__color-button--yellow"
          onClick={() => handleAnswerButtonClick('Yellow')}
        >
          Y
        </button>
        <button 
          className="videogames__color-button videogames__color-button--green"
          onClick={() => handleAnswerButtonClick('Green')}
        >
          G
        </button>
        <button 
          className="videogames__color-button videogames__color-button--blue"
          onClick={() => handleAnswerButtonClick('Blue')}
        >
          B
        </button>
      </div>
    );
  };

  // Render the yes/no answer buttons
  const renderYesNoButtons = () => {
    return (
      <div className="videogames__yes-no-buttons">
        <button 
          className="videogames__yes-button"
          onClick={() => handleAnswerButtonClick('Yes')}
        >
          Y
        </button>
        <button 
          className="videogames__no-button"
          onClick={() => handleAnswerButtonClick('No')}
        >
          N
        </button>
      </div>
    );
  };

  // Render the number answer buttons
  const renderNumberButtons = () => {
    return (
      <div className="videogames__number-buttons">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
          <button 
            key={num}
            className="videogames__number-button"
            onClick={() => handleAnswerButtonClick(String(num))}
          >
            {num}
          </button>
        ))}
      </div>
    );
  };

  // Render answer UI based on category
  const renderAnswerUI = () => {
    if (!showAnswerInput) return null;
    
    const answerType = getAnswerType();
    
    if (answerType === 'color') {
      return renderColorButtons();
    } else if (answerType === 'yesno') {
      return renderYesNoButtons();
    } else if (answerType === 'number') {
      return renderNumberButtons();
    }
    
    return null;
  };

  // Modified video player rendering code - added waiting for answer indicator
  const renderVideoPlayer = () => {
    const videoUrl = getCurrentVideo();
    
    if (!videoUrl) {
      return (
        <div className="videogames__no-video">
          <p>No video available for this stage.</p>
          <p>Difficulty: {currentDifficulty}, Stage: {currentStage}</p>
          {currentDifficulty === 'hard' && (
            <button 
              onClick={() => fetchHardGameData()}
              className="videogames__retry-button"
            >
              Retry Loading Hard Videos
            </button>
          )}
        </div>
      );
    }
    
    return (
      <div className="videogames__video-container">
        <video
          ref={videoRef}
          className="videogames__video-player"
          src={videoUrl}
          autoPlay
          muted={false}
          // Removed 'controls' to hide standard video controls
          playsInline
          disablePictureInPicture
          controlsList="nodownload noplaybackrate"
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          preload="auto"
          style={{
            opacity: 1,
            filter: 'none',
            backgroundColor: 'transparent',
            mixBlendMode: 'normal',
            display: 'block',
            width: '100%',
            maxWidth: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 10,
            position: 'relative',
            // Remove any border or outline that might make it look like a video
            border: 'none',
            outline: 'none'
          }}
        />
        
        {/* Answer UI */}
        {renderAnswerUI()}

        {/* Instruction text at bottom of screen */}
        {getInstructionText() && (
          <div className="videogames__bottom-instruction">
            {getInstructionText()}
          </div>
        )}

      

       

        <div className="videogames__video-indicator">
          <FaVolumeUp /> Sound enabled
        </div>
      </div>
    );
  };

  // Render error state
  if (error) {
    return (
      <div className="videogames__container">
        <button className="videogames__back-button" onClick={handleBack}>
          <FiChevronLeft size={32} className="back-icon" />
          <span className="videogames__back-label">Back</span>
        </button>
        
        <div className="videogames__error">
          <p>{error}</p>
          <button className="videogames__retry-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
        
        {showSettings && <Settings onClose={() => {
          playButtonClickSound();
          setShowSettings(false);
        }} />}
      </div>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <div className="videogames__container">
        <button className="videogames__back-button" onClick={handleBack}>
          <FiChevronLeft size={32} className="back-icon" />
          <span className="videogames__back-label">Back</span>
        </button>
        
        <div className="videogames__loading">
          <div className="videogames__loading-spinner"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  // Modified final return to add Firebase waiting indicator class
  return (
    <div className={`videogames__container ${waitingForAnswer || startButtonVisible ? 'waiting-for-answer' : ''}`}>
      <button className="videogames__back-button" onClick={handleBack}>
        <FiChevronLeft size={32} className="back-icon" />
        <span className="videogames__back-label">Back</span>
      </button>
      
      <button className="videogames__settings-button" onClick={handleSettingsClick}>
        <FiSettings size={32} className="settings-icon" />
        <span className="videogames__settings-label">Settings</span>
      </button>
      
      {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="videogames__debug">
          <p>Difficulty: {currentDifficulty}</p>
          <p>Stage: {currentStage}</p>
          <p>Revisiting: {isRevisitingQuestions ? 'Yes' : 'No'}</p>
          <p>Unanswered: {unansweredQuestions.length}</p>
          <p>Waiting for answer: {waitingForAnswer ? 'Yes' : 'No'}</p>
          <p>Start button visible: {startButtonVisible ? 'Yes' : 'No'}</p>
          <p>Hard data: {hardGameData ? 'Loaded' : 'Not Loaded'}</p>
          <p>All questions answered: {allQuestionsAnswered ? 'Yes' : 'No'}</p>
          <p>Hard Q3 answered: {answeredQuestions.hard.question3 ? 'Yes' : 'No'}</p>
        </div>
      )}
      
      {/* Video content - filled the entire screen */}
      <div className="videogames__video-wrapper">
        {renderVideoPlayer()}
      </div>

      {showSettings && <Settings onClose={() => {
        playButtonClickSound();
        setShowSettings(false);
      }} />}
    </div>
  );
};

export default VideoGames;