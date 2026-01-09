import React, { useState, useEffect, useRef } from 'react';
import { FaChevronLeft, FaChevronRight, FaPlus, FaEdit, FaTrash, FaTimes, FaImage, FaVideo } from 'react-icons/fa';
import './Question.css';

// Helper function to get a proper URL with absolute path and caching prevention
const getProperUrl = (url, addTimestamp = true) => {
  if (!url) return '';
  
  // Handle data URLs and blob URLs
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  // Make sure URL is absolute
  const baseUrl = url.startsWith('http') ? '' : 'http://localhost:8000/';
  let fullUrl = baseUrl + url;
  
  // Add timestamp to prevent caching if needed
  if (addTimestamp) {
    const separator = fullUrl.includes('?') ? '&' : '?';
    fullUrl = `${fullUrl}${separator}t=${new Date().getTime()}`;
  }
  
  return fullUrl;
};

// Enhanced TableVideoPreview component - works for both video and image
const TableVideoPreview = ({ mediaUrl, mediaType }) => {
const videoRef = useRef(null);
const [error, setError] = useState(false);
const [loading, setLoading] = useState(true);

useEffect(() => {
  // Reset states when mediaUrl changes
  setError(false);
  setLoading(true);
  
  // Force reload the video element when mediaUrl changes
  if (videoRef.current && mediaType === 'video') {
    videoRef.current.load();
  }
  
  // Add a fallback for loading state
  const timer = setTimeout(() => {
    setLoading(false);
  }, 1000);
  
  return () => {
    clearTimeout(timer);
    // Cleanup
    if (videoRef.current && mediaType === 'video') {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
  };
}, [mediaUrl, mediaType]);

// Get proper URL with absolute path and timestamp
const getMediaUrl = () => {
  return getProperUrl(mediaUrl);
};

const handleLoadedData = () => {
  setLoading(false);
};

// Handle different media types
if (mediaType === 'image') {
  return (
    <div className="table-media-preview">
      {error ? (
        <div className="image-error-indicator">
          <FaImage />
          <p>Error</p>
        </div>
      ) : (
        <>
          {loading && (
            <div className="image-loading">
              <span>Loading...</span>
            </div>
          )}
          <img 
            src={getMediaUrl()}
            alt="Media preview"
            className="table-media-thumbnail"
            onLoad={handleLoadedData}
            onError={() => {
              console.error("Image load error:", getMediaUrl());
              setError(true);
              setLoading(false);
            }}
          />
        </>
      )}
    </div>
  );
}

return (
  <div className="table-video-preview">
    {error ? (
      <div className="video-error-indicator">
        <FaVideo />
        <p>Error</p>
      </div>
    ) : (
      <>
        {loading && (
          <div className="video-loading">
            <span>Loading...</span>
          </div>
        )}
        <video 
          ref={videoRef}
          src={getMediaUrl()}
          controls
          preload="auto"
          playsInline
          className="video-preview"
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain'
          }}
          onError={() => {
            console.error("Video load error:", getMediaUrl());
            setError(true);
            setLoading(false);
          }}
          onLoadedData={handleLoadedData}
        >
          Your browser does not support video.
        </video>
      </>
    )}
  </div>
);
};

const MediaPreview = ({ src, type, title }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Reset states when src changes
    setError(false);
    setLoading(true);
    
    // Force reload the video element when src changes
    if (videoRef.current && type === 'video') {
      videoRef.current.load();
    }
    
    // Set a fallback timeout for loading state
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // Give up on loading spinner after 1 second
    
    return () => {
      clearTimeout(timer);
      // Cleanup - pause video when component unmounts or src changes
      if (videoRef.current && type === 'video') {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
  }, [src, type]);
  
  // Function to get proper media URL
  const getMediaUrl = () => {
    if (!src) return '';
    
    // For blob URLs and data URLs, use as is
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      return src;
    }
    
    // Handle server URLs with proper base path and timestamp
    const baseUrl = src.startsWith('http') ? '' : 'http://localhost:8000/';
    const fullUrl = baseUrl + src;
    
    // Add timestamp to prevent caching
    const separator = fullUrl.includes('?') ? '&' : '?';
    return `${fullUrl}${separator}t=${new Date().getTime()}`;
  };
  
  const handleLoadedData = () => {
    setLoading(false);
  };
  
  // Show empty container if no source
  if (!src) {
    return (
      <div className="media-wrapper empty-media">
        <div className="image-error">
          {type === 'video' ? (
            <FaVideo style={{ marginBottom: '8px', fontSize: '24px' }} />
          ) : (
            <FaImage style={{ marginBottom: '8px', fontSize: '24px' }} />
          )}
          <p>No media selected</p>
        </div>
      </div>
    );
  }
  
  if (type === 'image') {
    return (
      <div className="media-wrapper">
        {error ? (
          <div className="image-error">
            <FaImage style={{ marginBottom: '8px', fontSize: '24px' }} />
            <p>Unable to load image</p>
          </div>
        ) : (
          <>
            {loading && (
              <div className="image-loading">
                <span>Loading...</span>
              </div>
            )}
            <img 
              src={getMediaUrl()}
              alt={title || "Image preview"}
              className="image-preview"
              style={{ 
                width: '100%', 
                maxHeight: '140px'
              }}
              onLoad={handleLoadedData}
              onError={() => {
                console.error("Image load error:", getMediaUrl());
                setError(true);
                setLoading(false);
              }}
            />
          </>
        )}
        {title && <p className="media-title">{title}</p>}
      </div>
    );
  }
  
  return (
    <div className="video-wrapper">
      {error ? (
        <div className="video-error">
          <FaVideo style={{ marginBottom: '8px', fontSize: '24px' }} />
          <p>Unable to load video</p>
        </div>
      ) : (
        <>
          {loading && (
            <div className="video-loading">
              <span>Loading...</span>
            </div>
          )}
          <video 
            ref={videoRef}
            src={getMediaUrl()}
            controls
            preload="auto"
            playsInline
            className="video-preview"
            style={{ 
              width: '100%', 
              maxHeight: '140px', 
              backgroundColor: '#000'
            }}
            onError={() => {
              console.error("Video load error:", getMediaUrl());
              setError(true);
              setLoading(false);
            }}
            onLoadedData={handleLoadedData}
          >
            Your browser does not support the video tag.
          </video>
        </>
      )}
      {title && <p className="video-title">{title}</p>}
    </div>
  );
};

// New component to display match type images in table
const MatchTypePreview = ({ images }) => {
const [loadedImages, setLoadedImages] = useState(Array(images.length).fill(false));
const [errors, setErrors] = useState(Array(images.length).fill(false));

const handleImageLoad = (index) => {
  const newLoadedImages = [...loadedImages];
  newLoadedImages[index] = true;
  setLoadedImages(newLoadedImages);
};

const handleImageError = (index) => {
  console.error(`Error loading image at index ${index}`);
  const newErrors = [...errors];
  newErrors[index] = true;
  setErrors(newErrors);
  
  // Mark as loaded so it doesn't stay in loading state
  const newLoadedImages = [...loadedImages];
  newLoadedImages[index] = true;
  setLoadedImages(newLoadedImages);
};

// Function to get image URL with proper timestamp and absolute path
const getProperImageUrl = (url) => {
  if (!url) return 'placeholder.png';
  
  // Handle data URLs (for file previews) separately
  if (url.startsWith('data:')) return url;
  
  // Handle blob URLs for file previews
  if (url.startsWith('blob:')) return url;
  
  // Make sure URL is absolute
  const baseUrl = url.startsWith('http') ? '' : 'http://localhost:8000/';
  const fullUrl = baseUrl + url;
  
  // Add timestamp to prevent caching
  const separator = fullUrl.includes('?') ? '&' : '?';
  return `${fullUrl}${separator}t=${new Date().getTime()}`;
};

return (
  <div className="match-type-preview">
    <div className="match-images-container">
      {images.filter(Boolean).map((image, index) => (
        <div key={index} className="match-image-wrapper">
          {!loadedImages[index] && !errors[index] && (
            <div className="match-image-loading">
              <span>...</span>
            </div>
          )}
          {errors[index] ? (
            <div className="match-image-error">
              <FaImage size={16} />
            </div>
          ) : (
            <img 
              src={getProperImageUrl(image)}
              alt={`Match image ${index + 1}`}
              className="match-image-thumbnail"
              style={{display: loadedImages[index] ? 'block' : 'none'}}
              onLoad={() => handleImageLoad(index)}
              onError={() => handleImageError(index)}
            />
          )}
        </div>
      ))}
    </div>
  </div>
);
};

const Question = () => {
const [currentView, setCurrentView] = useState('category');
const [selectedCategory, setSelectedCategory] = useState(null);
const [selectedDifficulty, setSelectedDifficulty] = useState(null);
const [modalType, setModalType] = useState(null); // null, 'add', 'edit', 'delete', 'addMatchType'
const [selectedQuestion, setSelectedQuestion] = useState(null);
const [questions, setQuestions] = useState([]);
const [loading, setLoading] = useState(false);
const [formData, setFormData] = useState({
  id: null,
  question: '',
  answer: '',
  type: 'colorReview',
  media: null,
  image1: null,
  image2: null,
  image3: null,
  uid1: "",
  uid2: "",
  uid3: ""
});

// Sample data
const categories = ['Colors', 'Shapes', 'Numbers', 'Animals', 'Money', 'Matching Type'];
const difficulties = ['Easy', 'Medium', 'Hard'];

// Fetch questions when category and difficulty are selected
useEffect(() => {
  if (selectedCategory && selectedDifficulty && currentView === 'question') {
    fetchQuestions();
  }
}, [selectedCategory, selectedDifficulty, currentView]);

const fetchQuestions = async () => {
  setLoading(true);
  try {
    const response = await fetch('http://daetsnedlearning.site/backend/questions.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getQuestions',
        category: selectedCategory,
        difficulty: selectedDifficulty
      }),
    });

    const data = await response.json();
    
    if (data.success && data.questions) {
      // Make sure all the image URLs use the consolidated endpoint
      data.questions.forEach(question => {
        if (question.media_url && !question.media_url.includes('questions.php')) {
          question.media_url = `http://localhost:8000/questions.php?id=${question.questionID}&field=media`;
        }
        if (question.image1_url && !question.image1_url.includes('questions.php')) {
          question.image1_url = `http://localhost:8000/questions.php?id=${question.questionID}&field=image1`;
        }
        if (question.image2_url && !question.image2_url.includes('questions.php')) {
          question.image2_url = `http://localhost:8000/questions.php?id=${question.questionID}&field=image2`;
        }
        if (question.image3_url && !question.image3_url.includes('questions.php')) {
          question.image3_url = `http://localhost:8000/questions.php?id=${question.questionID}&field=image3`;
        }
      });
      console.log("Fetched questions:", data.questions); // Debug: Log the fetched data
      setQuestions(data.questions);
    } else {
      console.error("Error in response:", data.message);
      setQuestions([]);
    }
  } catch (error) {
    console.error('Error fetching questions:', error);
    alert('Failed to fetch questions. Please try again.');
  } finally {
    setLoading(false);
  }
};

const handleCategorySelect = (category) => {
  setSelectedCategory(category);
  setCurrentView('difficulty');
};

const handleDifficultySelect = (difficulty) => {
  setSelectedDifficulty(difficulty);
  setCurrentView('question');
};

const handleBack = () => {
  if (currentView === 'difficulty') {
    setCurrentView('category');
    setSelectedCategory(null);
  } else if (currentView === 'question') {
    setCurrentView('difficulty');
    setSelectedDifficulty(null);
  }
};

// Automatically set the form type based on category when opening the Add modal
const openAddModal = () => {
  // For regular categories, default to colorReview
  const defaultType = 'colorReview';
  
  // Prepare empty form data with appropriate defaults based on category
  setFormData({
    id: null,
    question: '',
    answer: '',
    type: defaultType,
    media: null
  });
  
  setModalType('add');
};

// Open a dedicated modal for adding match type questions
const openAddMatchTypeModal = () => {
  setFormData({
    id: null,
    question: '',
    type: 'matchType',
    image1: null,
    image2: null,
    image3: null,
    uid1: "",
    uid2: "",
    uid3: ""
  });
  
  setModalType('addMatchType');
};

const openEditModal = (question) => {
  setSelectedQuestion(question);
  
  if (question.type === 'matchType') {
    // Prepare image data for the three match type images
    let image1Data = null;
    if (question.image1_url) {
      image1Data = {
        type: 'image',
        preview: question.image1_url,
        url: question.image1_url
      };
    }

    let image2Data = null;
    if (question.image2_url) {
      image2Data = {
        type: 'image',
        preview: question.image2_url,
        url: question.image2_url
      };
    }

    let image3Data = null;
    if (question.image3_url) {
      image3Data = {
        type: 'image',
        preview: question.image3_url,
        url: question.image3_url
      };
    }
    
    setFormData({
      id: question.questionID,
      question: question.question,
      type: 'matchType',
      image1: image1Data,
      image2: image2Data,
      image3: image3Data,
      uid1: question.uid1 || "",
      uid2: question.uid2 || "",
      uid3: question.uid3 || ""
    });
    
    setModalType('addMatchType'); // Use the match type modal for editing too
  } else {
    // Prepare media data based on the question
    let mediaData = null;
    if (question.media_type !== 'none' && question.media_url) {
      mediaData = {
        type: question.media_type,
        preview: question.media_url,
        url: question.media_url
      };
    }
    
    setFormData({
      id: question.questionID,
      question: question.question,
      answer: question.answer || '',
      type: question.type,
      media: mediaData
    });
    
    setModalType('edit');
  }
};

const openDeleteModal = (question) => {
  setSelectedQuestion(question);
  setModalType('delete');
};

const closeModal = () => {
  setModalType(null);
  setSelectedQuestion(null);
};

const handleInputChange = (e) => {
  const { name, value } = e.target;
  setFormData({
    ...formData,
    [name]: value
  });
};

const handleTypeChange = (type) => {
  setFormData({
    ...formData,
    type: type
  });
};

const handleFileChange = (e, mediaType) => {
  const file = e.target.files[0];
  if (!file) return;

  // Create a URL for previewing the file
  const objectUrl = URL.createObjectURL(file);
  
  // Determine the media type from the file
  const isImage = file.type.startsWith('image/');
  const type = isImage ? 'image' : 'video';
  
  // Create the media item with proper type information
  const mediaItem = {
    type: type,
    name: file.name,
    size: file.size,
    file: file,
    url: objectUrl,
    preview: objectUrl // Use objectUrl as preview immediately
  };

  // Update the form data with the new media
  setFormData(prevFormData => ({
    ...prevFormData,
    [mediaType]: mediaItem
  }));


  // Start reading the file as data URL (this happens asynchronously)
  reader.readAsDataURL(file);
  
  // Immediately update with objectURL for faster preview
  // This gives an immediate update while the FileReader is still processing
  const immediatePreview = {
    type: file.type.startsWith('image/') ? 'image' : 'video',
    name: file.name,
    size: file.size,
    file: file,
    url: objectUrl,
    preview: null // Will be filled by FileReader later
  };
  
  setFormData(prevFormData => ({
    ...prevFormData,
    [mediaType]: immediatePreview
  }));
};

const removeMedia = (mediaType) => {
  if (formData[mediaType]?.url && formData[mediaType].url.startsWith('blob:')) {
    URL.revokeObjectURL(formData[mediaType].url);
  }
  
  setFormData({
    ...formData,
    [mediaType]: null
  });
};

