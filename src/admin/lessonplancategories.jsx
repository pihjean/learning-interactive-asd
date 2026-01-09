import React, { useState, useEffect } from 'react';
import { FaChevronRight, FaChevronLeft, FaEye, FaCheck, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './LessonPlan.css';
import './QuestionList.css';
import './LessonPlanCategories.css';

const LessonPlanCategories = () => {
  // State variables
  const [currentView, setCurrentView] = useState('category');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [questions, setQuestions] = useState([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedViewQuestion, setSelectedViewQuestion] = useState(null);
  const [assignedCategories, setAssignedCategories] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [maxQuestionsModal, setMaxQuestionsModal] = useState(false);
  const [saveConfirmModal, setSaveConfirmModal] = useState(false);
  const [notEnoughQuestionsModal, setNotEnoughQuestionsModal] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  const navigate = useNavigate();

  // Data for different views
  const categories = ['Colors', 'Shapes', 'Numbers', 'Animals', 'Matching Type'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  // Fetch assigned categories when component mounts
  useEffect(() => {
    fetchAssignedCategories();
  }, []);

  // Fetch questions when difficulty is selected
  useEffect(() => {
    if (selectedCategory && selectedDifficulty) {
      fetchQuestions();
    }
  }, [selectedCategory, selectedDifficulty]);

  const fetchAssignedCategories = async () => {
    try {
      const response = await fetch('http://daetsnedlearning.site/backend/activity_questions.php?action=fetch_assignments');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      if (data.success) {
        const categoriesByType = {};
        data.assignments.forEach(assignment => {
          if (!categoriesByType[assignment.category]) {
            categoriesByType[assignment.category] = [];
          }
          categoriesByType[assignment.category].push(assignment.difficulty);
        });
        setAssignedCategories(categoriesByType);
      }
    } catch (error) {
      console.error('Error fetching assigned categories:', error);
    }
  };

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      // First check if any questions are already assigned for this category/difficulty
      const activityResponse = await fetch(`http://daetsnedlearning.site/backend/activity_questions.php?action=fetch_activity_questions&category=${selectedCategory}&difficulty=${selectedDifficulty}`);
      if (!activityResponse.ok) {
        throw new Error('Network response was not ok');
      }
      const activityData = await activityResponse.json();
      
      // Extract assigned question IDs from the activity_questions table
      let assignedQuestionIds = [];
      if (activityData.success && activityData.assignment) {
        // Convert to Numbers and filter out any NaN or null values
        assignedQuestionIds = [
          Number(activityData.assignment.question1),
          Number(activityData.assignment.question2), 
          Number(activityData.assignment.question3)
        ].filter(id => !isNaN(id) && id !== null);
      }
      
      // Get all questions for the category and difficulty
      const response = await fetch(`http://daetsnedlearning.site/backend/activity_questions.php?action=fetch_questions&category=${selectedCategory}&difficulty=${selectedDifficulty}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      
      if (data.success) {
        // Set questions and mark those in assignedQuestionIds as "in use"
        const allQuestions = data.questions.map(q => {
          const questionId = Number(q.questionID);
          const isInUse = assignedQuestionIds.includes(questionId);
          
          return {
            ...q,
            inUse: isInUse
          };
        });
        
        setQuestions(allQuestions);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentView('difficulty');
  };

  const handleDifficultySelect = (difficulty) => {
    setSelectedDifficulty(difficulty);
    setCurrentView('questions');
  };

  const handleBack = () => {
    if (currentView === 'category') {
      // Go back to the dashboard
      navigate('/dashboard');
    } else if (currentView === 'difficulty') {
      setCurrentView('category');
      setSelectedCategory(null);
    } else if (currentView === 'questions') {
      setCurrentView('difficulty');
      setSelectedDifficulty(null);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleViewQuestion = (question) => {
    setSelectedViewQuestion(question);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedViewQuestion(null);
  };

  const toggleQuestionStatus = (questionId) => {
    // Count currently selected questions
    const currentlyInUse = questions.filter(q => q.inUse).length;
    const question = questions.find(q => q.questionID === questionId);
    
    // If trying to select more than 3 questions
    if (!question.inUse && currentlyInUse >= 3) {
      setMaxQuestionsModal(true);
      return;
    }
    
    // Update the question status
    const updatedQuestions = questions.map(q =>
      q.questionID === questionId ? { ...q, inUse: !q.inUse } : q
    );
    
    setQuestions(updatedQuestions);
  };

  const handleSaveClick = () => {
    // Get selected questions
    const selectedQuestions = questions.filter(q => q.inUse);
    
    // Ensure we have exactly 3 questions
    if (selectedQuestions.length !== 3) {
      setNotEnoughQuestionsModal(true);
      return;
    }
    
    // Show confirmation modal
    setSaveConfirmModal(true);
  };

  const handleSaveConfirm = async () => {
    setSaveConfirmModal(false);
    
    // Get selected questions (3 questions)
    const selectedQuestions = questions
      .filter(q => q.inUse)
      .slice(0, 3)
      .map(q => q.questionID);
    
    // Ensure we have exactly 3 values
    const question1 = selectedQuestions[0] || null;
    const question2 = selectedQuestions[1] || null;
    const question3 = selectedQuestions[2] || null;
    
    try {
      const response = await fetch('http://daetsnedlearning.site/backend/activity_questions.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_activity_questions',
          category: selectedCategory,
          difficulty: selectedDifficulty,
          question1,
          question2,
          question3
        }),
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update assigned categories in state
        setAssignedCategories(prevAssigned => {
          const newAssigned = { ...prevAssigned };
          if (!newAssigned[selectedCategory]) {
            newAssigned[selectedCategory] = [];
          }
          
          if (!newAssigned[selectedCategory].includes(selectedDifficulty)) {
            newAssigned[selectedCategory].push(selectedDifficulty);
          }
          
          return newAssigned;
        });
        
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          navigate('/dashboard');
        }, 2000);
      } else {
        setSaveError(data.message || 'Failed to save questions');
        setTimeout(() => setSaveError(null), 3000);
      }
    } catch (error) {
      console.error('Error saving questions:', error);
      setSaveError(error.message);
      setTimeout(() => setSaveError(null), 3000);
    }
  };

  const handleSaveCancel = () => {
    setSaveConfirmModal(false);
  };

  // Function to get display-friendly type name
  const getTypeDisplayName = (type) => {
    switch(type) {
      case 'colorReview':
        return 'Color Buttons';
      case 'yesNoReview':
        return 'Yes/No';
      case 'matchType':
        return 'Match Type';
      case 'numbersReview':
        return 'Numbers';
      default:
        return type;
    }
  };

  const filteredQuestions = questions.filter(question =>
    question.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.answer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (question.category && question.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Render helpers
  const renderHeader = () => {
    switch (currentView) {
      case 'category':
        return (
          <div className="lesson-plan-nav-header">
            <button className="lesson-plan-back-btn" onClick={handleBack}>
              <FaChevronLeft />
            </button>
            <h2 className="lesson-plan-header-title">Activity Categories</h2>
          </div>
        );
      case 'difficulty':
        return (
          <div className="lesson-plan-nav-header">
            <button className="lesson-plan-back-btn" onClick={handleBack}>
              <FaChevronLeft />
            </button>
            <h2 className="lesson-plan-header-title">Category / {selectedCategory}</h2>
          </div>
        );
      case 'questions':
        return (
          <div className="lesson-plan-nav-header">
            <button className="lesson-plan-back-btn" onClick={handleBack}>
              <FaChevronLeft />
            </button>
            <h2 className="lesson-plan-header-title">
              {selectedCategory} / {selectedDifficulty}
            </h2>
          </div>
        );
      default:
        return <h2 className="lesson-plan-header-title">Activity Categories</h2>;
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'category':
        return (
          <div className="lesson-plan-category-container">
            <h3 className="lesson-plan-category-title">Category</h3>
            <div className="lesson-plan-items-list">
              {categories.map((category) => {
                const hasAssignedDifficulties = assignedCategories[category]?.length > 0;
                return (
                  <div 
                    key={category} 
                    className={`lesson-plan-item ${hasAssignedDifficulties ? 'has-assignment' : ''}`}
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
      case 'difficulty':
        return (
          <div className="lesson-plan-difficulty-container">
            <h3 className="lesson-plan-difficulty-title">Difficulty</h3>
            <div className="lesson-plan-items-list">
              {difficulties.map((difficulty) => {
                const isAssigned = assignedCategories[selectedCategory]?.includes(difficulty);
                return (
                  <div 
                    key={difficulty} 
                    className={`lesson-plan-item ${isAssigned ? 'assigned-category' : ''}`}
                    onClick={() => handleDifficultySelect(difficulty)}
                  >
                    <span className="lesson-plan-item-text">{difficulty}</span>
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
            <div className="question-list-controls">
              <div className="question-list-search-container">
                <input
                  type="text"
                  placeholder="Search:"
                  value={searchTerm}
                  onChange={handleSearch}
                  className="question-list-search-input"
                />
              </div>
            </div>
            
            <div className="question-list-table-container">
              {loadingQuestions ? (
                <div className="loading-indicator">Loading questions...</div>
              ) : filteredQuestions.length === 0 ? (
                <div className="no-questions-message">No questions found.</div>
              ) : (
                <table className="question-list-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Question</th>
                      <th>Answer</th>
                      <th>Type</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((question, index) => (
                      <tr key={question.questionID}>
                        <td>{index + 1}</td>
                        <td>{question.question}</td>
                        <td>{question.answer}</td>
                        <td>{getTypeDisplayName(question.type)}</td>
                        <td className="question-list-actions">
                          <button 
                            className={`question-list-status-btn ${question.inUse ? 'in-use' : 'not-in-use'}`}
                            onClick={() => toggleQuestionStatus(question.questionID)}
                          >
                            {question.inUse ? <FaCheck /> : <FaTimes />}
                            <span>{question.inUse ? 'In Use' : 'Not in Use'}</span>
                          </button>
                          <button 
                            className="question-list-view-btn"
                            onClick={() => handleViewQuestion(question)}
                          >
                            <FaEye />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="question-list-footer">
              <button className="question-list-save-btn" onClick={handleSaveClick}>Save</button>
              
              {saveSuccess && (
                <div className="save-success-message">Questions saved successfully!</div>
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

  // Not Enough Questions Modal
  const NotEnoughQuestionsModal = () => {
    if (!notEnoughQuestionsModal) return null;
    
    return (
      <div className="confirm-modal-overlay">
        <div className="confirm-modal">
          <div className="confirm-modal-header">
            <h3>Cannot Save</h3>
          </div>
          <div className="confirm-modal-content">
            <p>You must select exactly 3 questions before saving.</p>
            <p>Currently selected: {questions.filter(q => q.inUse).length} question(s)</p>
          </div>
          <div className="confirm-modal-actions">
            <button 
              className="confirm-modal-confirm-btn" 
              onClick={() => setNotEnoughQuestionsModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Save Confirmation Modal
  const SaveConfirmModal = () => {
    if (!saveConfirmModal) return null;
    
    return (
      <div className="confirm-modal-overlay">
        <div className="confirm-modal">
          <div className="confirm-modal-header">
            <h3>Confirm Save</h3>
          </div>
          <div className="confirm-modal-content">
            <p>Do you want to use these questions for the <strong>{selectedCategory}</strong> activity?</p>
            <p>Selected difficulty: <strong>{selectedDifficulty}</strong></p>
          </div>
          <div className="confirm-modal-actions">
            <button className="confirm-modal-cancel-btn" onClick={handleSaveCancel}>Cancel</button>
            <button className="confirm-modal-confirm-btn" onClick={handleSaveConfirm}>Save</button>
          </div>
        </div>
      </div>
    );
  };

  // Max Questions Modal
  const MaxQuestionsModal = () => {
    if (!maxQuestionsModal) return null;
    
    return (
      <div className="confirm-modal-overlay">
        <div className="confirm-modal">
          <div className="confirm-modal-header">
            <h3>Maximum Questions Reached</h3>
          </div>
          <div className="confirm-modal-content">
            <p>You can only select a maximum of 3 questions.</p>
            <p>Please deselect one question before selecting another.</p>
          </div>
          <div className="confirm-modal-actions">
            <button 
              className="confirm-modal-confirm-btn" 
              onClick={() => setMaxQuestionsModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  // View Question Modal
  const ViewQuestionModal = () => {
    if (!selectedViewQuestion) return null;
    
    const isMatchType = selectedViewQuestion.type === "matchType";
    
    return (
      <div className="question-modal-overlay">
        <div className="questionlist-modal">
          <div className="question-modal-header">
            <h3>View Question</h3>
            <button className="question-modal-close" onClick={closeViewModal}>
              <FaTimes />
            </button>
          </div>
          <div className="question-modal-content">
            {isMatchType ? (
              /* Three Images for Match Type */
              <div className="question-media-section">
                <h4>Media</h4>
                <div className="question-image-display">
                  <div className="question-image-preview">
                    <h5>Image 1</h5>
                    {selectedViewQuestion.image1_content ? (
                      <img 
                        src={`data:image/jpeg;base64,${selectedViewQuestion.image1_content}`} 
                        alt="Question media"
                        className="question-preview-img"
                      />
                    ) : (
                      <div className="question-media-empty">
                        <p>No image available</p>
                      </div>
                    )}
                  </div>
                  <div className="question-image-preview">
                    <h5>Image 2</h5>
                    {selectedViewQuestion.image2_content ? (
                      <img 
                        src={`data:image/jpeg;base64,${selectedViewQuestion.image2_content}`} 
                        alt="Question media"
                        className="question-preview-img"
                      />
                    ) : (
                      <div className="question-media-empty">
                        <p>No image available</p>
                      </div>
                    )}
                  </div>
                  <div className="question-image-preview">
                    <h5>Image 3</h5>
                    {selectedViewQuestion.image3_content ? (
                      <img 
                        src={`data:image/jpeg;base64,${selectedViewQuestion.image3_content}`} 
                        alt="Question media"
                        className="question-preview-img"
                      />
                    ) : (
                      <div className="question-media-empty">
                        <p>No image available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Single Media for other types */
              <div className="question-media-section">
                <h4>Media</h4>
                <div className="question-media-display">
                  {selectedViewQuestion.media_content ? (
                    <div className="question-media-preview">
                      {selectedViewQuestion.media_type === 'image' ? (
                        <img 
                          src={`data:image/jpeg;base64,${selectedViewQuestion.media_content}`} 
                          alt="Question media"
                          className="question-preview-img"
                        />
                      ) : selectedViewQuestion.media_type === 'video' ? (
                        <video 
                          controls
                          className="question-preview-video"
                        >
                          <source src={`data:video/mp4;base64,${selectedViewQuestion.media_content}`} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <div className="question-media-empty">
                          <p>No media available</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="question-media-empty">
                      <p>No media available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="question-form-group">
              <label>Question</label>
              <div className="question-view-text">{selectedViewQuestion.question}</div>
            </div>
            
            {!isMatchType && (
              <div className="question-form-group">
                <label>Answer</label>
                <div className="question-view-text">{selectedViewQuestion.answer}</div>
              </div>
            )}
            
            <div className="question-form-group">
              <label>Type</label>
              <div className="question-view-text">{getTypeDisplayName(selectedViewQuestion.type)}</div>
            </div>
            
            <div className="question-form-group">
              <label>Status</label>
              <div className={`question-view-status ${selectedViewQuestion.inUse ? 'in-use' : 'not-in-use'}`}>
                {selectedViewQuestion.inUse ? 'In Use' : 'Not in Use'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="lesson-plan-categories-wrapper">
      <div className="lesson-plan-content">
        <div className="lesson-plan-header">
          {renderHeader()}
        </div>
        <div className="lesson-plan-body">
          {renderContent()}
        </div>
      </div>
      {saveConfirmModal && <SaveConfirmModal />}
      {notEnoughQuestionsModal && <NotEnoughQuestionsModal />}
      {maxQuestionsModal && <MaxQuestionsModal />}
      {viewModalOpen && <ViewQuestionModal />}
    </div>
  );
};

export default LessonPlanCategories;