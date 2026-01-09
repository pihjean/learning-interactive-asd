import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AdminLogin from './admin/adminlogin';
import Sidebar from './admin/sidebar';
import StudentList from './admin/studentlist';
import DailyLessonDetails from './admin/dailylessondetail';
import ActivitiesDetail from './admin/activitiesdetail';
import DailyLessonQuestionDetails from './admin/dailylessonquestiondetails';
import ActivitiesQuestionDetails from './admin/activitiesquestiondetails';
import LessonPlan from './admin/lessonplan';
import QuestionList from './admin/questionlist';
import DailyLesson from './admin/dailylesson';
import Activities from './admin/activities';
import Question from './admin/question';
import AdminDashboard from './admin/admindashboard';
import VideoPresentationList from './admin/videopresentationlist';

import Games from './admin/games';
import GameEasy from './admin/gameeasy';
import GameMedium from './admin/gamemedium';
import GameHard from './admin/gamehard';

import StudentLogin from "./main/studentlogin";
import SelectType from "./main/selecttype";
import SelectDay from "./main/selectday";
import SelectActivities from "./main/selectactivities";
import SelectDailyLessonActivities from "./main/selectdailylessonactivities";
import SelectDifficulty from "./main/selectdifficulty";
import SelectDailyLessonDifficulty from "./main/selectdailylessondifficulty";
import ActivitiesColorEasy from "./main/activitiescoloreasy";
import ActivitiesColorMedium from "./main/activitiescolormedium";
import ActivitiesColorHard from "./main/activitiescolorhard";
import ActivitiesShapeEasy from "./main/activitiesshapeeasy";
import ActivitiesShapeMedium from "./main/activitiesshapemedium";
import ActivitiesShapeHard from "./main/activitiesshapehard";
import ActivitiesNumberEasy from "./main/activitiesnumbereasy";
import ActivitiesNumberMedium from "./main/activitiesnumbermedium";
import ActivitiesNumberHard from "./main/activitiesnumberhard";
import ActivitiesAnimalEasy from "./main/activitiesanimaleasy";
import ActivitiesAnimalMedium from "./main/activitiesanimalmedium";
import ActivitiesAnimalHard from "./main/activitiesanimalhard";
import ActivitiesMoneyEasy from "./main/activitiesmoneyeasy";
import ActivitiesMoneyMedium from "./main/activitiesmoneymedium";
import ActivitiesMoneyHard from "./main/activitiesmoneyhard";
import ActivitiesMatchingTypeEasy from "./main/activitiesmatchingtypeeasy";
import ActivitiesMatchingTypeMedium from "./main/activitiesmatchingtypemedium";
import ActivitiesMatchingTypeHard from "./main/activitiesmatchingtypehard";
import DLActivitiesColorEasy from "./main/dlactivitiescoloreasy";
import DLActivitiesColorMedium from "./main/dlactivitiescolormedium";
import DLActivitiesColorHard from "./main/dlactivitiescolorhard";
import DLActivitiesShapeEasy from "./main/dlactivitiesshapeeasy";
import DLActivitiesShapeMedium from "./main/dlactivitiesshapemedium";
import DLActivitiesShapeHard from "./main/dlactivitiesshapehard";
import DLActivitiesNumberEasy from "./main/dlactivitiesnumbereasy";
import DLActivitiesNumberMedium from "./main/dlactivitiesnumbermedium";
import DLActivitiesNumberHard from "./main/dlactivitiesnumberhard";
import DLActivitiesAnimalEasy from "./main/dlactivitiesanimaleasy";
import DLActivitiesAnimalMedium from "./main/dlactivitiesanimalmedium";
import DLActivitiesAnimalHard from "./main/dlactivitiesanimalhard";
import DLActivitiesMoneyEasy from "./main/dlactivitiesmoneyeasy";
import DLActivitiesMoneyMedium from "./main/dlactivitiesmoneymedium";
import DLActivitiesMoneyHard from "./main/dlactivitiesmoneyhard";
import DLActivitiesMatchingTypeEasy from "./main/dlactivitiesmatchingtypeeasy";
import DLActivitiesMatchingTypeMedium from "./main/dlactivitiesmatchingtypemedium";
import DLActivitiesMatchingTypeHard from "./main/dlactivitiesmatchingtypehard";
import VideoGames from "./main/videogames";
import MediumVideoGames from './main/videogamesmedium';
import HardVideoGames from './main/videogameshard';
import MainPage from './admin/mainpage';
import VideoPresentation from './main/videopresentation';

// Import Audio Context Provider
import { AudioProvider } from "./context/AudioContext";

// Import Firebase configuration for global use
import './config';
import './App.css';

// Storage keys for persistence
const STORAGE_KEYS = {
  LOGIN_STATUS: 'learning_system_login_status',
  SELECTED_DATA: 'learning_system_selected_data',
  NAVIGATION_HISTORY: 'learning_system_navigation_history',
  CURRENT_USER: 'learning_system_current_user',
  SESSION_DATA: 'learning_system_session_data',
  LAST_VISITED_PATH: 'learning_system_last_path'
};

// Utility functions for localStorage
const StorageUtils = {
  // Save data to localStorage with error handling
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  // Get data from localStorage with error handling
  getItem: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },

  // Remove item from localStorage
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  // Clear all app-related storage
  clearAppStorage: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      StorageUtils.removeItem(key);
    });
  }
};

// Create a wrapper component for routes that need navigation
const StudentListWithNavigation = () => {
  const navigate = useNavigate();

  const handleViewLesson = (student) => {
    // Store the student data in localStorage for persistence
    StorageUtils.setItem(STORAGE_KEYS.SELECTED_DATA, student);
    // Navigate programmatically
    navigate('/dailyLessonDetails');
  };

  return <StudentList onViewLesson={handleViewLesson} />;
};

// Wrapper for DailyLessonDetails with navigation
const DailyLessonDetailsWithNavigation = ({ selectedData, handleViewChange, handleBack }) => {
  const navigate = useNavigate();
  
  const handleNextNavigation = (lesson, view) => {
    if (view === 'dailyLessonQuestion') {
      handleViewChange(lesson, 'dailyLessonQuestion');
      navigate('/dailyLessonQuestion');
    } else if (view === 'activitiesDetails') {
      handleViewChange(selectedData || StorageUtils.getItem(STORAGE_KEYS.SELECTED_DATA, {}), 'activitiesDetails');
      navigate('/activitiesDetails');
    }
  };

  const handleBackNavigation = () => {
    const path = handleBack();
    navigate(path);
  };

  return (
    <DailyLessonDetails 
      student={selectedData || StorageUtils.getItem(STORAGE_KEYS.SELECTED_DATA, {})} 
      onBack={handleBackNavigation}
      onNext={handleNextNavigation}
    />
  );
};

// Wrapper for DailyLesson with navigation
const DailyLessonWithNavigation = ({ selectedData, handleViewChange }) => {
  const navigate = useNavigate();
  
  const handleViewDetails = (lesson) => {
    // Store the lesson data and navigate directly to questions
    handleViewChange(lesson, 'dailyLessonQuestion');
    navigate('/dailyLessonQuestion');
    return '/dailyLessonQuestion';
  };

  return (
    <DailyLesson
      student={selectedData}
      onViewDetails={handleViewDetails}
    />
  );
};

// Wrapper for ActivitiesDetail with navigation
const ActivitiesDetailWithNavigation = ({ selectedData, handleViewChange, handleBack }) => {
  const navigate = useNavigate();
  
  const handleNextNavigation = (activity, view) => {
    if (view === 'activitiesQuestion') {
      handleViewChange(activity, 'activitiesQuestion');
      navigate('/activitiesQuestion');
    } else if (view === 'dailyLesson') {
      handleViewChange(selectedData, 'dailyLesson');
      navigate('/dailyLesson');
    }
  };

  const handleBackNavigation = () => {
    const path = handleBack();
    navigate(path);
  };

  return (
    <ActivitiesDetail 
      student={selectedData} 
      onBack={handleBackNavigation}
      onNext={handleNextNavigation}
    />
  );
};

