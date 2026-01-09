import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaEdit, FaTrash, FaPlus, FaTimes, FaCheck, FaVolumeUp, FaExclamationTriangle, FaPlay } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import './VideoPresentationList.css';

const VideoLessonList = ({ onBack, lessonData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [addVideoModalOpen, setAddVideoModalOpen] = useState(false);
  const [editVideoModalOpen, setEditVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmReplaceModalOpen, setConfirmReplaceModalOpen] = useState(false);
  const [replacementVideoID, setReplacementVideoID] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Get the category from the navigation state
  const { category } = location.state || {};

  const [videoLessons, setVideoLessons] = useState([]);

  // API endpoint for video lessons
  const API_URL = 'http://daetsnedlearning.site/backend/videolesson.php';

  useEffect(() => {
    if (category) {
      fetchVideoLessons();
    }
  }, [category]);

  // Convert relative path to video handler URL
  const getVideoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_URL}?action=getVideo&file=${cleanPath}`;
  };

  const fetchVideoLessons = async () => {
    setIsLoading(true);
    try {
      console.log(`Fetching video lessons: ${API_URL}?action=getVideoLessons&category=${category}`);
      
      const response = await fetch(`${API_URL}?action=getVideoLessons&category=${category}`);
      const data = await response.json();
      
      if (data.success) {
        // Process video lessons with video URLs
        const processedVideoLessons = data.videoLessons.map(videoLesson => ({
          ...videoLesson,
          id: videoLesson.videoID, // For compatibility with existing code
          videoUrl: videoLesson.video_path ? getVideoUrl(videoLesson.video_path) : null
        }));
        
        setVideoLessons(processedVideoLessons);
        console.log('Video lessons loaded:', processedVideoLessons);
      } else {
        console.error('Failed to fetch video lessons:', data.message);
        setErrorMessage(`Failed to load video lessons: ${data.message}`);
      }
    } catch (error) {
      console.error('Error fetching video lessons:', error);
      setErrorMessage('Network error when loading video lessons.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleBackNavigation = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/games', { 
        state: { 
          category: category,
          currentView: 'options',
          selectedCategory: category
        } 
      });
    }
  };

  const handleSave = () => {
    console.log('Saving video lesson list state');
    navigate('/dashboard');
  };

  const handleAddVideo = () => {
    setSelectedVideo(null);
    setErrorMessage('');
    setAddVideoModalOpen(true);
  };

  const handleEditVideo = (video) => {
    setSelectedVideo(video);
    setErrorMessage('');
    setEditVideoModalOpen(true);
  };

  const handleDeleteVideo = (video) => {
    setSelectedVideo(video);
    setDeleteModalOpen(true);
  };

  const confirmDeleteVideo = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteVideoLesson',
          videoID: selectedVideo.videoID,
          category: category
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setDeleteModalOpen(false);
        await fetchVideoLessons(); // Refresh the list
        showSuccessMessage('Video lesson deleted successfully!');
      } else {
        setErrorMessage(result.message || 'Failed to delete video lesson');
      }
    } catch (error) {
      console.error('Error deleting video lesson:', error);
      setErrorMessage('Network error when deleting video lesson.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVideoStatus = async (video) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggleStatus',
          videoID: video.videoID,
          category: category
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchVideoLessons(); // Refresh to get updated statuses
        const statusMessage = result.inUse ? 
          'Video lesson set as active (all other video lessons in this category are now inactive)' :
          'Video lesson set as inactive';
        showSuccessMessage(statusMessage);
      } else {
        // Check if this is a conflict (another video is already active)
        if (response.status === 409) {
          setReplacementVideoID(video.videoID);
          setConfirmReplaceModalOpen(true);
          setErrorMessage(result.message);
        } else {
          setErrorMessage(result.message || 'Failed to update video lesson status');
        }
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setErrorMessage('Network error when updating status.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmReplaceActiveVideo = async () => {
    try {
      setIsLoading(true);
      
      // First, set all videos in this category to inactive
      const deactivateResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deactivateAll',
          category: category
        }),
      });

      if (!deactivateResponse.ok) {
        throw new Error('Failed to deactivate existing videos');
      }
      
      // Then activate the selected video
      const activateResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggleStatus',
          videoID: replacementVideoID,
          category: category
        }),
      });
      
      const result = await activateResponse.json();
      
      if (result.success) {
        setConfirmReplaceModalOpen(false);
        setReplacementVideoID(null);
        await fetchVideoLessons(); // Refresh to get updated statuses
        showSuccessMessage('Video lesson replaced as active successfully!');
      } else {
        setErrorMessage(result.message || 'Failed to replace active video lesson');
      }
    } catch (error) {
      console.error('Error replacing active video:', error);
      setErrorMessage('Network error when replacing active video lesson.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoUpload = async (file, isEdit = false) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Validate file
      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (fileExtension !== 'mp4') {
        throw new Error('Only MP4 video files are supported.');
      }
      
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 100) {
        throw new Error(`File size (${fileSizeMB.toFixed(1)}MB) exceeds 100MB limit.`);
      }
      
      const formData = new FormData();
      formData.append('action', isEdit ? 'updateVideoLesson' : 'addVideoLesson');
      formData.append('category', category);
      formData.append('video', file);
      
      if (isEdit && selectedVideo) {
        formData.append('videoID', selectedVideo.videoID);
      }
      
      console.log('Uploading video lesson...');
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        closeAllModals();
        await fetchVideoLessons(); // Refresh the list
        const message = isEdit ? 
          'Video lesson updated successfully!' : 
          'Video lesson added successfully!';
        showSuccessMessage(message);
      } else {
        setErrorMessage(result.message || 'Failed to upload video lesson');
      }
    } catch (error) {
      console.error('Error uploading video lesson:', error);
      setErrorMessage(error.message || 'Network error when uploading video lesson.');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setSuccessModalOpen(true);
    
    setTimeout(() => {
      setSuccessModalOpen(false);
    }, 3000);
  };

  const closeAllModals = () => {
    setAddVideoModalOpen(false);
    setEditVideoModalOpen(false);
    setDeleteModalOpen(false);
    setConfirmReplaceModalOpen(false);
    setSelectedVideo(null);
    setReplacementVideoID(null);
    setErrorMessage('');
  };

  const openVideoPreview = (videoUrl) => {
    setVideoPreview(videoUrl);
  };

  const filteredVideos = videoLessons.filter(video =>
    (video.video_path || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const titleText = lessonData 
    ? `${lessonData.day || ''} / ${lessonData.category || ''} / ${lessonData.difficulty || 'Video Lesson'}`
    : `${category || 'Category'} / Video Lesson`;

  // Add/Edit Video Modal component
  const VideoModal = ({ isEdit = false }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
      }
    };

    const handleSave = () => {
      if (selectedFile) {
        handleVideoUpload(selectedFile, isEdit);
      } else {
        setErrorMessage('Please select a video file');
      }
    };

    const handleClose = () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      closeAllModals();
    };

    return (
      <div className="video-modal-overlay">
        <div className="video-presentation-modal">
          <div className="video-modal-header">
            <h3>{isEdit ? 'Edit Video Lesson' : 'Add Video Lesson'}</h3>
            <button className="video-modal-close" onClick={handleClose}>
              <FaTimes />
            </button>
          </div>
          <div className="video-modal-content">
            {errorMessage && (
              <div className="video-error-message">
                <p>{errorMessage}</p>
              </div>
            )}
            
            <div className="video-upload-area">
              {preview ? (
                <div className="video-preview-container">
                  <video 
                    className="video-preview" 
                    src={preview}
                    controls
                    preload="metadata"
                  />
                  <div className="video-file-info">
                    <p>{selectedFile.name}</p>
                    <p>{(selectedFile.size / (1024 * 1024)).toFixed(1)}MB</p>
                  </div>
                  <button 
                    className="remove-video-btn" 
                    onClick={() => {
                      URL.revokeObjectURL(preview);
                      setPreview(null);
                      setSelectedFile(null);
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <div className="video-upload-placeholder" onClick={() => document.getElementById('video-upload').click()}>
                  <FaPlus className="upload-icon" />
                  <p>Click to upload video lesson</p>
                  <p className="upload-hint">MP4 format only (max: 100MB)</p>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/mp4"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>
            
            <div className="video-modal-footer">
              <button 
                className="video-save-btn" 
                onClick={handleSave}
                disabled={!selectedFile || isLoading}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Delete Confirmation Modal
  const DeleteModal = () => (
    <div className="video-modal-overlay">
      <div className="video-delete-modal">
        <div className="video-modal-header">
          <h3>Confirmation</h3>
          <button className="video-modal-close" onClick={closeAllModals}>
            <FaTimes />
          </button>
        </div>
        <div className="video-delete-content">
          <div className="video-delete-icon">
            <svg viewBox="0 0 24 24" width="90" height="90" fill="#0057b3">
              <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" />
              <path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2z" />
            </svg>
          </div>
          <p className="video-delete-message">Are you sure you want to delete this video lesson?</p>
          <p className="video-delete-note">This will permanently remove the video file from the server.</p>
          {errorMessage && (
            <div className="video-error-message">
              <p>{errorMessage}</p>
            </div>
          )}
        </div>
        <div className="video-delete-actions">
          <button 
            className="video-yes-btn" 
            onClick={confirmDeleteVideo}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Yes'}
          </button>
          <button className="video-no-btn" onClick={closeAllModals}>No</button>
        </div>
      </div>
    </div>
  );

  // Confirm Replace Active Video Modal
  const ConfirmReplaceModal = () => (
    <div className="video-modal-overlay">
      <div className="video-delete-modal">
        <div className="video-modal-header">
          <h3>Replace Active Video</h3>
          <button className="video-modal-close" onClick={closeAllModals}>
            <FaTimes />
          </button>
        </div>
        <div className="video-delete-content">
          <div className="video-delete-icon">
            <FaExclamationTriangle size={60} color="#ffc107" />
          </div>
          <p className="video-delete-message">Replace Current Active Video?</p>
          <p className="video-delete-note">{errorMessage}</p>
          <p className="video-delete-note">Do you want to set this video lesson as the new active one?</p>
        </div>
        <div className="video-delete-actions">
          <button 
            className="video-yes-btn" 
            onClick={confirmReplaceActiveVideo}
            disabled={isLoading}
          >
            {isLoading ? 'Replacing...' : 'Yes, Replace'}
          </button>
          <button className="video-no-btn" onClick={closeAllModals}>Cancel</button>
        </div>
      </div>
    </div>
  );

  // Success Modal
  const SuccessModal = () => (
    <div className="video-modal-overlay">
      <div className="video-success-modal">
        <div className="video-modal-header success-header">
          <h3>Success</h3>
          <button className="video-modal-close" onClick={() => setSuccessModalOpen(false)}>
            <FaTimes />
          </button>
        </div>
        <div className="video-success-content">
          <div className="video-success-icon">
            <FaCheck size={60} color="#4caf50" />
          </div>
          <p className="video-success-message">{successMessage}</p>
        </div>
        <div className="video-modal-footer">
          <button className="video-ok-btn" onClick={() => setSuccessModalOpen(false)}>OK</button>
        </div>
      </div>
    </div>
  );

  // Video Preview Modal
  const VideoPreviewModal = () => {
    if (!videoPreview) return null;
    
    return (
      <div className="video-modal-overlay" onClick={() => setVideoPreview(null)}>
        <div className="video-preview-modal" onClick={e => e.stopPropagation()}>
          <div className="video-modal-header" style={{ backgroundColor: '#0057b3' }}>
            <h3>Video Preview</h3>
            <button className="video-modal-close" onClick={() => setVideoPreview(null)}>
              <FaTimes />
            </button>
          </div>
          <div className="video-preview-content">
            <iframe 
              src={videoPreview}
              className="video-preview-iframe"
              frameBorder="0"
              allowFullScreen
              allow="autoplay"
            ></iframe>
            <div className="volume-notification">
              <FaVolumeUp /> Audio is enabled. Adjust volume as needed.
            </div>
          </div>
          <div className="video-modal-footer">
            <button className="video-close-btn" onClick={() => setVideoPreview(null)}>
              Close Preview
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading && videoLessons.length === 0) {
    return (
      <div className="video-list-wrapper">
        <div className="video-list-content">
          <div className="video-list-header">
            <div className="video-loading">
              <div className="video-loading-spinner"></div>
              <h2>Loading video lessons...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-list-wrapper">
      <div className="video-list-content">
        <div className="video-list-header">
          <div className="video-list-nav-header">
            <button className="video-list-back-btn" onClick={handleBackNavigation}>
              <FaChevronLeft />
            </button>
            <h2 className="video-list-header-title">{titleText}</h2>
          </div>
          <button className="video-add-btn" onClick={handleAddVideo}>
            <FaPlus />
          </button>
        </div>

        <div className="video-list-controls">
          <div className="video-list-search-container">
            <input
              type="text"
              placeholder="Search video lessons:"
              value={searchTerm}
              onChange={handleSearch}
              className="video-list-search-input"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="video-error-message">
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="video-list-table-container">
          {videoLessons.length === 0 ? (
            <div className="no-data-state">
              <div className="no-data-icon">
                <FaExclamationTriangle size={60} color="#666" />
              </div>
              <div className="no-data-content">
                <h3>No Video Lessons Yet</h3>
                <p>There are no video lessons for <strong>{category}</strong> category.</p>
                <p>Videos will be saved to: uploads/{category}/videolesson/</p>
                <button className="no-data-add-btn" onClick={handleAddVideo}>
                  <FaPlus /> Add Your First Video Lesson
                </button>
              </div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="no-search-results">
              <div className="no-data-icon">
                <FaExclamationTriangle size={40} color="#666" />
              </div>
              <p>No video lessons match your search term "{searchTerm}"</p>
              <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
                Clear Search
              </button>
            </div>
          ) : (
            <table className="video-list-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Video Lesson</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.map((video, index) => (
                  <tr key={video.videoID}>
                    <td>{index + 1}</td>
                    <td className="video-presentation-cell">
                      {video.videoUrl ? (
                        <div className="video-container">
                          <div 
                            className="video-thumbnail" 
                            onClick={() => openVideoPreview(video.videoUrl)}
                          >
                            <div className="video-play-button">
                              <FaPlay />
                            </div>
                            <div className="video-info">
                              <p>Click to preview</p>
                              <p className="video-filename">
                                {video.video_path ? video.video_path.split('/').pop().substring(0, 30) : 'Video file'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="no-video-placeholder">
                          <FaExclamationTriangle />
                          <p>Video not available</p>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${video.status === 'in use' ? 'active' : 'inactive'}`}>
                        {video.status === 'in use' ? 'In Use' : 'Not Use'}
                      </span>
                    </td>
                    <td className="video-list-actions">
                      <button 
                        className="video-action-btn edit-btn"
                        onClick={() => handleEditVideo(video)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="video-action-btn delete-btn"
                        onClick={() => handleDeleteVideo(video)}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                      <button 
                        className={`video-list-status-btn ${video.status === 'in use' ? 'in-use' : 'not-in-use'}`}
                        onClick={() => toggleVideoStatus(video)}
                        title={video.status === 'in use' ? 'Set as not in use' : 'Set as in use'}
                      >
                        {video.status === 'in use' ? <FaCheck /> : <FaTimes />}
                        <span>{video.status === 'in use' ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Show footer only if there's data */}
        {videoLessons.length > 0 && (
          <div className="video-list-footer">
            <div className="video-list-info">
              <p>Only one video lesson can be active per category.</p>
              <p>Active videos are used in the learning modules.</p>
              <p>Total video lessons: {videoLessons.length} | Active: {videoLessons.filter(v => v.status === 'in use').length}</p>
            </div>
            <button className="video-list-save-btn" onClick={handleSave}>Save</button>
          </div>
        )}
      </div>

      {/* Modals */}
      {addVideoModalOpen && <VideoModal isEdit={false} />}
      {editVideoModalOpen && <VideoModal isEdit={true} />}
      {deleteModalOpen && <DeleteModal />}
      {confirmReplaceModalOpen && <ConfirmReplaceModal />}
      {successModalOpen && <SuccessModal />}
      <VideoPreviewModal />
    </div>
  );
};

export default VideoLessonList;