const handleSubmit = async () => {
  // Validate form data
  if (!formData.question.trim()) {
    alert('Please enter a question');
    return;
  }

  // Validate based on question type
  if (formData.type === 'matchType') {
    if (!formData.image1 || !formData.image2 || !formData.image3) {
      alert('Please upload all three images for match type');
      return;
    }
  } else {
    if (!formData.answer.trim()) {
      alert('Please enter an answer');
      return;
    }
    
    if (!formData.media) {
      alert('Please upload media for the question');
      return;
    }
  }

  // Create FormData to handle file uploads
  const data = new FormData();
  data.append('action', modalType === 'add' || modalType === 'addMatchType' ? 'addQuestion' : 'updateQuestion');
  data.append('questionID', formData.id);
  data.append('question', formData.question);
  data.append('type', formData.type);
  
  // For regular questions
  if (formData.type !== 'matchType') {
    data.append('answer', formData.answer);
    
    if (formData.media && formData.media.file) {
      data.append('media', formData.media.file);
      data.append('media_type', formData.media.type);
    } else if (formData.media && formData.media.url) {
      data.append('media_url', formData.media.url);
      data.append('media_type', formData.media.type);
    }
  } 
  // For match type questions
  else {
    data.append('answer', ''); // Empty answer for match type
    
    if (formData.image1 && formData.image1.file) {
      data.append('image1', formData.image1.file);
    } else if (formData.image1 && formData.image1.url) {
      data.append('image1_url', formData.image1.url);
    }
    
    if (formData.image2 && formData.image2.file) {
      data.append('image2', formData.image2.file);
    } else if (formData.image2 && formData.image2.url) {
      data.append('image2_url', formData.image2.url);
    }
    
    if (formData.image3 && formData.image3.file) {
      data.append('image3', formData.image3.file);
    } else if (formData.image3 && formData.image3.url) {
      data.append('image3_url', formData.image3.url);
    }
    
    data.append('uid1', formData.uid1);
    data.append('uid2', formData.uid2);
    data.append('uid3', formData.uid3);
  }
  
  data.append('category', selectedCategory);
  data.append('difficulty', selectedDifficulty);

  try {
    setLoading(true);
    const response = await fetch('http://localhost:8000/questions.php', {
      method: 'POST',
      body: data
    });

    const result = await response.json();
    
    if (result.success) {
      alert(result.message);
      closeModal();
      fetchQuestions(); // Refresh the questions list
    } else {
      alert('Error: ' + result.message);
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Failed to save question. Please try again.');
  } finally {
    setLoading(false);
  }
};

const handleDelete = async () => {
  try {
    setLoading(true);
    const response = await fetch('http://localhost:8000/questions.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteQuestion',
        questionID: selectedQuestion.questionID
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      alert('Question deleted successfully');
      closeModal();
      fetchQuestions(); // Refresh the questions list
    } else {
      alert('Error: ' + result.message);
    }
  } catch (error) {
    console.error('Error deleting question:', error);
    alert('Failed to delete question. Please try again.');
  } finally {
    setLoading(false);
  }
};

const renderTitle = () => {
  switch (currentView) {
    case 'category':
      return <h2 className="question-header-title">Question - Categories</h2>;
    case 'difficulty':
      return (
        <div className="question-nav-header">
          <button className="question-back-btn" onClick={handleBack}>
            <FaChevronLeft />
          </button>
          <h2 className="question-header-title">Category / {selectedCategory}</h2>
        </div>
      );
    case 'question':
      return (
        <div className="question-nav-header">
          <button className="question-back-btn" onClick={handleBack}>
            <FaChevronLeft />
          </button>
          <h2 className="question-header-title">{selectedCategory} - {selectedDifficulty}</h2>
          <button 
            className="question-add-btn" 
            onClick={selectedCategory === 'Matching Type' ? openAddMatchTypeModal : openAddModal}
          >
            <FaPlus />
          </button>
        </div>
      );
    default:
      return <h2 className="question-header-title">Questions</h2>;
  }
};

// Helper function to convert type value to readable text
const getReadableType = (type) => {
  switch(type) {
    case 'colorReview':
      return 'Color Buttons';
    case 'yesNoReview':
      return 'Yes/No';
    case 'number':
      return 'Number';
    case 'matchType':
      return 'Match Type';
    default:
      return type;
  }
};

const renderContent = () => {
  switch (currentView) {
    case 'category':
      return (
        <div className="question-category-container">
          <h3 className="question-subtitle">Category</h3>
          <div className="question-items-list">
            {categories.map((category) => (
              <div key={category} className="question-item" onClick={() => handleCategorySelect(category)}>
                <span className="question-item-text">{category}</span>
                <FaChevronRight className="question-item-icon" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'difficulty':
      return (
        <div className="question-difficulty-container">
          <h3 className="question-subtitle">Difficulty</h3>
          <div className="question-items-list">
            {difficulties.map((difficulty) => (
              <div key={difficulty} className="question-item" onClick={() => handleDifficultySelect(difficulty)}>
                <span className="question-item-text">{difficulty}</span>
                <FaChevronRight className="question-item-icon" />
              </div>
            ))}
          </div>
        </div>
      );
      case 'question':
        return (
          <div className="question-list-container">
            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : questions.length === 0 ? (
              <div className="no-questions">
                <p>No questions found for {selectedCategory} - {selectedDifficulty}</p>
                <p>Click the + button to add a new question</p>
              </div>
            ) : (
              <table className="question-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Question</th>
                    <th>Answer</th>
                    <th>Type</th>
                    <th>Media</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question, index) => (
                    <tr key={question.questionID}>
                      <td>{index + 1}</td>
                      <td>{question.question}</td>
                      <td>{question.type === 'matchType' ? 'N/A' : question.answer}</td>
                      <td>{getReadableType(question.type)}</td>
                      <td>
                        {question.type === 'matchType' ? (
                          <div className="match-type-preview-container">
                            <MatchTypePreview 
                              images={[question.image1_url, question.image2_url, question.image3_url]}
                            />
                          </div>
                        ) : question.media_type !== 'none' ? (
                          <div className="table-media-preview">
                            <TableVideoPreview 
                              mediaUrl={question.media_url} 
                              mediaType={question.media_type}
                            />
                          </div>
                        ) : (
                          <span>No media</span>
                        )}
                      </td>
                      <td>
                        <div className="question-actions">
                          <button className="question-edit-btn" onClick={() => openEditModal(question)}>
                            <FaEdit />
                          </button>
                          <button className="question-delete-btn" onClick={() => openDeleteModal(question)}>
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
    default:
      return null;
  }
};

const renderMediaUploadBox = (mediaType, mediaLabel, inputLabel, uidName, acceptType = "image/*,video/*") => {
  const media = formData[mediaType];
  const uidValue = formData[uidName] || "";
  const isMatchType = formData.type === 'matchType';
  
  return (
    <div className="question-upload-container">
      <div className="question-upload-box">
        {media ? (
          <div className="media-preview">
            <MediaPreview 
              src={media.preview || media.url} 
              type={media.type}
              title={media.name}
            />
            <button 
              className="media-remove-btn" 
              onClick={() => removeMedia(mediaType)}
              type="button"
            >
              <FaTimes/>
            </button>
          </div>
        ) : (
          <>
            <div className="question-upload-icon">+</div>
            <input 
              type="file" 
              accept={acceptType}
              className="question-file-input" 
              onChange={(e) => handleFileChange(e, mediaType)}
            />
            <div className="question-upload-info">
              <p>Upload {mediaLabel}</p>
              <p className="question-upload-size">Max: 16MB</p>
            </div>
          </>
        )}
      </div>
      {isMatchType && uidName && (
        <div className="question-image-label-input">
          <label className="question-image-label">RFID UID</label>
          <input 
            type="text" 
            name={uidName} 
            value={uidValue} 
            onChange={handleInputChange} 
            className="question-label-text-input" 
            placeholder="Enter RFID UID for this image"
          />
        </div>
      )}
    </div>
  );
};
const renderRegularFormContent = () => {
  return (
    <>
      <div className="question-form-group">
        <label>Question Type</label>
        <div className="question-review-options">
          <div 
            className={`question-review-option ${formData.type === 'colorReview' ? 'active' : ''}`}
            onClick={() => handleTypeChange('colorReview')}
          >
            <input 
              type="radio" 
              name="type" 
              checked={formData.type === 'colorReview'} 
              onChange={() => {}}
              className="question-radio-input"
            />
            <label>Color Buttons</label>
          </div>
          <div 
            className={`question-review-option ${formData.type === 'yesNoReview' ? 'active' : ''}`}
            onClick={() => handleTypeChange('yesNoReview')}
          >
            <input 
              type="radio" 
              name="type" 
              checked={formData.type === 'yesNoReview'} 
              onChange={() => {}}
              className="question-radio-input"
            />
            <label>Yes/No</label>
          </div>
          <div 
            className={`question-review-option ${formData.type === 'number' ? 'active' : ''}`}
            onClick={() => handleTypeChange('number')}
          >
            <input 
              type="radio" 
              name="type" 
              checked={formData.type === 'number'} 
              onChange={() => {}}
              className="question-radio-input"
            />
            <label>Number</label>
          </div>
        </div>
      </div>
      
      <div className="question-form-group">
        <label>Question</label>
        <textarea 
          name="question" 
          value={formData.question} 
          onChange={handleInputChange}
          placeholder="Enter Question"
        />
      </div>
      
      <div className="question-form-group">
        <label>Answer</label>
        <textarea 
          name="answer" 
          value={formData.answer} 
          onChange={handleInputChange}
          placeholder="Enter Answer"
        />
      </div>
      
      <div className="question-media-uploads">
        <div className="question-media-upload-container">
          <h4>Upload Media</h4>
          <div className="question-media-upload">
            {renderMediaUploadBox('media', 'Image or Video', '', '', "image/*,video/*")}
          </div>
        </div>
      </div>
    </>
  );
};

const renderMatchTypeFormContent = () => {
  return (
    <>
      <div className="question-form-group">
        <label>Question</label>
        <textarea 
          name="question" 
          value={formData.question} 
          onChange={handleInputChange}
          placeholder="Enter Question"
        />
      </div>
      
      <div className="question-media-uploads">
        <div className="question-image-uploads-container">
          <h4>Upload Images for Match Type</h4>
          <div className="question-image-uploads">
            {renderMediaUploadBox('image1', 'Image 1', 'UID 1', 'uid1', "image/*")}
            {renderMediaUploadBox('image2', 'Image 2', 'UID 2', 'uid2', "image/*")}
            {renderMediaUploadBox('image3', 'Image 3', 'UID 3', 'uid3', "image/*")}
          </div>
        </div>
      </div>
    </>
  );
};

const renderModal = () => {
  switch (modalType) {
    case 'add':
      return (
        <div className="question-modal-overlay">
          <div className="question-modal">
            <div className="question-modal-header">
              <h3>Add Question</h3>
              <button className="question-modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className="question-modal-content">
              {renderRegularFormContent()}
            </div>
            <div className="question-modal-footer">
              <button className="question-save-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      );
    case 'edit':
      return (
        <div className="question-modal-overlay">
          <div className="question-modal">
            <div className="question-modal-header">
              <h3>Edit Question</h3>
              <button className="question-modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className="question-modal-content">
              {renderRegularFormContent()}
            </div>
            <div className="question-modal-footer">
              <button className="question-save-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      );
    case 'addMatchType':
      return (
        <div className="question-modal-overlay">
          <div className="question-modal">
            <div className="question-modal-header">
              <h3>{formData.id ? 'Edit' : 'Add'} Match Type Question</h3>
              <button className="question-modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className="question-modal-content">
              {renderMatchTypeFormContent()}
            </div>
            <div className="question-modal-footer">
              <button className="question-save-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? (formData.id ? 'Updating...' : 'Saving...') : (formData.id ? 'Update' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      );
    case 'delete':
      return (
        <div className="question-modal-overlay">
          <div className="question-delete-modal">
            <div className="question-modal-header">
              <h3>Confirmation</h3>
              <button className="question-modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className="question-delete-content">
              <div className="question-delete-icon">
                <svg viewBox="0 0 24 24" width="90" height="90" fill="#0057b3">
                  <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" />
                  <path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2z" />
                </svg>
              </div>
              <p className="question-delete-message">Are you sure you want to delete this Question?</p>
            </div>
            <div className="question-delete-actions">
              <button className="question-yes-btn" onClick={handleDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Yes'}
              </button>
              <button className="question-no-btn" onClick={closeModal}>No</button>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
};

// Cleanup function to revoke object URLs when component unmounts
useEffect(() => {
  return () => {
    // Cleanup any object URLs when component unmounts
    if (formData.media?.url && formData.media.url.startsWith('blob:')) {
      URL.revokeObjectURL(formData.media.url);
    }
    if (formData.image1?.url && formData.image1.url.startsWith('blob:')) {
      URL.revokeObjectURL(formData.image1.url);
    }
    if (formData.image2?.url && formData.image2.url.startsWith('blob:')) {
      URL.revokeObjectURL(formData.image2.url);
    }
    if (formData.image3?.url && formData.image3.url.startsWith('blob:')) {
      URL.revokeObjectURL(formData.image3.url);
    }
  };
}, [formData]);

return (
  <div className="question-wrapper">
    <div className="question-container-aq">
      <div className="question-header-aq">
        {renderTitle()}
      </div>
      <div className="question-content">
        {renderContent()}
      </div>
    </div>
    {renderModal()}
  </div>
);
};

export default Question;