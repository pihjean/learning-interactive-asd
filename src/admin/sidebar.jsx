import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './sidebar.css';
import {
  FaChartBar,
  FaUsers,
  FaBook,
  FaBullseye,
  FaFileAlt,
  FaQuestionCircle,
  FaGamepad,
  FaSignOutAlt,
  FaVideo
} from 'react-icons/fa';

// Import the image properly
import logoImage from '../assets/logo.png';

const Sidebar = ({ onNavigate, activeView, onLogout, currentUser }) => {
  const navigate = useNavigate();
  
  const handleNavigation = (view) => {
    if (onNavigate) {
      onNavigate(view);
    }
    navigate(`/${view}`);
  };
  
  const handleLogout = () => {
    console.log("Logging out, navigating to main page");
    
    // If onLogout exists, call it first to clear app state
    if (onLogout) {
      onLogout(); // This clears tokens, session, etc.
    }
    
    // Navigate to MainPage
    navigate('/mainpage', { replace: true });
  };
  
  return (
    <div className="sidebar">
      <div className="logo-container">
        <img src={logoImage} alt="School Logo" className="logo" />
      </div>
      <div className="main-menu">Main Menu</div>
      <div className="sidebar-menu">
        <div 
          className={`menu-item ${activeView === 'dashboard' || activeView === 'admindashboard' ? 'active' : ''}`} 
          onClick={() => handleNavigation('admindashboard')}
        >
          <span className="menu-icon"><FaChartBar /></span>
          <span className="menu-text">Dashboard</span>
        </div>
        <div 
          className={`menu-item ${activeView === 'students' || activeView === 'studentList' ? 'active' : ''}`} 
          onClick={() => handleNavigation('studentList')}
        >
          <span className="menu-icon"><FaUsers /></span>
          <span className="menu-text">Students</span>
        </div>
        <div className="main-menu">Learning Management</div>
        <div 
          className={`menu-item ${activeView === 'dailyLessons' || activeView === 'dailyLesson' ? 'active' : ''}`} 
          onClick={() => handleNavigation('dailyLesson')}
        >
          <span className="menu-icon"><FaBook /></span>
          <span className="menu-text">Daily Lessons</span>
        </div>
        <div 
          className={`menu-item ${activeView === 'lessonPlan' ? 'active' : ''}`} 
          onClick={() => handleNavigation('lessonPlan')}
        >
          <span className="menu-icon"><FaFileAlt /></span>
          <span className="menu-text">Lesson Plan</span>
        </div>
      
        <div 
          className={`menu-item ${activeView === 'games' ? 'active' : ''}`} 
          onClick={() => handleNavigation('games')}
        >
          <span className="menu-icon"><FaGamepad /></span>
          <span className="menu-text">Games</span>
        </div>
        <div className="menu-item logout" onClick={handleLogout}>
          <span className="menu-icon"><FaSignOutAlt /></span>
          <span className="menu-text">Log Out</span>
        </div>
      </div>
      {currentUser && (
        <div className="user-info">
          <p className="welcome-text">Welcome, {currentUser.name || 'Admin'}</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;