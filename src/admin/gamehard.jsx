import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronLeft, FaPlus, FaEdit, FaTrash, FaTimes, FaVideo, FaPlay, FaCheck, FaVolumeUp, FaExclamationTriangle } from 'react-icons/fa';
import './Games.css';

const GameHard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { category, difficulty } = location.state || {};
  
  const [games, setGames] = useState([]);
  const [modalType, setModalType] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [formData, setFormData] = useState({
    hard_id: null,
    map: null,
    lesson: null,
    question1: null,
    answer1: '',
    q1_wrong_answer1: '',
    q1_wrong_answer2: '',
    achievement1: null,
    wrong_answer1: null,
    question2: null,
    answer2: '',
    q2_wrong_answer1: '',
    q2_wrong_answer2: '',
    achievement2: null,
    wrong_answer2: null,
    question3: null,
    answer3: '',
    q3_wrong_answer1: '',
    q3_wrong_answer2: '',
    achievement3: null,
    wrong_answer3: null,
    final_achievement: null,
    last_map: null,
    outro: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoError, setVideoError] = useState(false);
  
  const API_URL = 'http://daetsnedlearning.site/backend/game_hard.php';

  useEffect(() => {
    console.log('Received in GameHard:', { category, difficulty });
    
    if (!category || !difficulty) {
      console.error('Category or difficulty is missing');
    }
    
    fetchGames();
  }, [category, difficulty]);

  const getVideoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_URL}?action=getVideo&file=${cleanPath}`;
  };

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      console.log(`Fetching games: ${API_URL}?action=getGames&category=${category}`);
      
      const response = await fetch(`${API_URL}?action=getGames&category=${category}`);
      console.log('Fetch response status:', response.status);
      
      const data = await response.json();
      console.log('Fetch response data:', data);
      
      if (data.success) {
        const processedGames = data.games.map(game => {
          const videoFields = [
            'map', 'lesson', 'question1', 'achievement1', 'wrong_answer1',
            'question2', 'achievement2', 'wrong_answer2', 'question3', 
            'achievement3', 'wrong_answer3', 'final_achievement', 'last_map', 'outro'
          ];
          
          videoFields.forEach(field => {
            if (game[field] && game[field].path) {
              game[field].originalPath = game[field].path;
              game[field].videoUrl = getVideoUrl(game[field].path);
            }
          });
          
          return game;
        });
        
        setGames(processedGames || []);
        console.log('Games loaded with video URLs:', processedGames);
      } else {
        console.error('Failed to fetch games:', data.message);
        setErrorMessage(`Failed to load games: ${data.message}`);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      setErrorMessage('Network error when loading games. Please check your connection and server status.');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      hard_id: null,
      map: null,
      lesson: null,
      question1: null,
      answer1: '',
      q1_wrong_answer1: '',
      q1_wrong_answer2: '',
      achievement1: null,
      wrong_answer1: null,
      question2: null,
      answer2: '',
      q2_wrong_answer1: '',
      q2_wrong_answer2: '',
      achievement2: null,
      wrong_answer2: null,
      question3: null,
      answer3: '',
      q3_wrong_answer1: '',
      q3_wrong_answer2: '',
      achievement3: null,
      wrong_answer3: null,
      final_achievement: null,
      last_map: null,
      outro: null
    });
    setModalType('add');
    setErrorMessage('');
  };

  const openEditModal = (game) => {
    const gameCopy = JSON.parse(JSON.stringify(game));
    setSelectedGame(gameCopy);
    
    setFormData({
      hard_id: gameCopy.hard_id,
      map: gameCopy.map,
      lesson: gameCopy.lesson,
      question1: gameCopy.question1,
      answer1: gameCopy.answer1,
      q1_wrong_answer1: gameCopy.q1_wrong_answer1 || '',
      q1_wrong_answer2: gameCopy.q1_wrong_answer2 || '',
      achievement1: gameCopy.achievement1,
      wrong_answer1: gameCopy.wrong_answer1,
      question2: gameCopy.question2,
      answer2: gameCopy.answer2,
      q2_wrong_answer1: gameCopy.q2_wrong_answer1 || '',
      q2_wrong_answer2: gameCopy.q2_wrong_answer2 || '',
      achievement2: gameCopy.achievement2,
      wrong_answer2: gameCopy.wrong_answer2,
      question3: gameCopy.question3,
      answer3: gameCopy.answer3,
      q3_wrong_answer1: gameCopy.q3_wrong_answer1 || '',
      q3_wrong_answer2: gameCopy.q3_wrong_answer2 || '',
      achievement3: gameCopy.achievement3,
      wrong_answer3: gameCopy.wrong_answer3,
      final_achievement: gameCopy.final_achievement,
      last_map: gameCopy.last_map,
      outro: gameCopy.outro
    });
    
    console.log('Opening edit modal with game:', gameCopy);
    setModalType('edit');
    setErrorMessage('');
  };

  const openDeleteModal = (game) => {
    setSelectedGame(game);
    setModalType('delete');
    setErrorMessage('');
  };

  const showSuccessModal = (message) => {
    setSuccessMessage(message);
    setModalType('success');
    
    setTimeout(() => {
      if (modalType === 'success') {
        closeModal();
      }
    }, 3000);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedGame(null);
    setErrorMessage('');
    setVideoPreview(null);
    setVideoError(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e, mediaType) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'mp4') {
      setErrorMessage(`Only MP4 video files are supported. Please convert your video to MP4 format.`);
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    const maxSizeMB = 100;
    
    if (fileSizeMB > maxSizeMB) {
      setErrorMessage(`File size (${fileSizeMB.toFixed(1)}MB) exceeds ${maxSizeMB}MB limit. Please compress your video.`);
      return;
    }

    const mediaItem = {
      type: 'video',
      name: file.name,
      size: file.size,
      file: file,
      preview: URL.createObjectURL(file)
    };
    
    setFormData({
      ...formData,
      [mediaType]: mediaItem
    });
    
    console.log(`File selected for ${mediaType}:`, file.name, `(${fileSizeMB.toFixed(1)}MB)`);
  };

  const removeMedia = (mediaType) => {
    if (formData[mediaType]?.preview) {
      URL.revokeObjectURL(formData[mediaType].preview);
    }
    
    setFormData(prevData => ({
      ...prevData,
      [mediaType]: { removed: true }
    }));
    
    console.log(`Removed media for ${mediaType}`);
  };

  const validateForm = () => {
    if (!formData.answer1.trim() || !formData.answer2.trim() || !formData.answer3.trim()) {
      setErrorMessage('Please enter all three required answers');
      return false;
    }
    
    if (!formData.q1_wrong_answer1.trim()) {
      setErrorMessage('Please enter at least one wrong answer for Question 1 (Q1 Wrong Answer 1)');
      return false;
    }
    
    if (!formData.q2_wrong_answer1.trim()) {
      setErrorMessage('Please enter at least one wrong answer for Question 2 (Q2 Wrong Answer 1)');
      return false;
    }
    
    if (!formData.q3_wrong_answer1.trim()) {
      setErrorMessage('Please enter at least one wrong answer for Question 3 (Q3 Wrong Answer 1)');
      return false;
    }
    
    // Check if Question 1 answers are not the same
    const q1Answers = [
      formData.answer1.trim().toLowerCase(),
      formData.q1_wrong_answer1.trim().toLowerCase()
    ];
    
    if (formData.q1_wrong_answer2.trim()) {
      q1Answers.push(formData.q1_wrong_answer2.trim().toLowerCase());
    }
    
    const uniqueQ1Answers = new Set(q1Answers);
    if (uniqueQ1Answers.size !== q1Answers.length) {
      setErrorMessage('All answers for Question 1 must be different from each other');
      return false;
    }
    
    // Check if Question 2 answers are not the same
    const q2Answers = [
      formData.answer2.trim().toLowerCase(),
      formData.q2_wrong_answer1.trim().toLowerCase()
    ];
    
    if (formData.q2_wrong_answer2.trim()) {
      q2Answers.push(formData.q2_wrong_answer2.trim().toLowerCase());
    }
    
    const uniqueQ2Answers = new Set(q2Answers);
    if (uniqueQ2Answers.size !== q2Answers.length) {
      setErrorMessage('All answers for Question 2 must be different from each other');
      return false;
    }
    
    // Check if Question 3 answers are not the same
    const q3Answers = [
      formData.answer3.trim().toLowerCase(),
      formData.q3_wrong_answer1.trim().toLowerCase()
    ];
    
    if (formData.q3_wrong_answer2.trim()) {
      q3Answers.push(formData.q3_wrong_answer2.trim().toLowerCase());
    }
    
    const uniqueQ3Answers = new Set(q3Answers);
    if (uniqueQ3Answers.size !== q3Answers.length) {
      setErrorMessage('All answers for Question 3 must be different from each other');
      return false;
    }
    
    if (modalType === 'add' && 
        !formData.map?.file && 
        !formData.lesson?.file && 
        !formData.question1?.file && 
        !formData.achievement1?.file && 
        !formData.wrong_answer1?.file &&
        !formData.question2?.file && 
        !formData.achievement2?.file && 
        !formData.wrong_answer2?.file &&
        !formData.question3?.file && 
        !formData.achievement3?.file && 
        !formData.wrong_answer3?.file &&
        !formData.final_achievement?.file && 
        !formData.last_map?.file && 
        !formData.outro?.file) {
      setErrorMessage('Please upload at least one MP4 video');
      return false;
    }
    
    return true;
  };

  const uploadFileInChunks = async (file, fieldName, category, difficulty) => {
    const chunkSize = 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Uploading ${fieldName} (${(file.size / (1024 * 1024)).toFixed(1)}MB) in ${totalChunks} chunks`);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      const chunkFormData = new FormData();
      chunkFormData.append('action', 'uploadChunk');
      chunkFormData.append('chunk', chunk);
      chunkFormData.append('chunkIndex', chunkIndex);
      chunkFormData.append('totalChunks', totalChunks);
      chunkFormData.append('fileId', fileId);
      chunkFormData.append('fileName', file.name);
      chunkFormData.append('field_name', fieldName);
      
      let retries = 3;
      let uploaded = false;
      
      while (retries > 0 && !uploaded) {
        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            body: chunkFormData,
          });
          
          if (!response.ok) {
            throw new Error(`Chunk upload failed: ${response.status}`);
          }
          
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message);
          }
          
          uploaded = true;
          
          const percentComplete = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          console.log(`${fieldName}: ${percentComplete}% (chunk ${chunkIndex + 1}/${totalChunks})`);
          
          if (chunkIndex === totalChunks - 1) {
            return {
              temp_path: result.temp_path,
              filename: result.filename
            };
          }
          
        } catch (error) {
          retries--;
          console.log(`Chunk ${chunkIndex} failed, retries left: ${retries}`);
          if (retries === 0) {
            throw new Error(`Failed to upload ${fieldName} after 3 retries: ${error.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    throw new Error('Upload incomplete');
  };

  const handleSubmit = async () => {
    try {
      if (!validateForm()) {
        return;
      }
      
      setErrorMessage('');
      setIsLoading(true);
      
      const videoFields = [
        'map', 'lesson', 'question1', 'achievement1', 'wrong_answer1',
        'question2', 'achievement2', 'wrong_answer2', 'question3', 
        'achievement3', 'wrong_answer3', 'final_achievement', 'last_map', 'outro'
      ];
      
      const uploadedFiles = {};
      
      for (const field of videoFields) {
        if (formData[field]?.file) {
          setErrorMessage(`Uploading ${field}... Please wait.`);
          try {
            const uploadResult = await uploadFileInChunks(
              formData[field].file,
              field,
              category,
              difficulty
            );
            uploadedFiles[field] = uploadResult;
            console.log(`${field} uploaded successfully`);
          } catch (error) {
            throw new Error(`Failed to upload ${field}: ${error.message}`);
          }
        }
      }
      
      setErrorMessage('Saving to database...');
      
      const saveFormData = new FormData();
      saveFormData.append('action', modalType === 'add' ? 'addGame' : 'updateGame');
      
      if (modalType === 'edit' && formData.hard_id) {
        saveFormData.append('hard_id', formData.hard_id);
      }
      
      saveFormData.append('answer1', formData.answer1);
      saveFormData.append('q1_wrong_answer1', formData.q1_wrong_answer1);
      saveFormData.append('q1_wrong_answer2', formData.q1_wrong_answer2 || '');
      saveFormData.append('answer2', formData.answer2);
      saveFormData.append('q2_wrong_answer1', formData.q2_wrong_answer1);
      saveFormData.append('q2_wrong_answer2', formData.q2_wrong_answer2 || '');
      saveFormData.append('answer3', formData.answer3);
      saveFormData.append('q3_wrong_answer1', formData.q3_wrong_answer1);
      saveFormData.append('q3_wrong_answer2', formData.q3_wrong_answer2 || '');
      saveFormData.append('category', category);
      saveFormData.append('difficulty', difficulty);
      
      Object.entries(uploadedFiles).forEach(([field, fileInfo]) => {
        saveFormData.append(`${field}_temp_path`, fileInfo.temp_path);
        saveFormData.append(`${field}_filename`, fileInfo.filename);
      });
      
      if (modalType === 'edit') {
        const pathFields = {
          'map': 'map_path', 'lesson': 'lesson_path', 'question1': 'question1_path',
          'achievement1': 'achievement1_path', 'wrong_answer1': 'wrong_answer1_path',
          'question2': 'question2_path', 'achievement2': 'achievement2_path',
          'wrong_answer2': 'wrong_answer2_path', 'question3': 'question3_path',
          'achievement3': 'achievement3_path', 'wrong_answer3': 'wrong_answer3_path',
          'final_achievement': 'final_achievement_path', 'last_map': 'last_map_path',
          'outro': 'outro_path'
        };
        
        Object.entries(pathFields).forEach(([fileKey, pathKey]) => {
          if (formData[fileKey]?.removed) {
            saveFormData.append(pathKey, '');
          } else if (!uploadedFiles[fileKey] && selectedGame[fileKey]?.originalPath) {
            saveFormData.append(pathKey, selectedGame[fileKey].originalPath);
          }
        });
      }
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: saveFormData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const successMsg = modalType === 'add' ? 
          `Game added successfully!` : 
          `Game ID ${formData.hard_id} updated successfully!`;
        
        closeModal();
        await fetchGames();
        
        setTimeout(() => {
          showSuccessModal(successMsg);
        }, 100);
      } else {
        setErrorMessage(result.message || 'An unknown error occurred');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrorMessage(error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      console.log('Deleting game:', {
        hard_id: selectedGame.hard_id,
        category: category,
        difficulty: difficulty
      });
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteGame',
          hard_id: selectedGame.hard_id,
          category: category,
          difficulty: difficulty
        }),
      });
      
      console.log('Delete response status:', response.status);
      const result = await response.json();
      console.log('Delete response data:', result);
      
      if (result.success) {
        const successMsg = `Game ID ${selectedGame.hard_id} deleted successfully!`;
        console.log(successMsg);
        
        closeModal();
        await fetchGames();
        
        setTimeout(() => {
          showSuccessModal(successMsg);
        }, 100);
      } else {
        console.error('Error:', result.message);
        setErrorMessage(result.message || 'An unknown error occurred');
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      setErrorMessage('Network error. Please check your connection and the server status.');
    } finally {
      setIsLoading(false);
    }
  };

  const openVideoPreview = (media) => {
    if (!media || (!media.videoUrl && !media.path)) return;
    
    setVideoError(false);
    
    const videoUrl = media.videoUrl || getVideoUrl(media.path);
    
    console.log('Opening video preview with URL:', videoUrl);
    setVideoPreview(videoUrl);
  };

  const handleVideoError = () => {
    console.error('Error loading video:', videoPreview);
    setVideoError(true);
  };

  const renderVideoPlayer = (videoUrl, autoplay = false) => {
    if (!videoUrl) return null;
    
    console.log('Rendering video player with URL:', videoUrl);
    
    return (
      <iframe 
        src={videoUrl}
        className="video-iframe"
        frameBorder="0"
        allowFullScreen
        allow="autoplay"
        onError={handleVideoError}
      ></iframe>
    );
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

  const renderMediaUploadBox = (mediaType, mediaLabel) => {
    const media = formData[mediaType];
    const existingMedia = selectedGame?.[mediaType];
    
    console.log(`Rendering upload box for ${mediaType}:`, { 
      media, 
      existingMedia,
      modalType
    });
    
    return (
      <div className="games-upload-container">
        <div className="games-upload-box">
          {media?.file || media?.preview ? (
            <div className="media-preview">
              {media.preview && (
                <div className="video-wrapper">
                  <video 
                    className="upload-video-preview" 
                    src={media.preview} 
                    controls
                    preload="metadata"
                    onError={(e) => console.error(`Error loading preview for ${mediaType}:`, e)}
                  />
                  <div className="volume-indicator">
                    <FaVolumeUp /> Sound enabled
                  </div>
                </div>
              )}
              <div className="video-file-info">
                <p>{media.name}</p>
                <p>{(media.size / (1024 * 1024)).toFixed(1)}MB</p>
              </div>
              <button 
                className="media-remove-btn" 
                onClick={() => removeMedia(mediaType)}
                type="button"
              >
                <FaTimes/>
              </button>
            </div>
          ) : media?.removed ? (
            <>
              <div className="games-upload-icon">+</div>
              <input 
                type="file" 
                accept="video/mp4"
                className="games-file-input" 
                onChange={(e) => handleFileChange(e, mediaType)}
              />
              <div className="games-upload-info">
                <p>Upload {mediaLabel} Video</p>
                <p className="games-upload-size">Video removed. Upload a new one?</p>
              </div>
            </>
          ) : existingMedia && modalType === 'edit' ? (
            <div className="media-preview">
              <div className="video-wrapper">
                <video 
                  className="upload-video-preview" 
                  src={existingMedia.videoUrl} 
                  controls
                  preload="metadata"
                  onError={(e) => console.error(`Error loading existing video for ${mediaType}:`, e)}
                />
                <div className="volume-indicator">
                  <FaVolumeUp /> Sound enabled
                </div>
              </div>
              <div className="video-file-info">
                <p>{(existingMedia.originalPath || '').split('/').pop()}</p>
              </div>
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
              <div className="games-upload-icon">+</div>
              <input 
                type="file" 
                accept="video/mp4"
                className="games-file-input" 
                onChange={(e) => handleFileChange(e, mediaType)}
              />
              <div className="games-upload-info">
                <p>Upload {mediaLabel} Video</p>
                <p className="games-upload-size">MP4 format only (max: 100MB)</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderFormContent = () => {
    return (
      <div className="games-form-layout">
        <div className="games-form-three-column">
          <div className="games-form-column">
            <div className="game-section">
              <div className="game-section-title">Map Video</div>
              {renderMediaUploadBox('map', 'Map')}
            </div>

            <div className="game-section">
              <div className="game-section-title">Lesson Video</div>
              {renderMediaUploadBox('lesson', 'Lesson')}
            </div>

            <div className="game-section">
              <div className="game-section-title">Question 1 Video</div>
              {renderMediaUploadBox('question1', 'Question 1')}
            </div>

            <div className="games-form-group">
              <label>Answer 1 <span className="required-asterisk">*</span></label>
              <input 
                type="text" 
                name="answer1" 
                value={formData.answer1} 
                onChange={handleInputChange}
                placeholder="Enter Correct Answer 1"
                required
              />
            </div>

            <div className="games-form-group">
              <label>Q1 Wrong Answer 1 <span className="required-asterisk">*</span></label>
              <input 
                type="text" 
                name="q1_wrong_answer1" 
                value={formData.q1_wrong_answer1} 
                onChange={handleInputChange}
                placeholder="Enter Q1 Wrong Answer 1"
                required
              />
            </div>

            <div className="games-form-group">
              <label>Q1 Wrong Answer 2 <span style={{color: '#666', fontSize: '0.85em'}}>(Optional)</span></label>
              <input 
                type="text" 
                name="q1_wrong_answer2" 
                value={formData.q1_wrong_answer2} 
                onChange={handleInputChange}
                placeholder="Enter Q1 Wrong Answer 2 (Optional)"
              />
            </div>

            <div className="game-section">
              <div className="game-section-title">Achievement 1 Video</div>
              {renderMediaUploadBox('achievement1', 'Achievement 1')}
            </div>

            <div className="game-section">
              <div className="game-section-title">Wrong Answer Video 1</div>
              {renderMediaUploadBox('wrong_answer1', 'Wrong Answer 1')}
            </div>
          </div>
          
          <div className="games-form-column">
            <div className="game-section">
              <div className="game-section-title">Question 2 Video</div>
              {renderMediaUploadBox('question2', 'Question 2')}
            </div>

            <div className="games-form-group">
              <label>Answer 2 <span className="required-asterisk">*</span></label>
              <input 
                type="text" 
                name="answer2" 
                value={formData.answer2} 
                onChange={handleInputChange}
                placeholder="Enter Correct Answer 2"
                required
              />
            </div>

            <div className="games-form-group">
              <label>Q2 Wrong Answer 1 <span className="required-asterisk">*</span></label>
              <input 
                type="text" 
                name="q2_wrong_answer1" 
                value={formData.q2_wrong_answer1} 
                onChange={handleInputChange}
                placeholder="Enter Q2 Wrong Answer 1"
                required
              />
            </div>

            <div className="games-form-group">
              <label>Q2 Wrong Answer 2 <span style={{color: '#666', fontSize: '0.85em'}}>(Optional)</span></label>
              <input 
                type="text" 
                name="q2_wrong_answer2" 
                value={formData.q2_wrong_answer2} 
                onChange={handleInputChange}
                placeholder="Enter Q2 Wrong Answer 2 (Optional)"
              />
            </div>

            <div className="game-section">
              <div className="game-section-title">Achievement 2 Video</div>
              {renderMediaUploadBox('achievement2', 'Achievement 2')}
            </div>

            <div className="game-section">
              <div className="game-section-title">Wrong Answer Video 2</div>
              {renderMediaUploadBox('wrong_answer2', 'Wrong Answer 2')}
            </div>

            <div className="game-section">
              <div className="game-section-title">Question 3 Video</div>
              {renderMediaUploadBox('question3', 'Question 3')}
            </div>

            <div className="games-form-group">
              <label>Answer 3 <span className="required-asterisk">*</span></label>
              <input 
                type="text" 
                name="answer3" 
                value={formData.answer3} 
                onChange={handleInputChange}
                placeholder="Enter Correct Answer 3"
                required
              />
            </div>
          </div>
          
          <div className="games-form-column">
            <div className="games-form-group">
              <label>Q3 Wrong Answer 1 <span className="required-asterisk">*</span></label>
              <input 
                type="text" 
                name="q3_wrong_answer1" 
                value={formData.q3_wrong_answer1} 
                onChange={handleInputChange}
                placeholder="Enter Q3 Wrong Answer 1"
                required
              />
            </div>

            <div className="games-form-group">
              <label>Q3 Wrong Answer 2 <span style={{color: '#666', fontSize: '0.85em'}}>(Optional)</span></label>
              <input 
                type="text" 
                name="q3_wrong_answer2" 
                value={formData.q3_wrong_answer2} 
                onChange={handleInputChange}
                placeholder="Enter Q3 Wrong Answer 2 (Optional)"
              />
            </div>

            <div className="game-section">
              <div className="game-section-title">Achievement 3 Video</div>
              {renderMediaUploadBox('achievement3', 'Achievement 3')}
            </div>

            <div className="game-section">
              <div className="game-section-title">Wrong Answer Video 3</div>
              {renderMediaUploadBox('wrong_answer3', 'Wrong Answer 3')}
            </div>

            <div className="game-section">
              <div className="game-section-title">Final Achievement Video</div>
              {renderMediaUploadBox('final_achievement', 'Final Achievement')}
            </div>

            <div className="game-section">
              <div className="game-section-title">Last Map Video</div>
              {renderMediaUploadBox('last_map', 'Last Map')}
            </div>

            <div className="game-section">
              <div className="game-section-title">Outro Video</div>
              {renderMediaUploadBox('outro', 'Outro')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    switch (modalType) {
      case 'add':
        return (
          <div className="games-modal-overlay">
            <div className="games-modal">
              <div className="games-modal-header">
                <h3>Add Hard Game</h3>
                <button className="games-modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>
              <div className="games-modal-content">
                {errorMessage && (
                  <div className="games-error-message">
                    <p>{errorMessage}</p>
                  </div>
                )}
                {renderFormContent()}
              </div>
              <div className="games-modal-footer">
                <button 
                  className="games-save-btn" 
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        );
      case 'edit':
        return (
          <div className="games-modal-overlay">
            <div className="games-modal">
              <div className="games-modal-header">
                <h3>Edit Hard Game</h3>
                <button className="games-modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>
              <div className="games-modal-content">
                {errorMessage && (
                  <div className="games-error-message">
                    <p>{errorMessage}</p>
                  </div>
                )}
                {renderFormContent()}
              </div>
              <div className="games-modal-footer">
                <button 
                  className="games-save-btn" 
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        );
      case 'delete':
        return (
          <div className="games-modal-overlay">
            <div className="games-delete-modal">
              <div className="games-modal-header">
                <h3>Confirmation</h3>
                <button className="games-modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>
              <div className="games-delete-content">
                <div className="games-delete-icon">
                  <svg viewBox="0 0 24 24" width="90" height="90" fill="#0057b3">
                    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" />
                    <path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2z" />
                  </svg>
                </div>
                <p className="games-delete-message">Are you sure you want to delete this Game?</p>
                <p className="games-delete-note">This will also delete all video files from the server.</p>
                {errorMessage && (
                  <div className="games-error-message">
                    <p>{errorMessage}</p>
                  </div>
                )}
              </div>
              <div className="games-delete-actions">
                <button 
                  className="games-yes-btn" 
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Yes'}
                </button>
                <button className="games-no-btn" onClick={closeModal}>No</button>
              </div>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="games-modal-overlay">
            <div className="games-success-modal">
              <div className="games-modal-header success-header">
                <h3>Success</h3>
                <button className="games-modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>
              <div className="games-success-content">
                <div className="games-success-icon">
                  <FaCheck size={60} color="#4caf50" />
                </div>
                <p className="games-success-message">{successMessage}</p>
              </div>
              <div className="games-modal-footer">
                <button className="games-ok-btn" onClick={closeModal}>OK</button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderVideoPreviewModal = () => {
    if (!videoPreview) return null;
    
    return (
      <div className="games-modal-overlay" onClick={() => setVideoPreview(null)}>
        <div className="games-video-modal" onClick={e => e.stopPropagation()}>
          <div className="games-modal-header" style={{ backgroundColor: '#0057b3' }}>
            <h3>Video Preview</h3>
            <button className="games-modal-close" onClick={() => setVideoPreview(null)}>
              <FaTimes />
            </button>
          </div>
          <div className="games-video-content">
            {videoError ? (
              <div className="video-error-container">
                <FaExclamationTriangle size={50} color="#f44336" />
                <p>Could not load video. The file might be missing or in an unsupported format.</p>
              </div>
            ) : (
              <>
                {renderVideoPlayer(videoPreview, true)}
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

  if (isLoading && games.length === 0) {
    return (
      <div className="games-wrapper">
        <div className="games-container">
          <div className="games-header">
            <div className="games-loading">
              <div className="games-loading-spinner"></div>
              <h2>Loading...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="games-wrapper">
      <div className="games-container">
        <div className="games-header">
          <div className="games-nav-header">
            <button className="games-back-btn" onClick={() => navigate('/games')}>
              <FaChevronLeft />
            </button>
            <h2 className="games-header-title">
              {category} - {difficulty} Games
            </h2>
            <button className="games-add-btn" onClick={openAddModal}>
              <FaPlus />
            </button>
          </div>
        </div>
        <div className="games-content">
          <div className="games-list-container">
            {games.length === 0 ? (
              <div className="no-data-state">
                <div className="no-data-icon">
                  <FaExclamationTriangle size={60} color="#666" />
                </div>
                <div className="no-data-content">
                  <h3>No Games Found</h3>
                  <p>There are no games yet for <strong>{category} - {difficulty}</strong>.</p>
                  <p>Games will be saved to: uploads/{category}/{difficulty}/[game_id]/</p>
                  <button className="no-data-add-btn" onClick={openAddModal}>
                    <FaPlus /> Add Your First Game
                  </button>
                </div>
              </div>
            ) : (
              <table className="games-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Map</th>
                    <th>Lesson</th>
                    <th>Question 1</th>
                    <th>Answer 1</th>
                    <th>Q1 Wrong 1</th>
                    <th>Q1 Wrong 2</th>
                    <th>Achievement 1</th>
                    <th>Wrong Answer 1</th>
                    <th>Question 2</th>
                    <th>Answer 2</th>
                    <th>Q2 Wrong 1</th>
                    <th>Q2 Wrong 2</th>
                    <th>Achievement 2</th>
                    <th>Wrong Answer 2</th>
                    <th>Question 3</th>
                    <th>Answer 3</th>
                    <th>Q3 Wrong 1</th>
                    <th>Q3 Wrong 2</th>
                    <th>Achievement 3</th>
                    <th>Wrong Answer 3</th>
                    <th>Final Achievement</th>
                    <th>Last Map</th>
                    <th>Outro</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <tr key={game.hard_id}>
                      <td>{game.hard_id}</td>
                      <td>{renderMediaThumbnail(game.map)}</td>
                      <td>{renderMediaThumbnail(game.lesson)}</td>
                      <td>{renderMediaThumbnail(game.question1)}</td>
                      <td>{game.answer1}</td>
                      <td>{game.q1_wrong_answer1 || '-'}</td>
                      <td>{game.q1_wrong_answer2 || '-'}</td>
                      <td>{renderMediaThumbnail(game.achievement1)}</td>
                      <td>{renderMediaThumbnail(game.wrong_answer1)}</td>
                      <td>{renderMediaThumbnail(game.question2)}</td>
                      <td>{game.answer2}</td>
                      <td>{game.q2_wrong_answer1 || '-'}</td>
                      <td>{game.q2_wrong_answer2 || '-'}</td>
                      <td>{renderMediaThumbnail(game.achievement2)}</td>
                      <td>{renderMediaThumbnail(game.wrong_answer2)}</td>
                      <td>{renderMediaThumbnail(game.question3)}</td>
                      <td>{game.answer3}</td>
                      <td>{game.q3_wrong_answer1 || '-'}</td>
                      <td>{game.q3_wrong_answer2 || '-'}</td>
                      <td>{renderMediaThumbnail(game.achievement3)}</td>
                      <td>{renderMediaThumbnail(game.wrong_answer3)}</td>
                      <td>{renderMediaThumbnail(game.final_achievement)}</td>
                      <td>{renderMediaThumbnail(game.last_map)}</td>
                      <td>{renderMediaThumbnail(game.outro)}</td>
                      <td>
                        <div className="games-actions">
                          <button className="games-edit-btn" onClick={() => openEditModal(game)}>
                            <FaEdit />
                          </button>
                          <button className="games-delete-btn" onClick={() => openDeleteModal(game)}>
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
        </div>
      </div>
      {renderModal()}
      {renderVideoPreviewModal()}
    </div>
  );
};

export default GameHard;