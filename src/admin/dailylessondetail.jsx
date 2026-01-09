import React, { useState, useRef, useEffect } from 'react';
import './DailyLessonDetail.css';
import { FaArrowLeft, FaArrowRight, FaFilePdf, FaFileExcel, FaFilter } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import axios from 'axios';

const DailyLessonDetails = ({ onBack, onNext, studentData }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [studentID, setStudentID] = useState(null);
  const [student, setStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lessonData, setLessonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filterRef = useRef(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Enhanced initialization - check multiple sources including URL parameters
  useEffect(() => {
    console.log("=== Initializing DailyLessonDetails ===");
    console.log("Props studentData:", studentData);
    console.log("Location object:", location);
    console.log("Location state:", location.state);
    console.log("Location search:", location.search);
    
    let foundStudentID = null;
    let foundStudent = null;
    
    // Priority 1: Props from parent component
    if (studentData && studentData.studentID) {
      console.log("Using studentData from props");
      foundStudentID = studentData.studentID;
      foundStudent = studentData;
    }
    // Priority 2: Location state (for direct navigation)
    else if (location.state && location.state !== null) {
      // Check multiple possible structures in location.state
      if (location.state.studentID) {
        console.log("Using studentData from location state - direct");
        foundStudentID = location.state.studentID;
        foundStudent = location.state.student || location.state.studentData || location.state;
      }
      else if (location.state.student && location.state.student.studentID) {
        console.log("Using studentData from location state - nested student");
        foundStudentID = location.state.student.studentID;
        foundStudent = location.state.student;
      }
      else if (location.state.studentData && location.state.studentData.studentID) {
        console.log("Using studentData from location state - studentData property");
        foundStudentID = location.state.studentData.studentID;
        foundStudent = location.state.studentData;
      }
    }
    
    // Priority 3: URL parameters (fallback when state is null)
    if (!foundStudentID && location.search) {
      console.log("Trying URL parameters as fallback...");
      const urlParams = new URLSearchParams(location.search);
      const urlStudentID = urlParams.get('studentID');
      const urlFirstName = urlParams.get('firstName');
      const urlLastName = urlParams.get('lastName');
      const urlMiddleName = urlParams.get('middleName');
      
      if (urlStudentID) {
        console.log("Using studentID from URL parameters:", urlStudentID);
        foundStudentID = urlStudentID;
        // Reconstruct student object from URL params
        foundStudent = {
          studentID: urlStudentID,
          first_name: urlFirstName || '',
          last_name: urlLastName || '',
          middle_name: urlMiddleName || ''
        };
        console.log("Reconstructed student from URL:", foundStudent);
      }
    }
    
    // Priority 4: Session storage fallback (for persistent state)
    if (!foundStudentID) {
      try {
        const storedStudentData = sessionStorage.getItem('selectedStudent');
        if (storedStudentData) {
          const parsedStudent = JSON.parse(storedStudentData);
          if (parsedStudent && parsedStudent.studentID) {
            console.log("Using student data from session storage:", parsedStudent);
            foundStudentID = parsedStudent.studentID;
            foundStudent = parsedStudent;
          }
        }
      } catch (error) {
        console.log("Error reading from session storage:", error);
      }
    }
    
    if (foundStudentID) {
      console.log("Setting studentID:", foundStudentID);
      console.log("Setting student:", foundStudent);
      setStudentID(foundStudentID);
      setStudent(foundStudent);
      
      // Store in session storage for future use
      try {
        sessionStorage.setItem('selectedStudent', JSON.stringify(foundStudent));
      } catch (error) {
        console.log("Error storing to session storage:", error);
      }
    } else {
      console.log("No student data found anywhere");
      console.log("Location state contents:", JSON.stringify(location.state, null, 2));
      setError("No student selected. Please go back and select a student.");
      setLoading(false);
    }
  }, [studentData, location.state, location.search]);

  // Helper functions
  const getDifficultyFromCheckpoint = (checkpoint) => {
    if (!checkpoint) return 'Unknown';
    if (checkpoint.startsWith('videolesson') || checkpoint.startsWith('easy')) return 'Easy';
    if (checkpoint.startsWith('medium')) return 'Medium';
    if (checkpoint.startsWith('hard')) return 'Hard';
    return 'Unknown';
  };

  const formatQuestionResult = (questionResult) => {
    switch (questionResult) {
      case 'correct': return 'Correct';
      case 'wrong': return 'Wrong';
      case 'skipped': return 'Skipped';
      case 'not_yet_answered': return 'Not yet answered';
      default: return 'Not yet answered';
    }
  };

  const convertToPhilippineTime = (utcDateString) => {
    if (!utcDateString) return 'N/A';
    try {
      const date = new Date(utcDateString);
      const philippineTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
      return philippineTime.toLocaleString('en-PH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error converting time:', error);
      return utcDateString;
    }
  };

  // Fetch lessons when studentID is available
  useEffect(() => {
    if (studentID) {
      console.log("StudentID available, fetching lessons for:", studentID);
      fetchLessons();
    }
  }, [studentID]);

  const fetchLessons = async () => {
    if (!studentID) {
      console.log("No studentID available for fetching lessons");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch all progress data first, then filter for the specific student
      const url = `https://daetsnedlearning.site/backend/progress.php?action=getAllProgress`;
      
      console.log("Fetching lessons from URL:", url);
      console.log("Looking for studentID:", studentID);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Progress API Response:', result);
      
      if (result.success && result.progress && result.progress.length > 0) {
        console.log(`Total progress records from API: ${result.progress.length}`);
        
        // Filter progress for this specific student with exact matching
        const studentProgress = result.progress.filter(progress => {
          const exactMatch = progress.studentID === studentID;
          const stringMatch = String(progress.studentID) === String(studentID);
          const match = exactMatch || stringMatch;
          
          console.log(`Checking progress ${progress.progressID}: progress.studentID="${progress.studentID}" vs target="${studentID}" -> match=${match}`);
          return match;
        });
        
        console.log(`Filtered ${studentProgress.length} records for student ${studentID}`);
        
        if (studentProgress.length === 0) {
          console.log("No matching progress records found");
          setError(`No progress records found for student ID: "${studentID}"`);
          setLessonData([]);
          return;
        }

        // Transform the data (similar to DailyLesson component)
        const transformedData = studentProgress.map((progress) => ({
          id: progress.progressID,
          progressID: progress.progressID,
          studentID: progress.studentID,
          name: progress.studentName,
          day: progress.day,
          category: progress.category,
          difficulty: getDifficultyFromCheckpoint(progress.checkpoint),
          checkpoint: progress.checkpoint,
          easyQ1: formatQuestionResult(progress.e_quest1),
          mediumQ1: formatQuestionResult(progress.m_quest1),
          mediumQ2: formatQuestionResult(progress.m_quest2),
          hardQ1: formatQuestionResult(progress.h_quest1),
          hardQ2: formatQuestionResult(progress.h_quest2),
          hardQ3: formatQuestionResult(progress.h_quest3),
          timeAllotment: `${progress.time} min`,
          attempts: progress.attempts,
          date: convertToPhilippineTime(progress.date_time || progress.created_at),
          // Keep original question data for detailed view
          questions: {
            e_quest1: progress.e_quest1,
            m_quest1: progress.m_quest1,
            m_quest2: progress.m_quest2,
            h_quest1: progress.h_quest1,
            h_quest2: progress.h_quest2,
            h_quest3: progress.h_quest3
          }
        }));
        
        // Sort by most recent first
        transformedData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log("Transformed lesson data:", transformedData);
        setLessonData(transformedData);
        console.log(`Successfully loaded ${transformedData.length} lessons for student ${studentID}`);
      } else {
        const errorMsg = result.message || `No progress data returned from API`;
        console.log("API Error:", errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
      setError("Error fetching lesson data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const navigateToActivitiesDetail = () => {
    if (onNext) {
      onNext({ studentID: studentID, student: student }, 'activitiesDetails');
    } else {
      navigate('/activitiesDetails', { 
        state: { 
          studentID: studentID,
          student: student 
        }
      });
    }
  };
  
  const navigateToPrevious = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  // Search and filter functions
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const applyFilter = (difficulty) => {
    setSearchTerm(difficulty.toLowerCase());
    setIsFilterOpen(false);
  };

  const handleClickOutside = (event) => {
    if (filterRef.current && !filterRef.current.contains(event.target)) {
      setIsFilterOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter lessons based on search term (similar to DailyLesson component)
  const filteredLessons = lessonData.filter(lesson => 
    (lesson.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (lesson.day?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (lesson.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (lesson.difficulty?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (lesson.checkpoint?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (lesson.date?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Export functions
  const exportToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const studentName = student ? `${student.first_name} ${student.last_name}` : `Student ${studentID}`;
      
      doc.setFontSize(18);
      doc.text(`SmartStep Daily Lessons - ${studentName}`, 14, 20);
      doc.setFontSize(11);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
      
      const tableColumn = ["Progress ID", "Day", "Category", "Difficulty", "Checkpoint", "Easy Q1", "Medium Q1", "Medium Q2", "Hard Q1", "Hard Q2", "Hard Q3", "Time", "Attempts", "Date (PH)"];
      const tableRows = filteredLessons.map(lesson => [lesson.progressID, lesson.day, lesson.category, lesson.difficulty, lesson.checkpoint, lesson.easyQ1, lesson.mediumQ1, lesson.mediumQ2, lesson.hardQ1, lesson.hardQ2, lesson.hardQ3, lesson.timeAllotment, lesson.attempts, lesson.date]);
      
      autoTable(doc, {
        head: [tableColumn], body: tableRows, startY: 35,
        styles: { fontSize: 6, cellPadding: 1, lineColor: [200, 200, 200] },
        headStyles: { fillColor: [0, 86, 179], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 240, 240] }
      });
      
      doc.save(`DailyLessons_${studentName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Error exporting to PDF:", err);
      alert("Error exporting to PDF: " + err.message);
    }
  };

  const exportToExcel = () => {
    try {
      const excelData = filteredLessons.map(lesson => ({
        "Progress ID": lesson.progressID, "Student ID": lesson.studentID, "Day": lesson.day, "Category": lesson.category,
        "Difficulty": lesson.difficulty, "Checkpoint": lesson.checkpoint, "Easy Q1": lesson.easyQ1, "Medium Q1": lesson.mediumQ1,
        "Medium Q2": lesson.mediumQ2, "Hard Q1": lesson.hardQ1, "Hard Q2": lesson.hardQ2, "Hard Q3": lesson.hardQ3,
        "Time Spent": lesson.timeAllotment, "Attempts": lesson.attempts, "Date & Time (PH)": lesson.date
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DailyLessons');
      
      const studentName = student ? `${student.first_name}_${student.last_name}` : `Student_${studentID}`;
      XLSX.writeFile(workbook, `DailyLessons_${studentName}.xlsx`);
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      alert("Error exporting to Excel: " + err.message);
    }
  };

  const getStudentName = () => {
    if (student && student.first_name) {
      return `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`;
    }
    return studentID ? `Student ${studentID}` : 'Student';
  };

  // Error state
  if (!studentID && !loading) {
    return (
      <div className="student-list-container daily-lesson-wrapper">
        <div className="student-list-content daily-lesson-content">
          <div className="student-list-header daily-lesson-header">
            <div className="daily-navigation">
              <button className="daily-nav-button" onClick={navigateToPrevious}>
                <FaArrowLeft />
              </button>
              <h2>Daily Lesson</h2>
            </div>
          </div>
          <div className="error-message">
            <p>{error}</p>
            <button onClick={navigateToPrevious} className="back-button">
              Go Back to Student List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-list-container daily-lesson-wrapper">
      <div className="student-list-content daily-lesson-content">
        <div className="student-list-header daily-lesson-header">
          <div className="daily-navigation">
            <button className="daily-nav-button" onClick={navigateToPrevious}>
              <FaArrowLeft />
            </button>
            <h2>Daily Lesson / {getStudentName()}</h2>
            <button className="daily-nav-button" onClick={navigateToActivitiesDetail}>
              <FaArrowRight />
            </button>
          </div>
          <div className="daily-lesson-total">
            <span className="daily-lesson-total-label">Total:</span>
            <span className="daily-lesson-total-number">{filteredLessons.length}</span>
          </div>
        </div>

        <div className="student-list-controls daily-lesson-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name, day, category, difficulty, checkpoint, or date..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
          <div className="export-buttons daily-control-buttons">
            <div className="filter-dropdown-container" ref={filterRef}>
              <button className="filter-dropdown-button" onClick={toggleFilter}>
                <FaFilter className="icon" /> Filter
              </button>
              {isFilterOpen && (
                <div className="filter-dropdown-menu">
                  <div className="filter-option" onClick={() => applyFilter('easy')}>Easy</div>
                  <div className="filter-option" onClick={() => applyFilter('medium')}>Medium</div>
                  <div className="filter-option" onClick={() => applyFilter('hard')}>Hard</div>
                  <div className="filter-option" onClick={() => setSearchTerm('')}>Clear Filter</div>
                </div>
              )}
            </div>
            <button className="pdf-button" onClick={() => {
              setConfirmMessage("Are you sure you want to export as PDF?");
              setConfirmAction(() => () => exportToPDF());
              setIsConfirmModalOpen(true);
            }}>
              <FaFilePdf className="icon" /> PDF
            </button>
            <button className="excel-button" onClick={() => {
              setConfirmMessage("Are you sure you want to export as Excel?");
              setConfirmAction(() => () => exportToExcel());
              setIsConfirmModalOpen(true);
            }}>
              <FaFileExcel className="icon" /> EXCEL
            </button>
          </div>
        </div>

        <div className="daily-lesson-table-container-dd">
          {loading ? (
            <p>Loading lessons for {getStudentName()}...</p>
          ) : error ? (
            <div className="error-container">
              <p className="error-message">{error}</p>
              <button onClick={() => fetchLessons()} className="retry-button">Retry</button>
            </div>
          ) : (
            <table className="daily-lesson-table-dd">
              <thead>
                <tr>
                  <th>Progress ID</th><th>Student ID</th><th>Day</th><th>Category</th><th>Difficulty</th><th>Checkpoint</th>
                  <th>Easy Q1</th><th>Medium Q1</th><th>Medium Q2</th><th>Hard Q1</th><th>Hard Q2</th><th>Hard Q3</th>
                  <th>Time Spent</th><th>Attempts</th><th>Date & Time (PH)</th>
                </tr>
              </thead>
              <tbody>
                {filteredLessons.length > 0 ? (
                  filteredLessons.map((lesson) => (
                    <tr key={lesson.progressID}>
                      <td>{lesson.progressID}</td><td>{lesson.studentID}</td><td>{lesson.day}</td><td>{lesson.category}</td>
                      <td>{lesson.difficulty}</td><td>{lesson.checkpoint}</td><td>{lesson.easyQ1}</td><td>{lesson.mediumQ1}</td>
                      <td>{lesson.mediumQ2}</td><td>{lesson.hardQ1}</td><td>{lesson.hardQ2}</td><td>{lesson.hardQ3}</td>
                      <td>{lesson.timeAllotment}</td><td>{lesson.attempts}</td><td>{lesson.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="15">No lessons found for {getStudentName()}{searchTerm && ` matching "${searchTerm}"`}</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="student-modal-overlay">
          <div className="confirm-modal-container">
            <div className="confirm-modal-header"><h2>Confirmation</h2></div>
            <div className="confirm-modal-content">
              <p>{confirmMessage}</p>
              <div className="confirm-modal-actions">
                <button onClick={() => setIsConfirmModalOpen(false)} className="cancel-button">Cancel</button>
                <button onClick={() => { setIsConfirmModalOpen(false); confirmAction && confirmAction(); }} className="confirm-button">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyLessonDetails;