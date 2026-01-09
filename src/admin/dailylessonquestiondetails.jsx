import React, { useState, useEffect } from 'react';
import './DailyLessonQuestionDetails.css';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const DailyLessonQuestionDetails = ({ onBack, lesson: propLesson }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [questionData, setQuestionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log("DailyLessonQuestionDetails rendered");
  console.log("Props lesson:", propLesson);
  console.log("Location state:", location.state);
  
  // Extract lesson data from props or location state
  const lesson = propLesson || location.state?.lesson || {};
  const studentID = lesson.studentID || location.state?.studentID;
  const progressID = lesson.progressID || location.state?.progressID;
  
  console.log("Extracted studentID:", studentID);
  console.log("Extracted progressID:", progressID);
  
  // Store studentID in localStorage for persistence
  useEffect(() => {
    if (studentID) {
      localStorage.setItem('currentStudentID', studentID);
    }
  }, [studentID]);

  useEffect(() => {
    console.log("useEffect running with studentID:", studentID, "progressID:", progressID);
    
    // If IDs are not in props or state, try localStorage
    const storedStudentID = !studentID ? localStorage.getItem('currentStudentID') : studentID;
    const storedProgressID = !progressID ? localStorage.getItem('currentProgressID') : progressID;
    
    console.log("Using stored IDs if needed:", { storedStudentID, storedProgressID });
    
    // Check if we have the necessary data
    if (!storedStudentID || !storedProgressID) {
      console.error("Missing required IDs:", { studentID: storedStudentID, progressID: storedProgressID });
      setError("Missing student ID or progress ID");
      setLoading(false);
      return;
    }
    
    // Store progressID in localStorage for persistence
    if (progressID) {
      localStorage.setItem('currentProgressID', progressID);
    }
    
    // Fetch the question data
    fetchQuestionData(storedStudentID, storedProgressID);
  }, [studentID, progressID]);

  const fetchQuestionData = async (studID, progID) => {
    try {
      setLoading(true);
      console.log("Fetching data with URL:", `http://daetsnedlearning.site/backend/getLessonQuestions.php?studentID=${studID}&progressID=${progID}`);
      
      const response = await axios.get(`http://daetsnedlearning.site/backend/getLessonQuestions.php?studentID=${studID}&progressID=${progID}`);
      console.log("API Response:", response.data);
      
      if (response.data.success) {
        console.log("Setting question data:", response.data.data);
        setQuestionData(response.data.data);
      } else {
        console.error("API returned error:", response.data.message);
        setError("Failed to fetch question data: " + response.data.message);
      }
    } catch (error) {
      console.error("Error fetching question data:", error);
      setError("Error fetching question data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // UPDATED: Handle back navigation properly and ensure studentID is passed
  const handleBackNavigation = () => {
    // Get the most reliable student ID
    const currentStudentID = studentID || localStorage.getItem('currentStudentID');
    console.log("Navigating back with studentID:", currentStudentID);
    
    if (onBack) {
      // If onBack prop is provided, call it with the studentID
      onBack({ studentID: currentStudentID });
    } else {
      // Navigate back to the DailyActivitiesDetails page with the studentID in query params AND state
      navigate(`/dailyActivitiesDetails?studentID=${currentStudentID}`, { 
        state: { studentID: currentStudentID }
      });
    }
  };

  const getFilteredData = () => {
    return questionData.filter(question => 
      (question.question?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (question.answer?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (question.correctAnswer?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  };

  const filteredQuestions = getFilteredData();

  // Get student name from lesson if available
  const studentName = lesson?.name || 'Student';
  const lessonCategory = lesson?.category || 'Lesson';
  const lessonDay = lesson?.day || '';

  // Helper function to format the student's answer with color indicators
  const formatStudentAnswer = (answer) => {
    if (answer === "Correct") {
      return <span className="answer-correct">{answer}</span>;
    } else if (answer === "Wrong") {
      return <span className="answer-wrong">{answer}</span>;
    }
    return answer;
  };

  // Helper function to render correct answer with fallback message
  const renderCorrectAnswer = (answer) => {
    // Handle different "missing answer" messages
    if (answer === "Not available" || 
        answer === "Answer not provided in database" ||
        answer === "No matching options provided") {
      return <span className="answer-missing">{answer}</span>;
    }
    
    // For matching type questions, answers will be comma-separated
    if (answer && answer.includes(',')) {
      // Split by comma and display as a list for better readability
      const options = answer.split(',').map(option => option.trim());
      return (
        <ul className="matching-options-list">
          {options.map((option, idx) => (
            <li key={idx}>{option}</li>
          ))}
        </ul>
      );
    }
    
    return answer;
  };

  return (
    <div className="student-list-container daily-question-wrapper">
      <div className="student-list-content daily-question-content">
        <div className="student-list-header daily-question-header">
          <div className="daily-question-navigation">
            <button className="daily-question-nav-button" onClick={handleBackNavigation}>
              <FaArrowLeft />
            </button>
            <h2>{studentName} / {lessonCategory} {lessonDay ? `(Day ${lessonDay})` : ''} Questions</h2>
          </div>
        </div>

        <div className="student-list-controls daily-question-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search:"
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="daily-question-loading">Loading questions...</div>
        ) : error ? (
          <div className="daily-question-error">{error}</div>
        ) : (
          <div className="student-table-container daily-question-table-container">
            <table className="student-table daily-question-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Question</th>
                  <th>Student Answer</th>
                  <th>Correct Answer</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.length > 0 ? (
                  filteredQuestions.map((question, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{question.question}</td>
                      <td>{formatStudentAnswer(question.answer)}</td>
                      <td>{renderCorrectAnswer(question.correctAnswer)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No questions found for this lesson</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyLessonQuestionDetails;