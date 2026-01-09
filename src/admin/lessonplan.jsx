import React, { useState, useEffect } from 'react';
import { FaChevronRight, FaChevronLeft, FaPlay, FaExclamationTriangle, FaVolumeUp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './LessonPlan.css';
import './QuestionList.css';

const LessonPlan = () => {
  // State variables
  const [currentView, setCurrentView] = useState('day');
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [assignedCategories, setAssignedCategories] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  // Modal states
  const [categoryAlreadyAssignedModal, setCategoryAlreadyAssignedModal] = useState(false);
  const [categoryAssignedDay, setCategoryAssignedDay] = useState(null);
  const [changeCategoryModal, setChangeCategoryModal] = useState(false);
  const [saveConfirmModal, setSaveConfirmModal] = useState(false);
  const [syncModal, setSyncModal] = useState(false);
  const [syncData, setSyncData] = useState({});
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoError, setVideoError] = useState(false);
  
  const navigate = useNavigate();

  // Data for different views
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const categories = ['Colors', 'Shapes', 'Numbers', 'Animals', 'Money'];
  const difficulties = ['easy', 'medium', 'hard'];

  const API_URL = 'http://daetsnedlearning.site/backend/games_per_day.php';
  const GAME_EASY_URL = 'http://daetsnedlearning.site/backend/game_easy.php';
  const GAME_MEDIUM_URL = 'http://daetsnedlearning.site/backend/game_medium.php';
  const GAME_HARD_URL = 'http://daetsnedlearning.site/backend/game_hard.php';

  // Fetch assigned categories for days when component mounts
  useEffect(() => {
    fetchAssignedCategories();
  }, []);

  // Fetch games when category and difficulty are selected
  useEffect(() => {
    if (selectedDay && selectedCategory && selectedDifficulty) {
      fetchGames();
    }
  }, [selectedDay, selectedCategory, selectedDifficulty]);

  const getVideoUrl = (path, difficulty) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    let baseUrl = '';
    switch (difficulty) {
      case 'easy':
        baseUrl = GAME_EASY_URL;
        break;
      case 'medium':
        baseUrl = GAME_MEDIUM_URL;
        break;
      case 'hard':
        baseUrl = GAME_HARD_URL;
        break;
      default:
        baseUrl = GAME_EASY_URL;
    }
    
    return `${baseUrl}?action=getVideo&file=${cleanPath}`;
  };

  const fetchAssignedCategories = async () => {
    try {
      console.log('Fetching assigned categories...');
      const response = await fetch(`${API_URL}?action=fetch_assignments`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      // Check if response is actually JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error('Response is not JSON:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      console.log('Fetched assignments data:', data);
      
      if (data.success) {
        const categoriesByDay = {};
        data.assignments.forEach(assignment => {
          categoriesByDay[assignment.day] = assignment.category;
          console.log(`Assignment found: ${assignment.day} -> ${assignment.category}`);
        });
        console.log('Final categories by day:', categoriesByDay);
        setAssignedCategories(categoriesByDay);
      } else {
        console.error('API returned success: false', data);
        setAssignedCategories({});
      }
    } catch (error) {
      console.error('Error fetching assigned categories:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  };

  const fetchGames = async () => {
    setLoadingGames(true);
    try {
      console.log(`Fetching games: ${selectedCategory} - ${selectedDifficulty}`);
      const response = await fetch(`${API_URL}?action=fetch_games&category=${selectedCategory}&difficulty=${selectedDifficulty}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      console.log(`Games data received:`, data);
      
      if (data.success) {
        const processedGames = data.games.map(game => {
          const processedGame = {
            ...game,
            inUse: game.status === 'in use'
          };
          
          // Process video URLs for all video fields
          const videoFields = getVideoFieldsForDifficulty(selectedDifficulty);
          videoFields.forEach(field => {
            if (processedGame[field] && processedGame[field].path) {
              processedGame[field].originalPath = processedGame[field].path;
              processedGame[field].videoUrl = getVideoUrl(processedGame[field].path, selectedDifficulty);
            }
          });
          
          return processedGame;
        });
        
        console.log(`Processed ${processedGames.length} games`);
        setGames(processedGames);
      } else {
        console.log('No games found or API returned success: false');
        setGames([]);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      setGames([]);
    } finally {
      setLoadingGames(false);
    }
  };

  const getVideoFieldsForDifficulty = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return ['introduction', 'map', 'lesson', 'question', 'achievement', 'wrong_answer'];
      case 'medium':
        return ['map', 'lesson', 'question1', 'achievement1', 'wrong_answer1', 'question2', 'achievement2', 'wrong_answer2', 'final_achievement'];
      case 'hard':
        return ['map', 'lesson', 'question1', 'achievement1', 'wrong_answer1', 'question2', 'achievement2', 'wrong_answer2', 'question3', 'achievement3', 'wrong_answer3', 'final_achievement', 'last_map', 'outro'];
      default:
        return [];
    }
  };

  const getTableHeaders = (difficulty) => {
    const baseHeaders = ['ID'];
    
    switch (difficulty) {
      case 'easy':
        return [...baseHeaders, 'Introduction', 'Map', 'Lesson', 'Question', 'Achievement', 'Wrong Answer', 'Correct Answer', 'Status', 'Action'];
      case 'medium':
        return [...baseHeaders, 'Map', 'Lesson', 'Question 1', 'Achievement 1', 'Wrong Answer 1', 'Question 2', 'Achievement 2', 'Wrong Answer 2', 'Final Achievement', 'Answer 1', 'Answer 2', 'Status', 'Action'];
      case 'hard':
        return [...baseHeaders, 'Map', 'Lesson', 'Q1', 'A1', 'WA1', 'Q2', 'A2', 'WA2', 'Q3', 'A3', 'WA3', 'Final Achievement', 'Last Map', 'Outro', 'Answer 1', 'Answer 2', 'Answer 3', 'Status', 'Action'];
      default:
        return baseHeaders;
    }
  };

  const renderMediaThumbnail = (media) => {
    if (!media || (!media.path && !media.videoUrl)) return <div className="media-thumbnail empty">No Video</div>;
    
    const filename = (media.originalPath || media.path || '').split('/').pop().substring(0, 15);
    
    return (
      <div className="media-preview-thumbnail" onClick={() => openVideoPreview(media)}>
        <div className="media-thumbnail video">
          <div className="thumbnail-frame">
            <div className="play-button">
              <FaPlay />
            </div>
          </div>
        </div>
        <div className="video-name">{filename}</div>
      </div>
    );
  };

  const openVideoPreview = (media) => {
    if (!media || (!media.videoUrl && !media.path)) return;
    
    setVideoError(false);
    const videoUrl = media.videoUrl || getVideoUrl(media.path, selectedDifficulty);
    console.log('Opening video preview with URL:', videoUrl);
    setVideoPreview(videoUrl);
  };

  const handleVideoError = (e) => {
    console.error('Error loading video:', videoPreview);
    console.error('Video error event:', e);
    setVideoError(true);
  };

  const renderVideoPlayer = (videoUrl) => {
    if (!videoUrl) return null;
    
    return (
      <video 
        key={videoUrl}
        src={videoUrl}
        controls
        autoPlay
        preload="metadata"
        style={{
          width: '100%',
          maxHeight: '500px',
          backgroundColor: '#000',
          borderRadius: '8px'
        }}
        onError={handleVideoError}
        onLoadStart={() => console.log('Video loading started')}
        onCanPlay={() => console.log('Video can play')}
        onLoadedData={() => console.log('Video data loaded')}
      >
        Your browser does not support the video tag.
      </video>
    );
  };

  const handleDaySelect = (day) => {
    console.log(`Day selected: ${day}`);
    setSelectedDay(day);
    setCurrentView('category');
  };

  const handleCategorySelect = (category) => {
    console.log(`Category selected: ${category} for day: ${selectedDay}`);
    
    // Check if this category is already assigned to another day
    let isAssignedToAnotherDay = false;
    let assignedDay = null;
    
    for (const day of days) {
      if (day !== selectedDay && assignedCategories[day] === category) {
        isAssignedToAnotherDay = true;
        assignedDay = day;
        break;
      }
    }
    
    if (isAssignedToAnotherDay) {
      console.log(`Category ${category} already assigned to ${assignedDay}`);
      setCategoryAssignedDay(assignedDay);
      setCategoryAlreadyAssignedModal(true);
      return;
    }
    
    // Check if this is a different category from what's already assigned for this day
    const currentCategory = assignedCategories[selectedDay];
    if (currentCategory && currentCategory !== category) {
      console.log(`Changing category for ${selectedDay} from ${currentCategory} to ${category}`);
      setSelectedCategory(category);
      setChangeCategoryModal(true);
      return;
    }
    
    setSelectedCategory(category);
    setCurrentView('questions');
  };

  const handleChangeCategoryConfirm = () => {
    console.log('Category change confirmed');
    setChangeCategoryModal(false);
    setCurrentView('questions');
  };

  const handleChangeCategoryCancel = () => {
    console.log('Category change cancelled');
    setChangeCategoryModal(false);
    setSelectedCategory(null);
  };

  const handleDifficultySelect = (difficulty) => {
    console.log(`Difficulty selected: ${difficulty}`);
    setSelectedDifficulty(difficulty);
  };

  const handleBack = () => {
    if (currentView === 'category') {
      setCurrentView('day');
      setSelectedDay(null);
    } else if (currentView === 'questions') {
      setCurrentView('category');
      setSelectedCategory(null);
      setSelectedDifficulty('easy');
    }
  };

  const toggleGameStatus = async (gameId) => {
    const game = games.find(g => g.id === gameId);
    const newStatus = game.inUse ? 'not in use' : 'in use';
    
    console.log(`Toggling game ${gameId} status to: ${newStatus}`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_game_status',
          id: gameId,
          difficulty: selectedDifficulty,
          status: newStatus,
          category: selectedCategory
        }),
      });
      
      const data = await response.json();
      console.log('Game status update response:', data);
      
      if (data.success) {
        // Update local state
        const updatedGames = games.map(g =>
          g.id === gameId ? { ...g, inUse: newStatus === 'in use' } : { ...g, inUse: false }
        );
        setGames(updatedGames);
        
        // Check if we should prompt for sync
        if (data.should_prompt_sync && data.available_difficulties.length > 0) {
          console.log('Prompting for cross-difficulty sync');
          setSyncData({
            id: data.current_id,
            category: data.category,
            current_difficulty: data.current_difficulty,
            available_difficulties: data.available_difficulties
          });
          setSyncModal(true);
        }
      } else {
        console.error('Game status update failed:', data.message);
        setSaveError(data.message);
        setTimeout(() => setSaveError(null), 3000);
      }
    } catch (error) {
      console.error('Error updating game status:', error);
      setSaveError('Network error. Please try again.');
      setTimeout(() => setSaveError(null), 3000);
    }
  };

  const handleSyncConfirm = async (targetDifficulties) => {
    console.log('Syncing status across difficulties:', targetDifficulties);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_status_across_difficulties',
          id: syncData.id,
          category: syncData.category,
          current_difficulty: syncData.current_difficulty,
          target_difficulties: targetDifficulties
        }),
      });
      
      const data = await response.json();
      console.log('Sync response:', data);
      
      if (data.success) {
        setSyncModal(false);
        setSyncData({});
      } else {
        setSaveError(data.message);
        setTimeout(() => setSaveError(null), 3000);
      }
    } catch (error) {
      console.error('Error syncing status:', error);
      setSaveError('Network error. Please try again.');
      setTimeout(() => setSaveError(null), 3000);
    }
  };

  const handleSaveClick = async () => {
    console.log('Checking if all difficulties have games in use...');
    
    // Check if there are games "in use" for ALL difficulty levels
    const difficultyStatus = {
      easy: false,
      medium: false,
      hard: false
    };
    
    // Check each difficulty level
    for (const difficulty of difficulties) {
      try {
        const response = await fetch(`${API_URL}?action=fetch_games&category=${selectedCategory}&difficulty=${difficulty}`);
        const data = await response.json();
        
        if (data.success) {
          const hasInUseGame = data.games.some(game => game.status === 'in use');
          difficultyStatus[difficulty] = hasInUseGame;
          console.log(`${difficulty} has games in use: ${hasInUseGame}`);
        }
      } catch (error) {
        console.error(`Error checking ${difficulty} games:`, error);
      }
    }
    
    // Check if all difficulties have at least one game in use
    const missingDifficulties = [];
    for (const [difficulty, hasInUse] of Object.entries(difficultyStatus)) {
      if (!hasInUse) {
        missingDifficulties.push(difficulty);
      }
    }
    
    if (missingDifficulties.length > 0) {
      console.log('Missing games for difficulties:', missingDifficulties);
      setSaveError(`Please set at least one game as "IN USE" for ALL difficulty levels. Missing: ${missingDifficulties.join(', ').toUpperCase()}`);
      setTimeout(() => setSaveError(null), 5000);
      return;
    }
    
    console.log('All difficulty levels have games in use');
    setSaveConfirmModal(true);
  };

  const handleSaveConfirm = async () => {
    setSaveConfirmModal(false);
    console.log(`Saving assignment: ${selectedDay} -> ${selectedCategory}`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_day_assignment',
          day: selectedDay,
          category: selectedCategory
        }),
      });
      
      const data = await response.json();
      console.log('Save assignment response:', data);
      
      if (data.success) {
        // Refetch assignments from server to ensure sync
        await fetchAssignedCategories();
        
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          navigate('/dashboard');
        }, 2000);
      } else {
        console.error('Save assignment failed:', data.message);
        setSaveError(data.message || 'Failed to save assignment');
        setTimeout(() => setSaveError(null), 3000);
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
      setSaveError('Network error. Please try again.');
      setTimeout(() => setSaveError(null), 3000);
    }
  };

  const renderTableRow = (game) => {
    const videoFields = getVideoFieldsForDifficulty(selectedDifficulty);
    
    return (
      <tr key={game.id}>
        <td>{game.id}</td>
        
        {/* Render video fields */}
        {videoFields.map(field => (
          <td key={field}>{renderMediaThumbnail(game[field])}</td>
        ))}
        
        {/* Render answer fields */}
        {selectedDifficulty === 'easy' && <td>{game.correct_answer}</td>}
        {selectedDifficulty === 'medium' && (
          <>
            <td>{game.answer1}</td>
            <td>{game.answer2}</td>
          </>
        )}
        {selectedDifficulty === 'hard' && (
          <>
            <td>{game.answer1}</td>
            <td>{game.answer2}</td>
            <td>{game.answer3}</td>
          </>
        )}
        
        {/* Status */}
        <td>
          <span className={`status-badge ${game.inUse ? 'in-use' : 'not-in-use'}`}>
            {game.inUse ? 'IN USE' : 'NOT IN USE'}
          </span>
        </td>
        
        {/* Action */}
        <td className="lesson-plan-actions">
          <button 
            className={`lesson-plan-status-btn ${game.inUse ? 'in-use' : 'not-in-use'}`}
            onClick={() => toggleGameStatus(game.id)}
          >
            <span>{game.inUse ? 'SET NOT IN USE' : 'SET IN USE'}</span>
          </button>
        </td>
      </tr>
    );
  };

  const renderTable = () => {
    if (loadingGames) {
      return (
        <div className="lesson-plan-table-wrapper">
          <div className="loading-indicator">Loading games...</div>
        </div>
      );
    }
    
    const headers = getTableHeaders(selectedDifficulty);
    
    return (
      <div className="lesson-plan-table-wrapper">
        <table className="lesson-plan-table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="no-questions-message">
                  No games found for {selectedCategory} - {selectedDifficulty}.
                </td>
              </tr>
            ) : (
              games.map(game => renderTableRow(game))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderHeader = () => {
    switch (currentView) {
      case 'day':
        return (
          <div className="lesson-plan-nav-header-1">
            <h2 className="lesson-plan-header-title">Lesson Plan</h2>
          </div>
        );
      case 'category':
        return (
          <div className="lesson-plan-nav-header">
            <button className="lesson-plan-back-btn" onClick={handleBack}>
              <FaChevronLeft />
            </button>
            <h2 className="lesson-plan-header-title">Day / {selectedDay}</h2>
          </div>
        );
      case 'questions':
        return (
          <div className="lesson-plan-nav-header">
            <button className="lesson-plan-back-btn" onClick={handleBack}>
              <FaChevronLeft />
            </button>
            <h2 className="lesson-plan-header-title">Category / {selectedCategory}</h2>
          </div>
        );
      default:
        return (
          <div className="lesson-plan-nav-header">
            <h2 className="lesson-plan-header-title">Lesson Plan</h2>
          </div>
        );
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'day':
        return (
          <div className="lesson-plan-day-container">
            <h3 className="lesson-plan-day-title">Select Day</h3>
            <div className="lesson-plan-items-list">
              {days.map((day) => {
                const hasAssignedCategory = assignedCategories[day];
                return (
                  <div 
                    key={day} 
                    className={`lesson-plan-item ${hasAssignedCategory ? 'has-assignment' : ''}`} 
                    onClick={() => handleDaySelect(day)}
                  >
                    <span className="lesson-plan-item-text">
                      {day}
                      {hasAssignedCategory && (
                        <span className="assigned-category-label"> - {hasAssignedCategory}</span>
                      )}
                    </span>
                    <FaChevronRight className="lesson-plan-item-icon" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'category':
        return (
          <div className="lesson-plan-category-container">
            <h3 className="lesson-plan-category-title">Select Category</h3>
            <div className="lesson-plan-items-list">
              {categories.map((category) => {
                const isAssigned = assignedCategories[selectedDay] === category;
                return (
                  <div 
                    key={category} 
                    className={`lesson-plan-item ${isAssigned ? 'assigned-category' : ''}`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    <span className="lesson-plan-item-text">{category}</span>
                    <FaChevronRight className="lesson-plan-item-icon" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'questions':
        return (
          <>
            {/* Tab Bar */}
            <div className="lesson-plan-tab-bar">
              {difficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  className={`lesson-plan-tab ${selectedDifficulty === difficulty ? 'active' : ''}`}
                  onClick={() => handleDifficultySelect(difficulty)}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Table Content */}
            <div className="lesson-plan-table-container">
              {renderTable()}
            </div>
            
            <div className="question-list-footer">
              <button className="question-list-save-btn" onClick={handleSaveClick}>Save Assignment</button>
              
              {saveSuccess && (
                <div className="save-success-message">Assignment saved successfully!</div>
              )}
              
              {saveError && (
                <div className="save-error-message">{saveError}</div>
              )}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // Modal Components
  const ChangeCategoryModal = () => {
    if (!changeCategoryModal) return null;
    
    return (
      <div className="confirm-modal-overlay">
        <div className="confirm-modal">
          <div className="confirm-modal-header">
            <h3>Change Category</h3>
          </div>
          <div className="confirm-modal-content">
            <p>Do you want to change the category for <strong>{selectedDay}</strong> from <strong>{assignedCategories[selectedDay]}</strong> to <strong>{selectedCategory}</strong>?</p>
            <p>This will replace the existing category assignment.</p>
          </div>
          <div className="confirm-modal-actions">
            <button className="confirm-modal-cancel-btn" onClick={handleChangeCategoryCancel}>Cancel</button>
            <button className="confirm-modal-confirm-btn" onClick={handleChangeCategoryConfirm}>Continue</button>
          </div>
        </div>
      </div>
    );
  };

  const SaveConfirmModal = () => {
    if (!saveConfirmModal) return null;
    
    return (
      <div className="confirm-modal-overlay">
        <div className="confirm-modal">
          <div className="confirm-modal-header">
            <h3>Confirm Save</h3>
          </div>
          <div className="confirm-modal-content">
            <p>Do you want to save the <strong>{selectedCategory}</strong> games assignment for <strong>{selectedDay}</strong>?</p>
          </div>
          <div className="confirm-modal-actions">
            <button className="confirm-modal-cancel-btn" onClick={() => setSaveConfirmModal(false)}>Cancel</button>
            <button className="confirm-modal-confirm-btn" onClick={handleSaveConfirm}>Save</button>
          </div>
        </div>
      </div>
    );
  };

  const CategoryAlreadyAssignedModal = () => {
    if (!categoryAlreadyAssignedModal) return null;
    
    return (
      <div className="confirm-modal-overlay">
        <div className="confirm-modal">
          <div className="confirm-modal-header">
            <h3>Category Already Assigned</h3>
          </div>
          <div className="confirm-modal-content">
            <p>The category <strong>{selectedCategory}</strong> is already assigned to <strong>{categoryAssignedDay}</strong>.</p>
            <p>Please select a different category or change the assignment for the other day first.</p>
          </div>
          <div className="confirm-modal-actions">
            <button 
              className="confirm-modal-confirm-btn" 
              onClick={() => setCategoryAlreadyAssignedModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SyncModal = () => {
    if (!syncModal) return null;
    
    const [selectedDifficulties, setSelectedDifficulties] = useState([]);
    
    const handleDifficultyToggle = (difficulty) => {
      setSelectedDifficulties(prev => 
        prev.includes(difficulty) 
          ? prev.filter(d => d !== difficulty)
          : [...prev, difficulty]
      );
    };
    
    return (
      <div className="confirm-modal-overlay">
        <div className="confirm-modal">
          <div className="confirm-modal-header">
            <h3>Sync Across Difficulties</h3>
          </div>
          <div className="confirm-modal-content">
            <p>Game ID <strong>{syncData.id}</strong> from <strong>{syncData.current_difficulty}</strong> is now in use.</p>
            <p>Would you like to automatically set the same ID to "in use" for other difficulties?</p>
            <div style={{ margin: '15px 0' }}>
              <p><strong>Available difficulties:</strong></p>
              {syncData.available_difficulties?.map(difficulty => (
                <label key={difficulty} style={{ display: 'block', margin: '5px 0' }}>
                  <input
                    type="checkbox"
                    checked={selectedDifficulties.includes(difficulty)}
                    onChange={() => handleDifficultyToggle(difficulty)}
                    style={{ marginRight: '8px' }}
                  />
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div className="confirm-modal-actions">
            <button className="confirm-modal-cancel-btn" onClick={() => setSyncModal(false)}>No, I'll choose manually</button>
            <button 
              className="confirm-modal-confirm-btn" 
              onClick={() => handleSyncConfirm(selectedDifficulties)}
              disabled={selectedDifficulties.length === 0}
            >
              Yes, Sync Selected
            </button>
          </div>
        </div>
      </div>
    );
  };

  const VideoPreviewModal = () => {
    if (!videoPreview) return null;
    
    return (
      <div className="games-modal-overlay" onClick={() => setVideoPreview(null)}>
        <div className="games-video-modal" onClick={e => e.stopPropagation()}>
          <div className="games-modal-header" style={{ backgroundColor: '#0057b3' }}>
            <h3>Video Preview</h3>
            <button className="games-modal-close" onClick={() => setVideoPreview(null)}>
              ×
            </button>
          </div>
          <div className="games-video-content">
            {videoError ? (
              <div className="video-error-container">
                <FaExclamationTriangle size={50} color="#f44336" />
                <p>Could not load video. The file might be missing or in an unsupported format.</p>
                <p style={{ fontSize: '14px', marginTop: '10px' }}>
                  Try opening the video directly: <a href={videoPreview} target="_blank" rel="noopener noreferrer">Open Video</a>
                </p>
              </div>
            ) : (
              <>
                {renderVideoPlayer(videoPreview)}
                <div className="volume-notification">
                  <FaVolumeUp /> Audio is enabled. Adjust volume as needed.
                </div>
              </>
            )}
          </div>
          <div className="games-video-modal-footer">
            <button className="games-close-video-btn" onClick={() => setVideoPreview(null)}>
              Close Preview
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="lesson-plan-wrapper">
      <div className="lesson-plan-content">
        <div className="lesson-plan-header">
          {renderHeader()}
        </div>
        <div className="lesson-plan-body">
          {renderContent()}
        </div>
      </div>
      <ChangeCategoryModal />
      <SaveConfirmModal />
      <CategoryAlreadyAssignedModal />
      <SyncModal />
      <VideoPreviewModal />
    </div>
  );
};

export default LessonPlan;