import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import './Games.css';

const Games = () => {
  const [currentView, setCurrentView] = useState('category');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation state when coming back from other components
  useEffect(() => {
    if (location.state) {
      const { currentView: stateView, selectedCategory: stateCategory } = location.state;
      if (stateView && stateCategory) {
        setCurrentView(stateView);
        setSelectedCategory(stateCategory);
      }
    }
  }, [location.state]);

  // Sample data
  const categories = ['Colors', 'Shapes', 'Numbers', 'Animals', 'Money'];
  const difficulties = ['Easy', 'Medium', 'Hard'];
  const options = ['Video Presentation', 'Difficulty'];

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentView('options');
  };

  const handleOptionSelect = (option) => {
    if (option === 'Video Presentation') {
      // Navigate to video presentation component
      navigate('/video-presentation-list', { 
        state: { 
          category: selectedCategory
        } 
      });
    } else if (option === 'Difficulty') {
      setCurrentView('difficulty');
    }
  };

  const handleDifficultySelect = (difficulty) => {
    setSelectedDifficulty(difficulty);
    
    // Navigate to appropriate game component based on difficulty
    const difficultyRoute = difficulty.toLowerCase();
    console.log(`Navigating with category: ${selectedCategory}, difficulty: ${difficulty}`);
    
    // Navigate to the corresponding difficulty component
    navigate(`/games/${difficultyRoute}`, { 
      state: { 
        category: selectedCategory, 
        difficulty: difficulty 
      } 
    });
  };

  const handleBack = () => {
    if (currentView === 'options') {
      setCurrentView('category');
      setSelectedCategory(null);
    } else if (currentView === 'difficulty') {
      setCurrentView('options');
      setSelectedDifficulty(null);
    }
  };

  const renderTitle = () => {
    switch (currentView) {
      case 'category':
        return <h2 className="games-header-title">Games - Categories</h2>;
      case 'options':
        return (
          <div className="games-nav-header">
            <button className="games-back-btn" onClick={handleBack}>
              <FaChevronLeft />
            </button>
            <h2 className="games-header-title">Category / {selectedCategory}</h2>
          </div>
        );
      case 'difficulty':
        return (
          <div className="games-nav-header">
            <button className="games-back-btn" onClick={handleBack}>
              <FaChevronLeft />
            </button>
            <h2 className="games-header-title">{selectedCategory} / Difficulty</h2>
          </div>
        );
      default:
        return <h2 className="games-header-title">Games</h2>;
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'category':
        return (
          <div className="games-category-container">
            <h3 className="games-subtitle">Category</h3>
            <div className="games-items-list">
              {categories.map((category) => (
                <div key={category} className="games-item" onClick={() => handleCategorySelect(category)}>
                  <span className="games-item-text">{category}</span>
                  <FaChevronRight className="games-item-icon" />
                </div>
              ))}
            </div>
          </div>
        );
      case 'options':
        return (
          <div className="games-options-container">
            <h3 className="games-subtitle">Choose Option</h3>
            <div className="games-items-list">
              {options.map((option) => (
                <div key={option} className="games-item" onClick={() => handleOptionSelect(option)}>
                  <span className="games-item-text">{option}</span>
                  <FaChevronRight className="games-item-icon" />
                </div>
              ))}
            </div>
          </div>
        );
      case 'difficulty':
        return (
          <div className="games-difficulty-container">
            <h3 className="games-subtitle">Difficulty</h3>
            <div className="games-items-list">
              {difficulties.map((difficulty) => (
                <div key={difficulty} className="games-item" onClick={() => handleDifficultySelect(difficulty)}>
                  <span className="games-item-text">{difficulty}</span>
                  <FaChevronRight className="games-item-icon" />
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="games-wrapper">
      <div className="games-container">
        <div className="games-header">
          {renderTitle()}
        </div>
        <div className="games-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Games;