// Wrapper for DailyLessonQuestionDetails with navigation
const DailyLessonQuestionDetailsWithNavigation = ({ selectedData, handleBack }) => {
  const navigate = useNavigate();
  
  const handleBackNavigation = () => {
    const path = handleBack();
    navigate(path);
  };

  return (
    <DailyLessonQuestionDetails 
      lesson={selectedData} 
      onBack={handleBackNavigation} 
    />
  );
};

// Wrapper for ActivitiesQuestionDetails with navigation
const ActivitiesQuestionDetailsWithNavigation = ({ selectedData, handleBack }) => {
  const navigate = useNavigate();
  
  const handleBackNavigation = () => {
    const path = handleBack();
    navigate(path);
  };

  return (
    <ActivitiesQuestionDetails 
      activity={selectedData} 
      onBack={handleBackNavigation} 
    />
  );
};

// Wrapper for LessonPlan with navigation
const LessonPlanWithNavigation = ({ handleViewChange }) => {
  const navigate = useNavigate();
  
  const handleNavigateToQuestions = (lessonData) => {
    // Store the lesson data
    handleViewChange(lessonData, 'questionList');
    // Return the path for the caller to use if needed
    return '/questionList';
  };

  return (
    <LessonPlan onNavigateToQuestions={handleNavigateToQuestions} />
  );
};

// Wrapper for QuestionList with navigation
const QuestionListWithNavigation = ({ selectedData, handleBack }) => {
  const navigate = useNavigate();
  
  const handleBackNavigation = () => {
    const path = handleBack();
    navigate(path);
  };

  return (
    <QuestionList 
      lessonData={selectedData} 
      onBack={handleBackNavigation} 
    />
  );
};

// Wrapper for Games with navigation
const GamesWithNavigation = () => {
  const navigate = useNavigate();
  
  const handleDifficultySelect = (difficulty) => {
    if (difficulty === 'Easy') {
      navigate('/games/easy');
    } else if (difficulty === 'Medium') {
      navigate('/games/medium');
    } else if (difficulty === 'Hard') {
      navigate('/games/hard');
    }
  };

  return <Games onDifficultySelect={handleDifficultySelect} />;
};

