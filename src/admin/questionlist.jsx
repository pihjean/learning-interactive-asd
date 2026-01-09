import React, { useState } from 'react';
import { FaChevronLeft, FaEye, FaCheck, FaTimes, FaVideo, FaImage } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './QuestionList.css';

const QuestionList = ({ onBack, lessonData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedViewQuestion, setSelectedViewQuestion] = useState(null);

  const [questions, setQuestions] = useState([
    {
      id: 1,
      question: "What color is the balloon?",
      answer: "Yellow",
      review: "Color Review",
      inUse: true,
      media: {
        type: 'video',
        url: 'https://example.com/yellow-balloon-video.mp4',
        preview: '/api/placeholder/100/100'
      },
      image1: null,
      image2: null,
      image3: null
    },
    {
      id: 2,
      question: "Is this blue?",
      answer: "No",
      review: "Yes/No Answer",
      inUse: true,
      media: {
        type: 'image',
        url: 'https://example.com/blue-object.jpg',
        preview: '/api/placeholder/100/100'
      },
      image1: null,
      image2: null,
      image3: null
    },
    {
      id: 3,
      question: "Is this red?",
      answer: "Yes",
      review: "Yes/No Answer",
      inUse: false,
      media: {
        type: 'image',
        url: 'https://example.com/red-object.jpg',
        preview: '/api/placeholder/100/100'
      },
      image1: null,
      image2: null,
      image3: null
    },
    {
      id: 4,
      question: "What is the color of this apple?",
      answer: "Red",
      review: "Color Review",
      inUse: true,
      media: {
        type: 'image',
        url: 'https://example.com/red-apple.jpg',
        preview: '/api/placeholder/100/100'
      },
      image1: null,
      image2: null,
      image3: null
    },
    {
      id: 5,
      question: "Match the shapes",
      answer: "Triangle",
      review: "Match Type",
      inUse: true,
      media: null,
      image1: {
        type: 'image',
        url: 'https://example.com/triangle-1.jpg',
        preview: '/api/placeholder/100/100'
      },
      image2: {
        type: 'image',
        url: 'https://example.com/triangle-2.jpg',
        preview: '/api/placeholder/100/100'
      },
      image3: {
        type: 'image',
        url: 'https://example.com/triangle-3.jpg',
        preview: '/api/placeholder/100/100'
      }
    }
  ]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleBackNavigation = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1); // Navigate to previous page in history
    }
  };

  const handleSave = () => {
    // Save functionality here if needed
    console.log('Saving question list state');
    // Navigate to dashboard
    navigate('/dashboard');
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
    setQuestions(prevQuestions =>
      prevQuestions.map(q =>
        q.id === questionId ? { ...q, inUse: !q.inUse } : q
      )
    );
  };

  const filteredQuestions = questions.filter(question =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.review.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const titleText = lessonData 
    ? `${lessonData.day || ''} / ${lessonData.category || ''} / ${lessonData.difficulty || 'Questions'}`
    : 'Questions';

  const renderMediaThumbnail = (media) => {
    if (!media) return <div className="media-thumbnail empty"></div>;
    
    return (
      <div className="media-preview-thumbnail">
        {media.type === 'image' ? (
          <img src={media.preview} alt="Media" className="media-thumbnail-img" />
        ) : (
          <div className="media-thumbnail video">
            <FaVideo />
          </div>
        )}
      </div>
    );
  };

  // View Modal component
  const ViewQuestionModal = () => {
    if (!selectedViewQuestion) return null;
    
    const isMatchType = selectedViewQuestion.review === "Match Type";
    
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
            {/* Media Section - Based on review type */}
            <div className="question-media-section">
              {isMatchType ? (
                /* Three Images for Match Type */
                <div className="question-image-display-container">
                  <h4>Match Type Images</h4>
                  <div className="question-image-display">
                    <div className="question-image-preview">
                      <h5>Image 1</h5>
                      {renderMediaThumbnail(selectedViewQuestion.image1)}
                    </div>
                    <div className="question-image-preview">
                      <h5>Image 2</h5>
                      {renderMediaThumbnail(selectedViewQuestion.image2)}
                    </div>
                    <div className="question-image-preview">
                      <h5>Image 3</h5>
                      {renderMediaThumbnail(selectedViewQuestion.image3)}
                    </div>
                  </div>
                </div>
              ) : (
                /* Single Media for other types */
                <div className="question-media-display-container">
                  <h4>Media</h4>
                  <div className="question-media-display">
                    {selectedViewQuestion.media ? (
                      <div className="question-media-preview">
                        {selectedViewQuestion.media.type === 'image' ? (
                          <img 
                            src={selectedViewQuestion.media.preview} 
                            alt="Question media"
                            className="question-preview-img"
                          />
                        ) : (
                          <div className="question-video-preview">
                            <FaVideo className="question-video-icon" />
                            <p>Video preview is available</p>
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
            </div>

            <div className="question-form-group">
              <label>Question</label>
              <div className="question-view-text">{selectedViewQuestion.question}</div>
            </div>
            
            <div className="question-form-group">
              <label>Answer</label>
              <div className="question-view-text">{selectedViewQuestion.answer}</div>
            </div>
            
            <div className="question-form-group">
              <label>Review Type</label>
              <div className="question-view-text">{selectedViewQuestion.review}</div>
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
    <div className="question-list-wrapper">
      <div className="question-list-content">
        <div className="question-list-header">
          <div className="question-list-nav-header">
            <button className="question-list-back-btn" onClick={handleBackNavigation}>
              <FaChevronLeft />
            </button>
            <h2 className="question-list-header-title">{titleText}</h2>
          </div>
        </div>

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
          <table className="question-list-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Question</th>
                <th>Answer</th>
                <th>Review</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((question) => (
                <tr key={question.id}>
                  <td>{question.id}</td>
                  <td>{question.question}</td>
                  <td>{question.answer}</td>
                  <td>{question.review}</td>
                  <td className="question-list-actions">
                    <button 
                      className={`question-list-status-btn ${question.inUse ? 'in-use' : 'not-in-use'}`}
                      onClick={() => toggleQuestionStatus(question.id)}
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
        </div>

        <div className="question-list-footer">
          <button className="question-list-save-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
      {viewModalOpen && <ViewQuestionModal />}
    </div>
  );
};

export default QuestionList;