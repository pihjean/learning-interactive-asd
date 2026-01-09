// src/components/VideoPresentation.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiChevronLeft, FiSettings } from 'react-icons/fi';
import { FaVolumeUp } from 'react-icons/fa';
import Settings from './settings';
import './VideoPresentation.css';
import clickSound from "/src/assets/click_button.mp3";
import { database } from '../config';
import { ref, onValue, off, set } from "firebase/database";

const VideoPresentation = () => {
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  
  const { studentID, selectedDay } = location.state || {};
  
  const [videoLessonData, setVideoLessonData] = useState(null);
  const [easyGameData, setEasyGameData] = useState(null);
  const [mediumGameData, setMediumGameData] = useState(null);
  const [hardGameData, setHardGameData] = useState(null);
  const [dayAssignment, setDayAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isFullyInitialized, setIsFullyInitialized] = useState(false);
  
  const [currentDifficulty, setCurrentDifficulty] = useState('videolesson');
  const [currentStage, setCurrentStage] = useState('videolesson');
  const [videoEnded, setVideoEnded] = useState(false);
  
  const [introductionCompleted, setIntroductionCompleted] = useState(false);
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoHistory, setVideoHistory] = useState([]);
  
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [waitingForOutroChoice, setWaitingForOutroChoice] = useState(false);
  const [lastProcessedAnswer, setLastProcessedAnswer] = useState('');
  
  const [studentData, setStudentData] = useState(null);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [progressId, setProgressId] = useState(null);
  const [hasExistingProgress, setHasExistingProgress] = useState(false);
  const [gameWasCompleted, setGameWasCompleted] = useState(false);
  
  const [answeredQuestions, setAnsweredQuestions] = useState({
    easy: 'not_yet_answered',
    medium: {
      question1: 'not_yet_answered',
      question2: 'not_yet_answered'
    },
    hard: {
      question1: 'not_yet_answered',
      question2: 'not_yet_answered',
      question3: 'not_yet_answered'
    }
  });
  
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);
  const [validAnswers, setValidAnswers] = useState({
    correctAnswer: '',
    wrongAnswer1: '',
    wrongAnswer2: ''
  });
  
  const ASSIGNMENT_API_URL = 'https://daetsnedlearning.site/backend/games_per_day.php';
  const EASY_API_URL = 'https://daetsnedlearning.site/backend/game_easy.php';
  const MEDIUM_API_URL = 'https://daetsnedlearning.site/backend/game_medium.php';
  const HARD_API_URL = 'https://daetsnedlearning.site/backend/game_hard.php';
  const VIDEOLESSON_API_URL = 'https://daetsnedlearning.site/backend/videolesson.php';
  const PROGRESS_API_URL = 'https://daetsnedlearning.site/backend/progress.php';
  const STUDENT_API_URL = 'https://daetsnedlearning.site/backend/getStudents.php';
  
  const buttonClickSound = new Audio(clickSound);

  // Function to clear game answers from Firebase
  const clearGameAnswers = async () => {
    try {
      const answersRef = ref(database, `gameAnswers`);
      await set(answersRef, {
        correctAnswer: "",
        wrongAnswer1: "",
        wrongAnswer2: ""
      });
      console.log("Game answers cleared from Firebase");
    } catch (error) {
      console.error("Error clearing game answers from Firebase:", error);
    }
  };

  // Function to send answers to Firebase
  const sendAnswersToFirebase = async (correctAnswer, wrongAnswer1, wrongAnswer2 = null) => {
    try {
      const answersRef = ref(database, `gameAnswers`);
      await set(answersRef, {
        correctAnswer: correctAnswer || "",
        wrongAnswer1: wrongAnswer1 || "",
        wrongAnswer2: wrongAnswer2 || ""
      });
      console.log("Answers sent to Firebase:", { correctAnswer, wrongAnswer1, wrongAnswer2 });
    } catch (error) {
      console.error("Error sending answers to Firebase:", error);
    }
  };

  // useEffect to detect question stages and send answers to Firebase
  useEffect(() => {
    // Clear answers if NOT at a question stage
    if (!currentStage.includes('question')) {
      clearGameAnswers();
      return;
    }

    // Check if game data is loaded before trying to send answers
    const isEasyDataLoaded = currentDifficulty === 'easy' && easyGameData;
    const isMediumDataLoaded = currentDifficulty === 'medium' && mediumGameData;
    const isHardDataLoaded = currentDifficulty === 'hard' && hardGameData;

    if (!isEasyDataLoaded && !isMediumDataLoaded && !isHardDataLoaded) {
      console.log('Game data not loaded yet, waiting...');
      return;
    }

    let correctAnswer = '';
    let wrongAnswer1 = '';
    let wrongAnswer2 = null;

    if (currentDifficulty === 'easy') {
      if (easyGameData && currentStage === 'question') {
        correctAnswer = easyGameData.correct_answer || '';
        wrongAnswer1 = easyGameData.wrong_answer1 || '';
        wrongAnswer2 = easyGameData.wrong_answer2 || null;
        
        console.log('Easy answers fetched:', { correctAnswer, wrongAnswer1, wrongAnswer2 });
      }
    } else if (currentDifficulty === 'medium') {
      if (mediumGameData) {
        if (currentStage === 'question1') {
          correctAnswer = mediumGameData.answer1 || '';
          wrongAnswer1 = mediumGameData.q1_wrong_answer1 || '';
          wrongAnswer2 = mediumGameData.q1_wrong_answer2 || null;
          
          console.log('Medium Q1 answers fetched:', { correctAnswer, wrongAnswer1, wrongAnswer2 });
        } else if (currentStage === 'question2') {
          correctAnswer = mediumGameData.answer2 || '';
          wrongAnswer1 = mediumGameData.q2_wrong_answer1 || '';
          wrongAnswer2 = mediumGameData.q2_wrong_answer2 || null;
          
          console.log('Medium Q2 answers fetched:', { correctAnswer, wrongAnswer1, wrongAnswer2 });
        }
      }
    } else if (currentDifficulty === 'hard') {
      if (hardGameData) {
        if (currentStage === 'question1') {
          correctAnswer = hardGameData.answer1 || '';
          wrongAnswer1 = hardGameData.q1_wrong_answer1 || '';
          wrongAnswer2 = hardGameData.q1_wrong_answer2 || null;
          
          console.log('Hard Q1 answers fetched:', { correctAnswer, wrongAnswer1, wrongAnswer2 });
        } else if (currentStage === 'question2') {
          correctAnswer = hardGameData.answer2 || '';
          wrongAnswer1 = hardGameData.q2_wrong_answer1 || '';
          wrongAnswer2 = hardGameData.q2_wrong_answer2 || null;
          
          console.log('Hard Q2 answers fetched:', { correctAnswer, wrongAnswer1, wrongAnswer2 });
        } else if (currentStage === 'question3') {
          correctAnswer = hardGameData.answer3 || '';
          wrongAnswer1 = hardGameData.q3_wrong_answer1 || '';
          wrongAnswer2 = hardGameData.q3_wrong_answer2 || null;
          
          console.log('Hard Q3 answers fetched:', { correctAnswer, wrongAnswer1, wrongAnswer2 });
        }
      }
    }

    // Send to Firebase if we have valid data
    if (correctAnswer && wrongAnswer1) {
      console.log('Sending answers to Firebase...');
      sendAnswersToFirebase(correctAnswer, wrongAnswer1, wrongAnswer2);
    } else {
      console.log('Missing answer data - correctAnswer:', correctAnswer, 'wrongAnswer1:', wrongAnswer1);
      // Clear if at question stage but no valid data yet
      clearGameAnswers();
    }

  }, [currentDifficulty, currentStage, easyGameData, mediumGameData, hardGameData]);

  // useEffect to listen to Firebase gameAnswers to get valid answers
  useEffect(() => {
    const gameAnswersRef = ref(database, `gameAnswers`);
    
    const handleGameAnswersChange = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data) {
          // Preserve actual values from Firebase (including 0, null, etc.)
          // Use nullish coalescing to only default to '' if value is null or undefined
          setValidAnswers({
            correctAnswer: data.correctAnswer ?? '',
            wrongAnswer1: data.wrongAnswer1 ?? '',
            wrongAnswer2: data.wrongAnswer2 ?? ''
          });
          console.log('Valid answers updated from Firebase:', {
            correctAnswer: data.correctAnswer,
            wrongAnswer1: data.wrongAnswer1,
            wrongAnswer2: data.wrongAnswer2,
            types: {
              correctAnswer: typeof data.correctAnswer,
              wrongAnswer1: typeof data.wrongAnswer1,
              wrongAnswer2: typeof data.wrongAnswer2
            }
          });
        }
      } else {
        // Clear valid answers if not at question stage
        setValidAnswers({
          correctAnswer: '',
          wrongAnswer1: '',
          wrongAnswer2: ''
        });
      }
    };

    onValue(gameAnswersRef, handleGameAnswersChange);
    
    return () => {
      off(gameAnswersRef);
    };
  }, []);

  // Helper function to check if an answer is valid (matches one of the 3 valid answers from Firebase)
  const isValidAnswer = useCallback((answer) => {
    if (answer === null || answer === undefined) return false;
    
    // Convert answer to string for comparison
    const answerStr = String(answer).trim();
    if (answerStr === '') return false;
    
    // Normalize answer for comparison (case-insensitive, handle numbers)
    const normalizedAnswer = answerStr.toLowerCase();
    
    // Get values from Firebase and normalize them
    const normalizeValue = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).toLowerCase().trim();
    };
    
    const normalizedCorrect = normalizeValue(validAnswers.correctAnswer);
    const normalizedWrong1 = normalizeValue(validAnswers.wrongAnswer1);
    const normalizedWrong2 = normalizeValue(validAnswers.wrongAnswer2);
    
    // Check if answer matches any of the 3 valid answers from Firebase
    const isValid = (
      normalizedAnswer === normalizedCorrect ||
      normalizedAnswer === normalizedWrong1 ||
      normalizedAnswer === normalizedWrong2
    );
    
    if (!isValid) {
      console.log('Answer validation failed:', {
        received: answer,
        normalizedReceived: normalizedAnswer,
        validAnswers: {
          correct: validAnswers.correctAnswer,
          wrong1: validAnswers.wrongAnswer1,
          wrong2: validAnswers.wrongAnswer2
        },
        normalizedValid: {
          correct: normalizedCorrect,
          wrong1: normalizedWrong1,
          wrong2: normalizedWrong2
        }
      });
    }
    
    return isValid;
  }, [validAnswers]);

  const getFirstSkippedQuestion = () => {
    if (answeredQuestions.easy === 'skipped') {
      return { difficulty: 'easy', stage: 'question' };
    }
    
    if (answeredQuestions.medium.question1 === 'skipped') {
      return { difficulty: 'medium', stage: 'question1' };
    }
    if (answeredQuestions.medium.question2 === 'skipped') {
      return { difficulty: 'medium', stage: 'question2' };
    }
    
    if (answeredQuestions.hard.question1 === 'skipped') {
      return { difficulty: 'hard', stage: 'question1' };
    }
    if (answeredQuestions.hard.question2 === 'skipped') {
      return { difficulty: 'hard', stage: 'question2' };
    }
    if (answeredQuestions.hard.question3 === 'skipped') {
      return { difficulty: 'hard', stage: 'question3' };
    }
    
    return null;
  };

  const areAllQuestionsAnswered = () => {
    return (
      answeredQuestions.easy === 'correct' &&
      answeredQuestions.medium.question1 === 'correct' &&
      answeredQuestions.medium.question2 === 'correct' &&
      answeredQuestions.hard.question1 === 'correct' &&
      answeredQuestions.hard.question2 === 'correct' &&
      answeredQuestions.hard.question3 === 'correct'
    );
  };

  const checkIfGameCompleted = (progress) => {
    if (!progress) return false;
    
    if (progress.checkpoint === 'hard_outro') {
      return true;
    }
    
    const allHardAnswered = 
      progress.h_quest1 !== 'not_yet_answered' && 
      progress.h_quest2 !== 'not_yet_answered' && 
      progress.h_quest3 !== 'not_yet_answered';
    
    return allHardAnswered;
  };

  const fetchStudentData = async (studentID) => {
    console.log('=== FETCH STUDENT DATA STARTED ===');
    console.log('Looking for studentID:', studentID);
    
    try {
      const response = await fetch(STUDENT_API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.students) {
        const student = data.students.find(s => s.studentID === studentID);
        
        if (student) {
          console.log('Found student:', student);
          setStudentData(student);
          return student;
        } else {
          console.error('Student not found with ID:', studentID);
          return null;
        }
      } else {
        console.error('API call failed or no students returned');
        return null;
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      return null;
    }
  };

  const loadProgress = async (studentID, selectedDay, category) => {
    try {
      const response = await fetch(`${PROGRESS_API_URL}?action=getProgress&studentID=${studentID}&day=${selectedDay}&category=${category}`);
      const data = await response.json();
      
      if (data.success && data.progress) {
        const progress = data.progress;
        console.log('Existing progress found:', progress);
        
        const wasCompleted = checkIfGameCompleted(progress);
        console.log('Previous game was completed:', wasCompleted);
        
        if (wasCompleted) {
          console.log('Previous game was completed - starting fresh');
          setGameWasCompleted(true);
          setCurrentAttempt(1);
          setProgressId(null);
          setHasExistingProgress(false);
          
          setAnsweredQuestions({
            easy: 'not_yet_answered',
            medium: {
              question1: 'not_yet_answered',
              question2: 'not_yet_answered'
            },
            hard: {
              question1: 'not_yet_answered',
              question2: 'not_yet_answered',
              question3: 'not_yet_answered'
            }
          });
          
          return false;
        } else {
          if (progress.checkpoint) {
            const checkpointParts = progress.checkpoint.split('_');
            let difficulty = checkpointParts[0];
            let stage = checkpointParts.slice(1).join('_');
            
            console.log(`Parsed checkpoint - Difficulty: ${difficulty}, Stage: ${stage}`);
            
            if (stage === 'wrong_answer' || stage === 'wrong_answer1' || stage === 'wrong_answer2' || stage === 'wrong_answer3') {
              console.log('Was stopped at wrong_answer video - redirecting to question');
              
              if (difficulty === 'easy') {
                stage = 'question';
              } else if (difficulty === 'medium') {
                if (stage === 'wrong_answer1') {
                  stage = 'question1';
                } else if (stage === 'wrong_answer2') {
                  stage = 'question2';
                } else {
                  stage = 'question1';
                }
              } else if (difficulty === 'hard') {
                if (stage === 'wrong_answer1') {
                  stage = 'question1';
                } else if (stage === 'wrong_answer2') {
                  stage = 'question2';
                } else if (stage === 'wrong_answer3') {
                  stage = 'question3';
                } else {
                  stage = 'question1';
                }
              }
              
              console.log(`Redirected to: ${difficulty}_${stage}`);
            }
            
            setCurrentDifficulty(difficulty);
            setCurrentStage(stage);
          }
          
          setAnsweredQuestions({
            easy: progress.e_quest1 || 'not_yet_answered',
            medium: {
              question1: progress.m_quest1 || 'not_yet_answered',
              question2: progress.m_quest2 || 'not_yet_answered'
            },
            hard: {
              question1: progress.h_quest1 || 'not_yet_answered',
              question2: progress.h_quest2 || 'not_yet_answered',
              question3: progress.h_quest3 || 'not_yet_answered'
            }
          });
          
          const newAttemptCount = (progress.attempts || 1) + 1;
          setCurrentAttempt(newAttemptCount);
          setProgressId(progress.progressID);
          setHasExistingProgress(true);
          setGameWasCompleted(false);
          
          console.log(`Loaded existing progress - incrementing attempts from ${progress.attempts} to ${newAttemptCount}`);
          
          return true;
        }
      } else {
        console.log('No existing progress found');
        setGameWasCompleted(false);
        return false;
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      setGameWasCompleted(false);
      return false;
    }
  };

  const saveProgress = async (isComplete = false) => {
    if (!studentData || 
        !dayAssignment || 
        !studentID || 
        !selectedDay || 
        !studentData.first_name || 
        !dayAssignment.category ||
        !currentDifficulty ||
        !currentStage) {
      console.log('Skipping save - missing required data');
      return;
    }

    try {
      const gameEndTime = new Date();
      const timePlayed = gameStartTime ? Math.round((gameEndTime - gameStartTime) / (1000 * 60)) : 0;
      
      const willCompleteGame = isComplete || currentStage === 'outro' || 
        (answeredQuestions.hard.question1 !== 'not_yet_answered' && 
         answeredQuestions.hard.question2 !== 'not_yet_answered' && 
         answeredQuestions.hard.question3 !== 'not_yet_answered');
      
      const progressData = {
        action: gameWasCompleted || !hasExistingProgress ? 'saveProgress' : 'saveProgress',
        studentID: studentID,
        studentName: `${studentData.first_name} ${studentData.middle_name || ''} ${studentData.last_name}`.trim(),
        day: selectedDay,
        category: dayAssignment.category,
        e_quest1: answeredQuestions.easy,
        m_quest1: answeredQuestions.medium.question1,
        m_quest2: answeredQuestions.medium.question2,
        h_quest1: answeredQuestions.hard.question1,
        h_quest2: answeredQuestions.hard.question2,
        h_quest3: answeredQuestions.hard.question3,
        checkpoint: `${currentDifficulty}_${currentStage}`,
        attempts: currentAttempt,
        time: timePlayed,
        isComplete: willCompleteGame,
        forceNewRecord: gameWasCompleted
      };
      
      console.log('Saving progress:', progressData);
      
      const response = await fetch(PROGRESS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('Raw response from PHP:', responseText);
      
      if (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
        console.error('PHP returned HTML/text instead of JSON:', responseText.substring(0, 500));
        throw new Error('Backend returned non-JSON response: ' + responseText.substring(0, 200));
      }
      
      const result = JSON.parse(responseText);
      
      if (result.success) {
        console.log('Progress saved successfully:', result.action, result.message);
        if (result.progressID) {
          setProgressId(result.progressID);
          setHasExistingProgress(true);
          if (gameWasCompleted) {
            setGameWasCompleted(false);
          }
        }
      } else {
        console.error('Failed to save progress:', result.message);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  useEffect(() => {
    if (isFullyInitialized && 
        currentDifficulty && 
        currentStage && 
        studentData && 
        dayAssignment && 
        studentID && 
        selectedDay && 
        studentData.first_name && 
        dayAssignment.category) {
      
      console.log(`Auto-saving progress at: ${currentDifficulty}_${currentStage}`);
      
      // Save as completed if at outro stage
      if (currentStage === 'outro') {
        setTimeout(() => {
          saveProgress(true);
        }, 50);
      } else {
        setTimeout(() => {
          saveProgress(false);
        }, 50);
      }
    }
  }, [currentDifficulty, currentStage, isFullyInitialized]);

  const clearUserAnswer = async () => {
    try {
      const answerRef = ref(database, `userAnswers/answer`);
      await set(answerRef, "");
      console.log("UserAnswer cleared from Firebase");
    } catch (error) {
      console.error("Error clearing userAnswer from Firebase:", error);
    }
  };

  const addCurrentToHistory = () => {
    setVideoHistory(prev => [...prev, { difficulty: currentDifficulty, stage: currentStage }]);
  };

  const navigateToVideo = (difficulty, stage) => {
    console.log(`Navigating to: ${difficulty}_${stage}`);
    setCurrentDifficulty(difficulty);
    setCurrentStage(stage);
    setVideoEnded(false);
    setWaitingForAnswer(false);
    setWaitingForOutroChoice(false);
    
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handlePlayAgain = async () => {
    console.log('User chose to play again - creating new record');
    
    // Progress already saved as completed when outro was reached
    // Reset all game state for fresh start
    setGameWasCompleted(true);
    setCurrentAttempt(1);
    setProgressId(null);
    setHasExistingProgress(false);
    setGameStartTime(new Date());
    setVideoHistory([]);
    setWaitingForOutroChoice(false);
    
    setAnsweredQuestions({
      easy: 'not_yet_answered',
      medium: {
        question1: 'not_yet_answered',
        question2: 'not_yet_answered'
      },
      hard: {
        question1: 'not_yet_answered',
        question2: 'not_yet_answered',
        question3: 'not_yet_answered'
      }
    });
    
    // Start from beginning
    if (videoLessonData) {
      navigateToVideo('videolesson', 'videolesson');
    } else {
      navigateToVideo('easy', 'introduction');
    }
    
    clearUserAnswer();
  };

  const handleExit = () => {
    console.log('User chose to exit - progress already saved, returning to select day');
    
    // Progress already saved as completed when outro was reached
    // Just navigate back to select day
    navigate('/select-day', { state: { studentID } });
  };

  const handleOutroChoice = (choice) => {
    const normalizedChoice = choice.trim().toLowerCase();
    
    // Check for play again: 1 or Green
    if (normalizedChoice === '1' || normalizedChoice === 'green') {
      handlePlayAgain();
    }
    // Check for exit: 2 or Red
    else if (normalizedChoice === '2' || normalizedChoice === 'red') {
      handleExit();
    }
  };

  const handleIntroductionCommand = () => {
    console.log("Introduction command (1) detected");
    
    if (!gameStartTime && currentDifficulty === 'easy' && currentStage === 'introduction') {
      setGameStartTime(new Date());
      console.log('Game timer started');
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    
    setIntroductionCompleted(true);
    setWaitingForStart(false);
    addCurrentToHistory();
    navigateToVideo('easy', 'map');
    
    clearUserAnswer();
  };

  const handleStartCommand = () => {
    console.log("Start command detected");
    
    if (videoPaused && videoRef.current) {
      videoRef.current.play();
      setVideoPaused(false);
    } else if (waitingForStart) {
      setWaitingForStart(false);
      addCurrentToHistory();
      navigateToVideo('easy', 'map');
    } else if (currentDifficulty === 'videolesson') {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      
      addCurrentToHistory();
      navigateToVideo('easy', 'introduction');
    }
    
    clearUserAnswer();
  };

  const handleNextCommand = () => {
    console.log("Next command detected");
    
    // Don't allow next command at outro
    if (currentStage === 'outro') {
      console.log("Next command blocked at outro - waiting for play again or exit choice");
      clearUserAnswer();
      return;
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    
    if (currentStage.includes('question')) {
      if (currentDifficulty === 'easy') {
        setAnsweredQuestions(prev => ({ 
          ...prev, 
          easy: prev.easy === 'not_yet_answered' ? 'skipped' : prev.easy 
        }));
      } else if (currentDifficulty === 'medium') {
        if (currentStage === 'question1') {
          setAnsweredQuestions(prev => ({
            ...prev,
            medium: { 
              ...prev.medium, 
              question1: prev.medium.question1 === 'not_yet_answered' ? 'skipped' : prev.medium.question1 
            }
          }));
        } else if (currentStage === 'question2') {
          setAnsweredQuestions(prev => ({
            ...prev,
            medium: { 
              ...prev.medium, 
              question2: prev.medium.question2 === 'not_yet_answered' ? 'skipped' : prev.medium.question2 
            }
          }));
        }
      } else if (currentDifficulty === 'hard') {
        if (currentStage === 'question1') {
          setAnsweredQuestions(prev => ({
            ...prev,
            hard: { 
              ...prev.hard, 
              question1: prev.hard.question1 === 'not_yet_answered' ? 'skipped' : prev.hard.question1 
            }
          }));
        } else if (currentStage === 'question2') {
          setAnsweredQuestions(prev => ({
            ...prev,
            hard: { 
              ...prev.hard, 
              question2: prev.hard.question2 === 'not_yet_answered' ? 'skipped' : prev.hard.question2 
            }
          }));
        } else if (currentStage === 'question3') {
          setAnsweredQuestions(prev => ({
            ...prev,
            hard: { 
              ...prev.hard, 
              question3: prev.hard.question3 === 'not_yet_answered' ? 'skipped' : prev.hard.question3 
            }
          }));
        }
      }
    }
    
    if (currentDifficulty === 'videolesson') {
      addCurrentToHistory();
      navigateToVideo('easy', 'introduction');
      clearUserAnswer();
      return;
    }
    
    if (currentDifficulty === 'easy') {
      if (currentStage === 'introduction') {
        setIntroductionCompleted(true);
        setWaitingForStart(false);
      }
      
      if (currentStage === 'introduction') {
        addCurrentToHistory();
        navigateToVideo('easy', 'map');
      } else if (currentStage === 'map') {
        addCurrentToHistory();
        navigateToVideo('easy', 'lesson');
      } else if (currentStage === 'lesson') {
        addCurrentToHistory();
        navigateToVideo('easy', 'question');
      } else if (currentStage === 'question') {
        addCurrentToHistory();
        navigateToVideo('medium', 'map');
      } else if (currentStage === 'achievement') {
        addCurrentToHistory();
        navigateToVideo('medium', 'map');
      } else if (currentStage === 'wrong_answer') {
        navigateToVideo('easy', 'question');
      }
      clearUserAnswer();
      return;
    }
    
    if (currentDifficulty === 'medium') {
      if (currentStage === 'map') {
        addCurrentToHistory();
        navigateToVideo('medium', 'lesson');
      } else if (currentStage === 'lesson') {
        addCurrentToHistory();
        navigateToVideo('medium', 'question1');
      } else if (currentStage === 'question1') {
        addCurrentToHistory();
        navigateToVideo('medium', 'question2');
      } else if (currentStage === 'achievement1') {
        addCurrentToHistory();
        navigateToVideo('medium', 'question2');
      } else if (currentStage === 'question2') {
        addCurrentToHistory();
        navigateToVideo('hard', 'map');
      } else if (currentStage === 'achievement2') {
        const bothCorrect = 
          answeredQuestions.medium.question1 === 'correct' &&
          answeredQuestions.medium.question2 === 'correct';
        
        if (bothCorrect) {
          addCurrentToHistory();
          navigateToVideo('medium', 'final_achievement');
        } else {
          addCurrentToHistory();
          navigateToVideo('hard', 'map');
        }
      } else if (currentStage === 'final_achievement') {
        addCurrentToHistory();
        navigateToVideo('hard', 'map');
      } else if (currentStage === 'wrong_answer1') {
        navigateToVideo('medium', 'question1');
      } else if (currentStage === 'wrong_answer2') {
        navigateToVideo('medium', 'question2');
      }
      clearUserAnswer();
      return;
    }
    
    if (currentDifficulty === 'hard') {
      if (currentStage === 'map') {
        addCurrentToHistory();
        navigateToVideo('hard', 'lesson');
      } else if (currentStage === 'lesson') {
        addCurrentToHistory();
        navigateToVideo('hard', 'question1');
      } else if (currentStage === 'question1') {
        addCurrentToHistory();
        navigateToVideo('hard', 'question2');
      } else if (currentStage === 'achievement1') {
        addCurrentToHistory();
        navigateToVideo('hard', 'question2');
      } else if (currentStage === 'question2') {
        addCurrentToHistory();
        navigateToVideo('hard', 'question3');
      } else if (currentStage === 'achievement2') {
        addCurrentToHistory();
        navigateToVideo('hard', 'question3');
      } else if (currentStage === 'question3') {
        const firstSkipped = getFirstSkippedQuestion();
        
        if (firstSkipped) {
          addCurrentToHistory();
          navigateToVideo(firstSkipped.difficulty, firstSkipped.stage);
        }
      } else if (currentStage === 'achievement3') {
        const firstSkipped = getFirstSkippedQuestion();
        
        if (firstSkipped) {
          addCurrentToHistory();
          navigateToVideo(firstSkipped.difficulty, firstSkipped.stage);
        } else if (areAllQuestionsAnswered()) {
          addCurrentToHistory();
          navigateToVideo('hard', 'final_achievement');
        }
      } else if (currentStage === 'final_achievement') {
        addCurrentToHistory();
        navigateToVideo('hard', 'last_map');
      } else if (currentStage === 'last_map') {
        addCurrentToHistory();
        navigateToVideo('hard', 'outro');
      } else if (currentStage === 'wrong_answer1') {
        navigateToVideo('hard', 'question1');
      } else if (currentStage === 'wrong_answer2') {
        navigateToVideo('hard', 'question2');
      } else if (currentStage === 'wrong_answer3') {
        navigateToVideo('hard', 'question3');
      }
      clearUserAnswer();
      return;
    }
    
    clearUserAnswer();
  };

  const handlePreviousCommand = () => {
    console.log("Previous command detected");
    
    if (currentDifficulty === 'videolesson') {
      playButtonClickSound();
      navigate('/select-day', { state: { studentID } });
      clearUserAnswer();
      return;
    }
    
    if (videoHistory.length > 0) {
      const previousVideo = videoHistory[videoHistory.length - 1];
      
      setVideoHistory(prev => prev.slice(0, -1));
      navigateToVideo(previousVideo.difficulty, previousVideo.stage);
    }
    
    clearUserAnswer();
  };

  const handlePauseCommand = () => {
    console.log("Pause command detected");
    
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setVideoPaused(true);
    }
    
    clearUserAnswer();
  };

  const areAnswersEqual = (answer1, answer2) => {
    if (!answer1 || !answer2) return false;
    return answer1.trim().toLowerCase() === answer2.trim().toLowerCase();
  };

  const getAnswerType = () => {
    let expectedAnswer = '';
    
    if (currentDifficulty === 'easy') {
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
    
    if (expectedAnswer === 'Yes' || expectedAnswer === 'No') {
      return 'yesno';
    } else if (['Red', 'Blue', 'Green', 'Yellow'].includes(expectedAnswer)) {
      return 'color';
    } else if (!isNaN(expectedAnswer) || /^\d+$/.test(expectedAnswer)) {
      return 'number';
    } else {
      return 'text';
    }
  };

  const handleKeyboardAnswer = (answer) => {
    if (!currentStage.includes('question')) return;
    
    // Only accept answer if it matches one of the 3 valid answers
    if (isValidAnswer(answer)) {
      console.log('Valid keyboard answer accepted:', answer);
      checkAnswer(answer);
    } else {
      console.log('Invalid keyboard answer rejected (not one of the 3 valid answers):', answer);
      console.log('Valid answers are:', {
        correct: validAnswers.correctAnswer,
        wrong1: validAnswers.wrongAnswer1,
        wrong2: validAnswers.wrongAnswer2
      });
    }
  };

  const checkAnswer = (answer) => {
    let correctAnswer;
    let isCorrect = false;
    
    if (currentDifficulty === 'easy') {
      correctAnswer = easyGameData?.correct_answer || '';
      isCorrect = areAnswersEqual(answer, correctAnswer);
      
      setAnsweredQuestions(prev => ({ 
        ...prev, 
        easy: isCorrect ? 'correct' : 'wrong' 
      }));
    } else if (currentDifficulty === 'medium') {
      if (currentStage === 'question1') {
        correctAnswer = mediumGameData?.answer1 || '';
        isCorrect = areAnswersEqual(answer, correctAnswer);
        
        setAnsweredQuestions(prev => ({
          ...prev,
          medium: { 
            ...prev.medium, 
            question1: isCorrect ? 'correct' : 'wrong' 
          }
        }));
      } else if (currentStage === 'question2') {
        correctAnswer = mediumGameData?.answer2 || '';
        isCorrect = areAnswersEqual(answer, correctAnswer);
        
        setAnsweredQuestions(prev => ({
          ...prev,
          medium: { 
            ...prev.medium, 
            question2: isCorrect ? 'correct' : 'wrong' 
          }
        }));
      }
    } else if (currentDifficulty === 'hard') {
      if (currentStage === 'question1') {
        correctAnswer = hardGameData?.answer1 || '';
        isCorrect = areAnswersEqual(answer, correctAnswer);
        
        setAnsweredQuestions(prev => ({
          ...prev,
          hard: { 
            ...prev.hard, 
            question1: isCorrect ? 'correct' : 'wrong' 
          }
        }));
      } else if (currentStage === 'question2') {
        correctAnswer = hardGameData?.answer2 || '';
        isCorrect = areAnswersEqual(answer, correctAnswer);
        
        setAnsweredQuestions(prev => ({
          ...prev,
          hard: { 
            ...prev.hard, 
            question2: isCorrect ? 'correct' : 'wrong' 
          }
        }));
      } else if (currentStage === 'question3') {
        correctAnswer = hardGameData?.answer3 || '';
        isCorrect = areAnswersEqual(answer, correctAnswer);
        
        setAnsweredQuestions(prev => ({
          ...prev,
          hard: { 
            ...prev.hard, 
            question3: isCorrect ? 'correct' : 'wrong' 
          }
        }));
      }
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    
    if (isCorrect) {
      if (currentDifficulty === 'easy') {
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'achievement');
      } else if (currentDifficulty === 'medium') {
        if (currentStage === 'question1') {
          addCurrentToHistory();
          navigateToVideo(currentDifficulty, 'achievement1');
        } else if (currentStage === 'question2') {
          addCurrentToHistory();
          navigateToVideo(currentDifficulty, 'achievement2');
        }
      } else if (currentDifficulty === 'hard') {
        if (currentStage === 'question1') {
          addCurrentToHistory();
          navigateToVideo(currentDifficulty, 'achievement1');
        } else if (currentStage === 'question2') {
          addCurrentToHistory();
          navigateToVideo(currentDifficulty, 'achievement2');
        } else if (currentStage === 'question3') {
          addCurrentToHistory();
          navigateToVideo(currentDifficulty, 'achievement3');
        }
      }
    } else {
      if (currentDifficulty === 'easy') {
        navigateToVideo(currentDifficulty, 'wrong_answer');
      } else if (currentDifficulty === 'medium') {
        if (currentStage === 'question1') {
          navigateToVideo(currentDifficulty, 'wrong_answer1');
        } else if (currentStage === 'question2') {
          navigateToVideo(currentDifficulty, 'wrong_answer2');
        }
      } else if (currentDifficulty === 'hard') {
        if (currentStage === 'question1') {
          navigateToVideo(currentDifficulty, 'wrong_answer1');
        } else if (currentStage === 'question2') {
          navigateToVideo(currentDifficulty, 'wrong_answer2');
        } else if (currentStage === 'question3') {
          navigateToVideo(currentDifficulty, 'wrong_answer3');
        }
      }
    }
    
    setWaitingForAnswer(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
      }
      
      if (currentStage.includes('question')) {
        const answerType = getAnswerType();
        
        if (answerType === 'color') {
          if (e.key.toLowerCase() === 'r') {
            handleKeyboardAnswer('Red');
          } else if (e.key.toLowerCase() === 'y') {
            handleKeyboardAnswer('Yellow');
          } else if (e.key.toLowerCase() === 'g') {
            handleKeyboardAnswer('Green');
          } else if (e.key.toLowerCase() === 'b') {
            handleKeyboardAnswer('Blue');
          }
        } else if (answerType === 'yesno') {
          if (e.key.toLowerCase() === 'y') {
            handleKeyboardAnswer('Yes');
          } else if (e.key.toLowerCase() === 'n') {
            handleKeyboardAnswer('No');
          }
        } else if (answerType === 'number') {
          if ('0123456789'.includes(e.key)) {
            handleKeyboardAnswer(e.key);
          }
        }
      }
      
      // Handle introduction stage - check for "1" key
      if (currentDifficulty === 'easy' && currentStage === 'introduction') {
        if (e.key === '1') {
          handleIntroductionCommand();
        }
      }
      
      // Handle outro choices with keyboard
      if (currentStage === 'outro' && waitingForOutroChoice) {
        if (e.key === '1') {
          handleOutroChoice('1');
        } else if (e.key === '2') {
          handleOutroChoice('2');
        } else if (e.key.toLowerCase() === 'g') {
          handleOutroChoice('Green');
        } else if (e.key.toLowerCase() === 'r') {
          handleOutroChoice('Red');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentStage, currentDifficulty, waitingForOutroChoice, easyGameData, mediumGameData, hardGameData, validAnswers, isValidAnswer, handleIntroductionCommand, handleOutroChoice, handleKeyboardAnswer, getAnswerType]);

  useEffect(() => {
    const userAnswerRef = ref(database, `userAnswers`);
    
    const handleDataChange = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        if (data) {
          let answer = '';
          
          if (typeof data === 'object' && data.answer !== undefined && data.answer !== null) {
            answer = String(data.answer);
          } else if (typeof data === 'string') {
            answer = data;
          } else if (data !== null && data !== undefined) {
            answer = String(data);
          }
          
          // Ensure answer is a string before calling string methods
          if (answer && typeof answer === 'string' && answer.trim() !== '') {
            const trimmedAnswer = answer.trim().toLowerCase();
            
            // Handle outro choice
            if (currentStage === 'outro' && waitingForOutroChoice) {
              handleOutroChoice(answer);
              return;
            }
            
            // Handle introduction stage - check for "1" even while video is playing
            if (currentDifficulty === 'easy' && currentStage === 'introduction') {
              if (trimmedAnswer === '1') {
                handleIntroductionCommand();
                return;
              }
            }
            
            if (trimmedAnswer === 'start') {
              handleStartCommand();
              return;
            } else if (trimmedAnswer === 'next') {
              handleNextCommand();
              return;
            } else if (trimmedAnswer === 'previous') {
              handlePreviousCommand();
              return;
            } else if (trimmedAnswer === 'pause') {
              handlePauseCommand();
              return;
            }
            
            // Ensure lastProcessedAnswer is a string before comparison
            const lastAnswer = lastProcessedAnswer ? String(lastProcessedAnswer).toLowerCase() : '';
            if (answer.toLowerCase() !== lastAnswer) {
              setLastProcessedAnswer(answer);
              
              if (currentStage.includes('question')) {
                // Only accept answer if it matches one of the 3 valid answers
                if (isValidAnswer(answer)) {
                  console.log('Valid answer accepted:', answer);
                  checkAnswer(answer);
                  clearUserAnswer();
                } else {
                  console.log('Invalid answer rejected (not one of the 3 valid answers):', answer);
                  console.log('Valid answers are:', {
                    correct: validAnswers.correctAnswer,
                    wrong1: validAnswers.wrongAnswer1,
                    wrong2: validAnswers.wrongAnswer2
                  });
                  // Clear the invalid answer from Firebase
                  clearUserAnswer();
                }
              }
            }
          }
        }
      }
    };

    onValue(userAnswerRef, handleDataChange);
    
    return () => {
      off(userAnswerRef);
    };
  }, [lastProcessedAnswer, currentDifficulty, currentStage, waitingForOutroChoice, introductionCompleted, videoPaused, waitingForStart, studentID, easyGameData, mediumGameData, hardGameData, validAnswers, isValidAnswer, handleIntroductionCommand, handleStartCommand, handleNextCommand, handlePreviousCommand, handlePauseCommand, handleOutroChoice, checkAnswer]);

  const playButtonClickSound = () => {
    buttonClickSound.currentTime = 0;
    buttonClickSound.play();
  };

  const getVideoUrl = (path, difficulty) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    let apiUrl;
    switch(difficulty) {
      case 'videolesson':
        apiUrl = VIDEOLESSON_API_URL;
        break;
      case 'medium':
        apiUrl = MEDIUM_API_URL;
        break;
      case 'hard':
        apiUrl = HARD_API_URL;
        break;
      default:
        apiUrl = EASY_API_URL;
    }
    
    return `${apiUrl}?action=getVideo&file=${encodeURIComponent(path)}`;
  };

  useEffect(() => {
    if (!selectedDay || !studentID) {
      setError('Selected day or student ID is missing. Please go back and select a day.');
      return;
    }
    
    initializeComponent();
  }, [selectedDay, studentID]);

  const initializeComponent = async () => {
    setLoading(true);
    setIsFullyInitialized(false);
    
    try {
      const student = await fetchStudentData(studentID);
      if (!student) {
        setError('Student not found. Please check the student ID.');
        return;
      }
      
      await fetchDayAssignmentAndGames();
      
      setIsFullyInitialized(true);
      
    } catch (error) {
      console.error('Error initializing component:', error);
      setError('Failed to initialize. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const allHardAnswered = 
      (answeredQuestions.hard.question1 === 'correct' || answeredQuestions.hard.question1 === 'wrong' || answeredQuestions.hard.question1 === 'skipped') &&
      (answeredQuestions.hard.question2 === 'correct' || answeredQuestions.hard.question2 === 'wrong' || answeredQuestions.hard.question2 === 'skipped') &&
      (answeredQuestions.hard.question3 === 'correct' || answeredQuestions.hard.question3 === 'wrong' || answeredQuestions.hard.question3 === 'skipped');
    
    if (allHardAnswered && currentDifficulty === 'hard') {
      setAllQuestionsAnswered(true);
      if (currentStage.includes('achievement')) {
        setCurrentStage('final_achievement');
        setVideoEnded(false);
      }
    }
  }, [answeredQuestions.hard, currentDifficulty, currentStage]);

  const fetchVideoLesson = async (category) => {
    try {
      const response = await fetch(`${VIDEOLESSON_API_URL}?action=getVideoLessons&category=${category}`);
      const data = await response.json();
      
      if (data.success && data.videoLessons && data.videoLessons.length > 0) {
        const activeVideoLesson = data.videoLessons.find(vl => vl.status === 'in use');
        
        if (activeVideoLesson) {
          const processedVideoLesson = {
            ...activeVideoLesson,
            videoUrl: getVideoUrl(activeVideoLesson.video_path, 'videolesson')
          };
          setVideoLessonData(processedVideoLesson);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Error fetching video lesson:', err);
      return false;
    }
  };

  const fetchDayAssignmentAndGames = async () => {
    const maxRetries = 3;
    const retryDelay = 1500;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${maxRetries} - Fetching day assignment and games`);
        
        const assignmentUrl = `${ASSIGNMENT_API_URL}?action=fetch_day_assignment&day=${selectedDay}`;
        const assignmentResponse = await fetch(assignmentUrl);
        
        const contentType = assignmentResponse.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await assignmentResponse.text();
          console.error(`Attempt ${attempt}: Server returned non-JSON response:`, text.substring(0, 200));
          throw new Error('Server returned invalid response');
        }
        
        const assignmentData = await assignmentResponse.json();
        
        if (!assignmentData.success || !assignmentData.assignment) {
          throw new Error(`No games assigned for ${selectedDay}`);
        }
        
        const assignment = assignmentData.assignment;
        setDayAssignment(assignment);
        
        const category = assignment.category;
        
        const hasProgress = await loadProgress(studentID, selectedDay, category);
        
        if (!hasProgress) {
          setGameStartTime(new Date());
          setCurrentAttempt(1);
        }
        
        const hasVideoLesson = await fetchVideoLesson(category);
        
        if (!hasVideoLesson && !hasProgress) {
          setCurrentDifficulty('easy');
          setCurrentStage('introduction');
        }
        
        const [easyResponse, mediumResponse, hardResponse] = await Promise.all([
          fetch(`${EASY_API_URL}?action=getGames&category=${category}`),
          fetch(`${MEDIUM_API_URL}?action=getGames&category=${category}`),
          fetch(`${HARD_API_URL}?action=getGames&category=${category}`)
        ]);
        
        const easyData = await easyResponse.json();
        const mediumData = await mediumResponse.json();
        const hardData = await hardResponse.json();
        
        if (easyData.success && easyData.games && easyData.games.length > 0) {
          const easyGame = easyData.games.find(g => g.easy_id === assignment.easyID);
          if (easyGame) {
            const processedEasyGame = {
              ...easyGame,
              introduction: easyGame.introduction ? {
                ...easyGame.introduction,
                videoUrl: getVideoUrl(easyGame.introduction.path, 'easy')
              } : null,
              map: easyGame.map ? {
                ...easyGame.map,
                videoUrl: getVideoUrl(easyGame.map.path, 'easy')
              } : null,
              lesson: easyGame.lesson ? {
                ...easyGame.lesson,
                videoUrl: getVideoUrl(easyGame.lesson.path, 'easy')
              } : null,
              question: easyGame.question ? {
                ...easyGame.question,
                videoUrl: getVideoUrl(easyGame.question.path, 'easy')
              } : null,
              achievement: easyGame.achievement ? {
                ...easyGame.achievement,
                videoUrl: getVideoUrl(easyGame.achievement.path, 'easy')
              } : null,
              wrong_answer: easyGame.wrong_answer ? {
                ...easyGame.wrong_answer,
                videoUrl: getVideoUrl(easyGame.wrong_answer.path, 'easy')
              } : null
            };
            setEasyGameData(processedEasyGame);
          }
        }
        
        if (mediumData.success && mediumData.games && mediumData.games.length > 0) {
          const mediumGame = mediumData.games.find(g => g.medium_id === assignment.mediumID);
          if (mediumGame) {
            const processedMediumGame = {
              ...mediumGame,
              map: mediumGame.map ? {
                ...mediumGame.map,
                videoUrl: getVideoUrl(mediumGame.map.path, 'medium')
              } : null,
              lesson: mediumGame.lesson ? {
                ...mediumGame.lesson,
                videoUrl: getVideoUrl(mediumGame.lesson.path, 'medium')
              } : null,
              question1: mediumGame.question1 ? {
                ...mediumGame.question1,
                videoUrl: getVideoUrl(mediumGame.question1.path, 'medium')
              } : null,
              achievement1: mediumGame.achievement1 ? {
                ...mediumGame.achievement1,
                videoUrl: getVideoUrl(mediumGame.achievement1.path, 'medium')
              } : null,
              wrong_answer1: mediumGame.wrong_answer1 ? {
                ...mediumGame.wrong_answer1,
                videoUrl: getVideoUrl(mediumGame.wrong_answer1.path, 'medium')
              } : null,
              question2: mediumGame.question2 ? {
                ...mediumGame.question2,
                videoUrl: getVideoUrl(mediumGame.question2.path, 'medium')
              } : null,
              achievement2: mediumGame.achievement2 ? {
                ...mediumGame.achievement2,
                videoUrl: getVideoUrl(mediumGame.achievement2.path, 'medium')
              } : null,
              wrong_answer2: mediumGame.wrong_answer2 ? {
                ...mediumGame.wrong_answer2,
                videoUrl: getVideoUrl(mediumGame.wrong_answer2.path, 'medium')
              } : null,
              final_achievement: mediumGame.final_achievement ? {
                ...mediumGame.final_achievement,
                videoUrl: getVideoUrl(mediumGame.final_achievement.path, 'medium')
              } : null
            };
            setMediumGameData(processedMediumGame);
          }
        }
        
        if (hardData.success && hardData.games && hardData.games.length > 0) {
          const hardGame = hardData.games.find(g => g.hard_id === assignment.hardID);
          if (hardGame) {
            const processedHardGame = {
              ...hardGame,
              map: hardGame.map ? {
                ...hardGame.map,
                videoUrl: getVideoUrl(hardGame.map.path, 'hard')
              } : null,
              lesson: hardGame.lesson ? {
                ...hardGame.lesson,
                videoUrl: getVideoUrl(hardGame.lesson.path, 'hard')
              } : null,
              question1: hardGame.question1 ? {
                ...hardGame.question1,
                videoUrl: getVideoUrl(hardGame.question1.path, 'hard')
              } : null,
              achievement1: hardGame.achievement1 ? {
                ...hardGame.achievement1,
                videoUrl: getVideoUrl(hardGame.achievement1.path, 'hard')
              } : null,
              wrong_answer1: hardGame.wrong_answer1 ? {
                ...hardGame.wrong_answer1,
                videoUrl: getVideoUrl(hardGame.wrong_answer1.path, 'hard')
              } : null,
              question2: hardGame.question2 ? {
                ...hardGame.question2,
                videoUrl: getVideoUrl(hardGame.question2.path, 'hard')
              } : null,
              achievement2: hardGame.achievement2 ? {
                ...hardGame.achievement2,
                videoUrl: getVideoUrl(hardGame.achievement2.path, 'hard')
              } : null,
              wrong_answer2: hardGame.wrong_answer2 ? {
                ...hardGame.wrong_answer2,
                videoUrl: getVideoUrl(hardGame.wrong_answer2.path, 'hard')
              } : null,
              question3: hardGame.question3 ? {
                ...hardGame.question3,
                videoUrl: getVideoUrl(hardGame.question3.path, 'hard')
              } : null,
              achievement3: hardGame.achievement3 ? {
                ...hardGame.achievement3,
                videoUrl: getVideoUrl(hardGame.achievement3.path, 'hard')
              } : null,
              wrong_answer3: hardGame.wrong_answer3 ? {
                ...hardGame.wrong_answer3,
                videoUrl: getVideoUrl(hardGame.wrong_answer3.path, 'hard')
              } : null,
              final_achievement: hardGame.final_achievement ? {
                ...hardGame.final_achievement,
                videoUrl: getVideoUrl(hardGame.final_achievement.path, 'hard')
              } : null,
              last_map: hardGame.last_map ? {
                ...hardGame.last_map,
                videoUrl: getVideoUrl(hardGame.last_map.path, 'hard')
              } : null,
              outro: hardGame.outro ? {
                ...hardGame.outro,
                videoUrl: getVideoUrl(hardGame.outro.path, 'hard')
              } : null
            };
            setHardGameData(processedHardGame);
          }
        }
        
        setError(null);
        console.log(`Successfully loaded games on attempt ${attempt}`);
        return;
        
      } catch (err) {
        console.error(`Attempt ${attempt} failed:`, err);
        
        if (attempt < maxRetries) {
          console.log(`Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.error('All retry attempts failed');
          setError('Failed to load games. Please check your connection and try again.');
        }
      }
    }
  };

  const handleVideoEnded = () => {
    setVideoEnded(true);
    
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    if (currentStage.includes('question')) {
      setWaitingForAnswer(true);
      setLastProcessedAnswer('');
      return;
    }
    
    // Special handling for outro - wait for user choice
    if (currentStage === 'outro') {
      console.log('Outro video ended - waiting for user choice (Play Again or Exit)');
      setWaitingForOutroChoice(true);
      return;
    }
    
    if (currentDifficulty === 'videolesson') {
      handleVideoLessonEnded();
    } else if (currentDifficulty === 'easy') {
      handleEasyVideoEnded();
    } else if (currentDifficulty === 'medium') {
      handleMediumVideoEnded();
    } else if (currentDifficulty === 'hard') {
      handleHardVideoEnded();
    }
  };

  const handleVideoLessonEnded = () => {
    addCurrentToHistory();
    navigateToVideo('easy', 'introduction');
  };

  const handleEasyVideoEnded = () => {
    switch (currentStage) {
      case 'introduction':
        setIntroductionCompleted(true);
        setWaitingForStart(true);
        break;
        
      case 'map':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'lesson');
        break;
        
      case 'lesson':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'question');
        break;
        
      case 'achievement':
        addCurrentToHistory();
        navigateToVideo('medium', 'map');
        break;
        
      case 'wrong_answer':
        navigateToVideo(currentDifficulty, 'question');
        break;
        
      default:
        break;
    }
  };

  const handleMediumVideoEnded = () => {
    switch (currentStage) {
      case 'map':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'lesson');
        break;
        
      case 'lesson':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'question1');
        break;
        
      case 'achievement1':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'question2');
        break;
        
      case 'wrong_answer1':
        navigateToVideo(currentDifficulty, 'question1');
        break;
        
      case 'achievement2':
        const bothCorrect = 
          answeredQuestions.medium.question1 === 'correct' &&
          answeredQuestions.medium.question2 === 'correct';
        
        if (bothCorrect) {
          addCurrentToHistory();
          navigateToVideo(currentDifficulty, 'final_achievement');
        } else {
          addCurrentToHistory();
          navigateToVideo('hard', 'map');
        }
        break;
        
      case 'wrong_answer2':
        navigateToVideo(currentDifficulty, 'question2');
        break;
        
      case 'final_achievement':
        addCurrentToHistory();
        navigateToVideo('hard', 'map');
        break;
        
      default:
        break;
    }
  };

  const handleHardVideoEnded = () => {
    switch (currentStage) {
      case 'map':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'lesson');
        break;
        
      case 'lesson':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'question1');
        break;
        
      case 'achievement1':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'question2');
        break;
        
      case 'wrong_answer1':
        navigateToVideo(currentDifficulty, 'question1');
        break;
        
      case 'achievement2':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'question3');
        break;
        
      case 'wrong_answer2':
        navigateToVideo(currentDifficulty, 'question2');
        break;
        
      case 'achievement3':
        const firstSkipped = getFirstSkippedQuestion();
        
        if (firstSkipped) {
          addCurrentToHistory();
          navigateToVideo(firstSkipped.difficulty, firstSkipped.stage);
        } else if (areAllQuestionsAnswered()) {
          addCurrentToHistory();
          navigateToVideo(currentDifficulty, 'final_achievement');
        }
        break;
        
      case 'wrong_answer3':
        navigateToVideo(currentDifficulty, 'question3');
        break;
        
      case 'final_achievement':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'last_map');
        break;
        
      case 'last_map':
        addCurrentToHistory();
        navigateToVideo(currentDifficulty, 'outro');
        break;
        
      case 'outro':
        // This is now handled in handleVideoEnded with waitingForOutroChoice
        break;
        
      default:
        break;
    }
  };

  const getCurrentVideo = () => {
    if (currentDifficulty === 'videolesson') {
      return videoLessonData?.videoUrl;
    }
    
    if (currentDifficulty === 'easy') {
      if (!easyGameData) return null;
      
      switch (currentStage) {
        case 'introduction':
          return easyGameData.introduction?.videoUrl;
        case 'map':
          return easyGameData.map?.videoUrl;
        case 'lesson':
          return easyGameData.lesson?.videoUrl;
        case 'question':
          return easyGameData.question?.videoUrl;
        case 'achievement':
          return easyGameData.achievement?.videoUrl;
        case 'wrong_answer':
          return easyGameData.wrong_answer?.videoUrl;
        default:
          return null;
      }
    } else if (currentDifficulty === 'medium') {
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
        case 'wrong_answer1':
          return mediumGameData.wrong_answer1?.videoUrl;
        case 'question2':
          return mediumGameData.question2?.videoUrl;
        case 'achievement2':
          return mediumGameData.achievement2?.videoUrl;
        case 'wrong_answer2':
          return mediumGameData.wrong_answer2?.videoUrl;
        case 'final_achievement':
          return mediumGameData.final_achievement?.videoUrl;
        default:
          return null;
      }
    } else if (currentDifficulty === 'hard') {
      if (!hardGameData) return null;
      
      switch (currentStage) {
        case 'map':
          return hardGameData.map?.videoUrl;
        case 'lesson':
          return hardGameData.lesson?.videoUrl;
        case 'question1':
          return hardGameData.question1?.videoUrl;
        case 'achievement1':
          return hardGameData.achievement1?.videoUrl;
        case 'wrong_answer1':
          return hardGameData.wrong_answer1?.videoUrl;
        case 'question2':
          return hardGameData.question2?.videoUrl;
        case 'achievement2':
          return hardGameData.achievement2?.videoUrl;
        case 'wrong_answer2':
          return hardGameData.wrong_answer2?.videoUrl;
        case 'question3':
          return hardGameData.question3?.videoUrl;
        case 'achievement3':
          return hardGameData.achievement3?.videoUrl;
        case 'wrong_answer3':
          return hardGameData.wrong_answer3?.videoUrl;
        case 'final_achievement':
          return hardGameData.final_achievement?.videoUrl;
        case 'last_map':
          return hardGameData.last_map?.videoUrl;
        case 'outro':
          return hardGameData.outro?.videoUrl;
        default:
          return null;
      }
    }
    
    return null;
  };

  const handleVideoError = (e) => {
    console.error('Video error:', e);
    setWaitingForAnswer(false);
    
    setTimeout(() => {
      handleVideoEnded();
    }, 1000);
  };

  const handleBack = () => {
    playButtonClickSound();
    setWaitingForAnswer(false);
    
    const currentCheckpoint = `${currentDifficulty}_${currentStage}`;
    
    const saveCurrentProgress = async () => {
      if (!isFullyInitialized || 
          !studentData || 
          !dayAssignment || 
          !studentID || 
          !selectedDay ||
          !studentData.first_name ||
          !dayAssignment.category) {
        navigate('/select-day', { state: { studentID } });
        return;
      }
      
      try {
        const gameEndTime = new Date();
        const timePlayed = gameStartTime ? Math.round((gameEndTime - gameStartTime) / (1000 * 60)) : 0;
        
        const progressData = {
          action: 'saveProgress',
          studentID: studentID,
          studentName: `${studentData.first_name} ${studentData.middle_name || ''} ${studentData.last_name}`.trim(),
          day: selectedDay,
          category: dayAssignment.category,
          e_quest1: answeredQuestions.easy,
          m_quest1: answeredQuestions.medium.question1,
          m_quest2: answeredQuestions.medium.question2,
          h_quest1: answeredQuestions.hard.question1,
          h_quest2: answeredQuestions.hard.question2,
          h_quest3: answeredQuestions.hard.question3,
          checkpoint: currentCheckpoint,
          attempts: currentAttempt,
          time: timePlayed,
          isComplete: false
        };
        
        const response = await fetch(PROGRESS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(progressData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseText = await response.text();
        
        if (!responseText.trim().startsWith('{')) {
          navigate('/select-day', { state: { studentID } });
          return;
        }
        
        const result = JSON.parse(responseText);
        
      } catch (error) {
        console.error('Error saving on back button:', error);
      }
      
      navigate('/select-day', { state: { studentID } });
    };
    
    saveCurrentProgress();
  };

  const handleSettingsClick = () => {
    playButtonClickSound();
    setShowSettings(true);
  };

  const renderVideoPlayer = () => {
    const videoUrl = getCurrentVideo();
    
    if (!videoUrl) {
      return (
        <div className="videopresentation__no-video">
          <p>No video available for this stage.</p>
        </div>
      );
    }
    
    return (
      <div className="videopresentation__video-container">
        <video
          ref={videoRef}
          className="videopresentation__video-player"
          src={videoUrl}
          autoPlay={!waitingForStart}
          muted={false}
          playsInline
          disablePictureInPicture
          controlsList="nodownload noplaybackrate"
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          preload="auto"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1
          }}
        />
        
        {waitingForStart && (
          <div className="videopresentation__waiting-start">
            {currentDifficulty === 'easy' && currentStage === 'introduction' ? (
              <p>Press 1 to continue to the next level</p>
            ) : (
              <p>Press START to continue to the next level</p>
            )}
          </div>
        )}
        
        {currentDifficulty === 'easy' && currentStage === 'introduction' && !waitingForStart && (
          <div className="videopresentation__waiting-start">
            <p>Press 1 to continue to the next level</p>
          </div>
        )}
        
        {waitingForOutroChoice && (
          <div className="videopresentation__waiting-outro">
            <p>Choose: 1/Green for Play Again or 2/Red to Exit</p>
          </div>
        )}
        
        <div className="videopresentation__video-indicator">
          <FaVolumeUp /> Sound enabled
        </div>
      </div>
    );
  };

  const getDayColor = (day) => {
    const dayColors = {
      'MONDAY': '#f44336',
      'TUESDAY': '#ff9800', 
      'WEDNESDAY': '#e6c700',
      'THURSDAY': '#66cc33',
      'FRIDAY': '#2196f3'
    };
    return dayColors[day] || '#666';
  };

  if (error) {
    return (
      <div className="videopresentation__container">
        <button className="videopresentation__back-button" onClick={handleBack}>
          <FiChevronLeft size={32} className="back-icon" />
          <span className="videopresentation__back-label">Back</span>
        </button>
        
        <div className="videopresentation__error">
          <p>{error}</p>
          <button 
            className="videopresentation__retry-button" 
            onClick={initializeComponent}
          >
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

  if (loading) {
    return (
      <div className="videopresentation__container">
        <button className="videopresentation__back-button" onClick={handleBack}>
          <FiChevronLeft size={32} className="back-icon" />
          <span className="videopresentation__back-label">Back</span>
        </button>
        
        <div className="videopresentation__loading">
          <div className="videopresentation__loading-spinner"></div>
          <p>Loading presentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`videopresentation__container ${waitingForAnswer ? 'waiting-for-answer' : ''} ${waitingForStart ? 'waiting-for-start' : ''} ${waitingForOutroChoice ? 'waiting-for-outro' : ''}`}>
      <button className="videopresentation__back-button" onClick={handleBack}>
        <FiChevronLeft size={32} className="back-icon" />
        <span className="videopresentation__back-label">Back</span>
      </button>
      
      <button className="videopresentation__settings-button" onClick={handleSettingsClick}>
        <FiSettings size={32} className="settings-icon" />
        <span className="videopresentation__settings-label">Settings</span>
      </button>

      {selectedDay && dayAssignment && (
        <div className="videopresentation__day-header">
          <span 
            className="selected-day-badge"
            style={{ 
              backgroundColor: getDayColor(selectedDay),
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {selectedDay} - {dayAssignment.category}
          </span>
        </div>
      )}
      
      <div className="videopresentation__video-wrapper">
        {renderVideoPlayer()}
      </div>

      {showSettings && <Settings onClose={() => {
        playButtonClickSound();
        setShowSettings(false);
      }} />}
    </div>
  );
};

export default VideoPresentation;