// Main App Component with Persistence
function App() {
  // Initialize state from localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(() => 
    StorageUtils.getItem(STORAGE_KEYS.LOGIN_STATUS, false)
  );
  
  const [selectedData, setSelectedData] = useState(() => 
    StorageUtils.getItem(STORAGE_KEYS.SELECTED_DATA, null)
  );
  
  const [navigationHistory, setNavigationHistory] = useState(() => 
    StorageUtils.getItem(STORAGE_KEYS.NAVIGATION_HISTORY, [])
  );

  const [currentUser, setCurrentUser] = useState(() =>
    StorageUtils.getItem(STORAGE_KEYS.CURRENT_USER, null)
  );

  // Save state to localStorage whenever it changes
  useEffect(() => {
    StorageUtils.setItem(STORAGE_KEYS.LOGIN_STATUS, isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    StorageUtils.setItem(STORAGE_KEYS.SELECTED_DATA, selectedData);
  }, [selectedData]);

  useEffect(() => {
    StorageUtils.setItem(STORAGE_KEYS.NAVIGATION_HISTORY, navigationHistory);
  }, [navigationHistory]);

  useEffect(() => {
    StorageUtils.setItem(STORAGE_KEYS.CURRENT_USER, currentUser);
  }, [currentUser]);

  // Save current path on route changes
  const PathTracker = () => {
    const location = useLocation();
    
    useEffect(() => {
      StorageUtils.setItem(STORAGE_KEYS.LAST_VISITED_PATH, location.pathname);
    }, [location.pathname]);

    return null;
  };

  const handleLoginSuccess = (userData = null) => {
    setIsLoggedIn(true);
    setCurrentUser(userData);
  };

  const handleViewChange = (data, view) => {
    // Save current view to history for back navigation
    const newHistory = [...navigationHistory, { 
      view: window.location.pathname, 
      data: selectedData,
      timestamp: Date.now()
    }];
    
    // Limit history to prevent memory issues (keep last 10 items)
    const limitedHistory = newHistory.slice(-10);
    setNavigationHistory(limitedHistory);
    
    // Update data
    setSelectedData(data);
  };

  const handleBack = () => {
    if (navigationHistory.length > 0) {
      // Get the last view from history
      const prevState = navigationHistory[navigationHistory.length - 1];
      
      // Update data and navigate back
      setSelectedData(prevState.data);
      
      // Remove the used history entry
      const newHistory = navigationHistory.slice(0, -1);
      setNavigationHistory(newHistory);
      
      // Return the path to navigate to
      return prevState.view;
    } else {
      // Default to student list if no history
      return '/studentList';
    }
  };

  // Function for sidebar navigation
  const handleSidebarNavigation = (view) => {
    // Clear history when navigating from sidebar
    setNavigationHistory([]);
    setSelectedData(null);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setNavigationHistory([]);
    setSelectedData(null);
    
    // Clear all stored data
    StorageUtils.clearAppStorage();
    
    return '/login';
  };

  // Enhanced Protected Route component
  const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    
    if (!isLoggedIn) {
      return <Navigate to="/login" replace />;
    }

    // Function to determine the correct active view based on the current path
    const getActiveView = (pathname) => {
      // Remove leading slash and hash
      const path = pathname.replace(/^[/#]+/, '');
      
      // Map routes to sidebar menu items
      const routeMap = {
        'admindashboard': 'dashboard',
        'dashboard': 'dashboard',
        'studentList': 'students',
        'students': 'students',
        'dailyLesson': 'dailyLessons',
        'dailyLessonDetails': 'dailyLessons',
        'dailyLessonQuestion': 'dailyLessons',
        'activities': 'activities',
        'activitiesDetails': 'activities',
        'activitiesQuestion': 'activities',
        'lessonPlan': 'lessonPlan',
        'questionList': 'lessonPlan',
        'questions': 'lessonPlan',
        'games': 'games',
        'games/easy': 'games',
        'games/medium': 'games',
        'games/hard': 'games',
        'video-presentation-list': 'videoPresentationList'
      };

      // Return mapped value or default to the path itself
      return routeMap[path] || path || 'dashboard';
    };

    return (
      <>
        <Sidebar 
          onNavigate={handleSidebarNavigation} 
          onLogout={handleLogout}
          activeView={getActiveView(location.pathname)}
          currentUser={currentUser}
        />
        {children}
      </>
    );
  };

  // Handle browser refresh/reload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Save session data before page unload
      const sessionData = {
        isLoggedIn,
        selectedData,
        navigationHistory,
        currentUser,
        timestamp: Date.now()
      };
      StorageUtils.setItem(STORAGE_KEYS.SESSION_DATA, sessionData);
    };

    const handleUnload = () => {
      // Final save on unload
      const sessionData = {
        isLoggedIn,
        selectedData,
        navigationHistory,
        currentUser,
        timestamp: Date.now()
      };
      StorageUtils.setItem(STORAGE_KEYS.SESSION_DATA, sessionData);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [isLoggedIn, selectedData, navigationHistory, currentUser]);

  // Initialize from session data on app start
  useEffect(() => {
    const sessionData = StorageUtils.getItem(STORAGE_KEYS.SESSION_DATA);
    
    // Check if session data exists and is recent (within 24 hours)
    if (sessionData && sessionData.timestamp) {
      const hoursPassed = (Date.now() - sessionData.timestamp) / (1000 * 60 * 60);
      
      if (hoursPassed < 24) {
        // Restore session if it's recent
        if (sessionData.isLoggedIn && !isLoggedIn) {
          setIsLoggedIn(sessionData.isLoggedIn);
        }
        if (sessionData.currentUser && !currentUser) {
          setCurrentUser(sessionData.currentUser);
        }
        if (sessionData.selectedData && !selectedData) {
          setSelectedData(sessionData.selectedData);
        }
        if (sessionData.navigationHistory && navigationHistory.length === 0) {
          setNavigationHistory(sessionData.navigationHistory);
        }
      } else {
        // Clear old session data
        StorageUtils.removeItem(STORAGE_KEYS.SESSION_DATA);
      }
    }
  }, []);

  return (
    <AudioProvider>
      <Router>
        <PathTracker />
        <div className="app-container">
          <Routes>
            <Route path="/login" element={
              isLoggedIn ? <Navigate to="/admindashboard" replace /> : <AdminLogin onLoginSuccess={handleLoginSuccess} />
            } />
            
            <Route path="/admindashboard" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/studentList" element={
              <ProtectedRoute>
                <StudentListWithNavigation />
              </ProtectedRoute>
            } />
            
            <Route path="/dailyLesson" element={
              <ProtectedRoute>
                <DailyLessonWithNavigation 
                  selectedData={selectedData}
                  handleViewChange={handleViewChange}
                />
              </ProtectedRoute>
            } />
            
            <Route path="/dailyLessonDetails" element={
              <ProtectedRoute>
                <DailyLessonDetailsWithNavigation 
                  selectedData={selectedData}
                  handleViewChange={handleViewChange}
                  handleBack={handleBack}
                />
              </ProtectedRoute>
            } />
            
            <Route path="/activities" element={
              <ProtectedRoute>
                <Activities
                  student={selectedData}
                  onViewDetails={(activity) => {
                    handleViewChange(activity, 'activitiesDetails');
                    return '/activitiesDetails';
                  }}
                />
              </ProtectedRoute>
            } />
            
            <Route path="/activitiesDetails" element={
              <ProtectedRoute>
                <ActivitiesDetailWithNavigation 
                  selectedData={selectedData}
                  handleViewChange={handleViewChange}
                  handleBack={handleBack}
                />
              </ProtectedRoute>
            } />
            
            <Route path="/dailyLessonQuestion" element={
              <ProtectedRoute>
                <DailyLessonQuestionDetailsWithNavigation 
                  selectedData={selectedData}
                  handleBack={handleBack}
                />
              </ProtectedRoute>
            } />
            
            <Route path="/activitiesQuestion" element={
              <ProtectedRoute>
                <ActivitiesQuestionDetailsWithNavigation 
                  selectedData={selectedData}
                  handleBack={handleBack}
                />
              </ProtectedRoute>
            } />
            
            <Route path="/lessonPlan" element={
              <ProtectedRoute>
                <LessonPlanWithNavigation 
                  handleViewChange={handleViewChange}
                />
              </ProtectedRoute>
            } />
            
            <Route path="/questionList" element={
              <ProtectedRoute>
                <QuestionListWithNavigation 
                  selectedData={selectedData} 
                  handleBack={handleBack} 
                />
              </ProtectedRoute>
            } />

            <Route path="/video-presentation-list" element={
              <ProtectedRoute>
                <VideoPresentationList />
              </ProtectedRoute>
            } />
            
            <Route path="/questions" element={
              <ProtectedRoute>
                <Question />
              </ProtectedRoute>
            } />
            
            {/* Game Routes */}
            <Route path="/games" element={
              <ProtectedRoute>
                <GamesWithNavigation />
              </ProtectedRoute>
            } />
            
            <Route path="/games/easy" element={
              <ProtectedRoute>
                <GameEasy />
              </ProtectedRoute>
            } />
            
            <Route path="/games/medium" element={
              <ProtectedRoute>
                <GameMedium />
              </ProtectedRoute>
            } />
            
            <Route path="/games/hard" element={
              <ProtectedRoute>
                <GameHard />
              </ProtectedRoute>
            } />
            
            {/* Default Routes */}
            <Route path="/" element={<Navigate to={isLoggedIn ? "/admindashboard" : "/mainpage"} replace />} />
            
            {/* Public Routes */}
            <Route path="/mainpage" element={<MainPage />} />
            <Route path="/student-login" element={<StudentLogin />} />
            <Route path="/select-type" element={<SelectType />} />
            <Route path="/select-day" element={<SelectDay />} />
            <Route path="/select-activities" element={<SelectActivities />} />
            <Route path="/select-daily-lesson-activities" element={<SelectDailyLessonActivities />} />
            <Route path="/select-difficulty" element={<SelectDifficulty />} />
            <Route path="/video-games" element={<VideoGames />} />
            <Route path="/medium-video-games" element={<MediumVideoGames />} />
            <Route path="/hard-video-games" element={<HardVideoGames />} />
            <Route path="/select-daily-lesson-difficulty" element={<SelectDailyLessonDifficulty />} />
            
            {/* Activity Routes */}
            <Route path="/activities-color-easy" element={<ActivitiesColorEasy />} />
            <Route path="/activities-color-medium" element={<ActivitiesColorMedium />} />
            <Route path="/activities-color-hard" element={<ActivitiesColorHard />} />
            <Route path="/activities-shape-easy" element={<ActivitiesShapeEasy />} />
            <Route path="/activities-shape-medium" element={<ActivitiesShapeMedium />} />
            <Route path="/activities-shape-hard" element={<ActivitiesShapeHard />} />
            <Route path="/activities-number-easy" element={<ActivitiesNumberEasy />} />
            <Route path="/activities-number-medium" element={<ActivitiesNumberMedium />} />
            <Route path="/activities-number-hard" element={<ActivitiesNumberHard />} />
            <Route path="/activities-animals-easy" element={<ActivitiesAnimalEasy />} />
            <Route path="/activities-animals-medium" element={<ActivitiesAnimalMedium />} />
            <Route path="/activities-animals-hard" element={<ActivitiesAnimalHard />} />
            <Route path="/activities-money-easy" element={<ActivitiesMoneyEasy />} />
            <Route path="/activities-money-medium" element={<ActivitiesMoneyMedium />} />
            <Route path="/activities-money-hard" element={<ActivitiesMoneyHard />} />
            <Route path="/activities-matchingtype-easy" element={<ActivitiesMatchingTypeEasy />} />
            <Route path="/activities-matchingtype-medium" element={<ActivitiesMatchingTypeMedium />} />
            <Route path="/activities-matchingtype-hard" element={<ActivitiesMatchingTypeHard />} />

            {/* Daily Lesson Activity Routes */}
            <Route path="/activities-daily-lesson-color-easy" element={<DLActivitiesColorEasy />} />
            <Route path="/activities-daily-lesson-color-medium" element={<DLActivitiesColorMedium />} />
            <Route path="/activities-daily-lesson-color-hard" element={<DLActivitiesColorHard />} />
            <Route path="/activities-daily-lesson-shape-easy" element={<DLActivitiesShapeEasy />} />
            <Route path="/activities-daily-lesson-shape-medium" element={<DLActivitiesShapeMedium />} />
            <Route path="/activities-daily-lesson-shape-hard" element={<DLActivitiesShapeHard />} />
            <Route path="/activities-daily-lesson-number-easy" element={<DLActivitiesNumberEasy />} />
            <Route path="/activities-daily-lesson-number-medium" element={<DLActivitiesNumberMedium />} />
            <Route path="/activities-daily-lesson-number-hard" element={<DLActivitiesNumberHard />} />
            <Route path="/activities-daily-lesson-animals-easy" element={<DLActivitiesAnimalEasy />} />
            <Route path="/activities-daily-lesson-animals-medium" element={<DLActivitiesAnimalMedium />} />
            <Route path="/activities-daily-lesson-animals-hard" element={<DLActivitiesAnimalHard />} />
            <Route path="/activities-daily-lesson-money-easy" element={<DLActivitiesMoneyEasy />} />
            <Route path="/activities-daily-lesson-money-medium" element={<DLActivitiesMoneyMedium />} />
            <Route path="/activities-daily-lesson-money-hard" element={<DLActivitiesMoneyHard />} />
            <Route path="/activities-daily-lesson-matchingtype-easy" element={<DLActivitiesMatchingTypeEasy />} />
            <Route path="/activities-daily-lesson-matchingtype-medium" element={<DLActivitiesMatchingTypeMedium />} />
            <Route path="/activities-daily-lesson-matchingtype-hard" element={<DLActivitiesMatchingTypeHard />} />
            
            <Route path="/video-presentation" element={<VideoPresentation />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to={isLoggedIn ? "/admindashboard" : "/mainpage"} replace />} />
          </Routes>
        </div>
      </Router>
    </AudioProvider>
  );
}

export default App;