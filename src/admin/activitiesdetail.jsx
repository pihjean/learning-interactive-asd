import React, { useState, useRef, useEffect } from 'react';
import './ActivitiesDetail.css';
import { FaArrowLeft, FaArrowRight, FaFilePdf, FaFileExcel, FaEye, FaFilter } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logoImage from '../assets/logo.png';

const ActivitiesDetail = ({ onBack, onNext }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get studentID and student data from location state
  const getStudentData = () => {
    if (location.state?.studentData) {
      console.log("Found student data in location state:", location.state.studentData);
      return {
        studentID: location.state.studentID,
        studentData: location.state.studentData
      };
    }
    
    if (location.state?.studentID) {
      console.log("Found studentID in location state:", location.state.studentID);
      return { studentID: location.state.studentID, studentData: null };
    }
    
    const searchParams = new URLSearchParams(location.search);
    const urlStudentID = searchParams.get('studentID');
    if (urlStudentID) {
      console.log("Found studentID in URL params:", urlStudentID);
      return { studentID: urlStudentID, studentData: null };
    }
    
    const localStorageID = localStorage.getItem('currentStudentID');
    if (localStorageID) {
      console.log("Found studentID in localStorage:", localStorageID);
      return { studentID: localStorageID, studentData: null };
    }
    
    console.log("No studentID found in any source");
    return { studentID: null, studentData: null };
  };
  
  const { studentID: initialStudentID, studentData: initialStudentData } = getStudentData();
  const [studentID, setStudentID] = useState(initialStudentID);
  const [student, setStudent] = useState(initialStudentData);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activitiesData, setActivitiesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filterRef = useRef(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Ref to store interval ID for auto-refresh
  const refreshIntervalRef = useRef(null);
  const REFRESH_INTERVAL = 5000; // 5 seconds

  // Store studentID in localStorage for persistence
  useEffect(() => {
    if (studentID) {
      localStorage.setItem('currentStudentID', studentID);
    }
  }, [studentID]);

  // Fetch student data and activities when component mounts
  useEffect(() => {
    if (studentID) {
      console.log("useEffect triggered with studentID:", studentID);
      
      // Only fetch student if we don't already have the data
      if (!student) {
        fetchStudent();
      }
      
      fetchStudentProgress();
      
      // Start auto-refresh
      startAutoRefresh();
    } else {
      setError("No student ID provided");
      setLoading(false);
    }
    
    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [studentID]);

  // Start auto-refresh interval
  const startAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    refreshIntervalRef.current = setInterval(() => {
      fetchStudentProgress(true); // Pass true for silent refresh
    }, REFRESH_INTERVAL);
  };

  const fetchStudent = async () => {
    try {
      console.log("Fetching student with ID:", studentID);
      
      const response = await axios.get(`https://daetsnedlearning.site/backend/getStudents.php`);
      
      if (response.data.success && response.data.students) {
        const foundStudent = response.data.students.find(s => s.studentID === studentID);
        if (foundStudent) {
          setStudent(foundStudent);
          console.log("Student found:", foundStudent);
        } else {
          console.error("Student not found in response");
        }
      }
    } catch (error) {
      console.error("Error fetching student:", error);
      // Don't set error here since we can still show progress data
    }
  };

  // Function to determine difficulty based on checkpoint
  const getDifficultyFromCheckpoint = (checkpoint) => {
    if (!checkpoint) return 'Unknown';
    if (checkpoint.startsWith('videolesson') || checkpoint.startsWith('easy')) return 'Easy';
    if (checkpoint.startsWith('medium')) return 'Medium';
    if (checkpoint.startsWith('hard')) return 'Hard';
    return 'Unknown';
  };

  // Function to format question result for display (same as DailyLesson)
  const formatQuestionResult = (questionResult) => {
    switch (questionResult) {
      case 'correct':
        return 'Correct';
      case 'wrong':
        return 'Wrong';
      case 'skipped':
        return 'Skipped';
      case 'not_yet_answered':
        return 'Not yet answered';
      default:
        return 'Not yet answered';
    }
  };

  // Function to convert UTC time to Philippine time
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

  // Calculate score based on correct answers
  const calculateScore = (questions) => {
    let correct = 0;
    let total = 0;
    
    Object.values(questions).forEach(answer => {
      if (answer !== 'not_yet_answered') {
        total++;
        if (answer === 'correct') {
          correct++;
        }
      }
    });
    
    return total > 0 ? `${correct}/${total}` : '0/0';
  };
  // Function to fetch student progress data from progress.php filtered by studentID
  const fetchStudentProgress = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      
      console.log("Fetching progress for student ID:", studentID);
      
      // Fetch progress filtered by studentID using the progress.php endpoint
      const response = await fetch(`https://daetsnedlearning.site/backend/progress.php?action=getAllProgress&studentID=${studentID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Progress API Response for student:', studentID, result);
      
      if (result.success && result.progress) {
        const transformedData = result.progress.map((progress) => {
          const difficulty = getDifficultyFromCheckpoint(progress.checkpoint);
          const questions = {
            e_quest1: progress.e_quest1,
            m_quest1: progress.m_quest1,
            m_quest2: progress.m_quest2,
            h_quest1: progress.h_quest1,
            h_quest2: progress.h_quest2,
            h_quest3: progress.h_quest3
          };
          
          return {
            id: progress.progressID,
            progID: progress.progressID,
            studentID: progress.studentID,
            name: progress.studentName,
            day: progress.day,
            category: progress.category,
            difficulty: difficulty,
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
            status: progress.status || 'Not Complete',
            questions: questions
          };
        });
        
        // Sort by date (most recent first)
        transformedData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setActivitiesData(transformedData);
        console.log(`Found ${transformedData.length} activities for student ${studentID}`);
      } else {
        setError(result.message || 'Failed to fetch student progress data');
        setActivitiesData([]);
      }
    } catch (err) {
      setError(`Error fetching data: ${err.message}`);
      console.error('Error fetching student progress:', err);
      setActivitiesData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
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

  // Navigate to ActivitiesQuestionDetails when view button is clicked
  const viewDetails = (activity) => {
    const enrichedActivity = {
      ...activity, 
      studentID: studentID,
      name: student ? getStudentName() : activity.name
    };
    
    console.log("Viewing activity details with data:", enrichedActivity);
    
    if (onNext) {
      onNext(enrichedActivity, 'activitiesQuestion');
    } else {
      navigate('/activitiesQuestion', { 
        state: { 
          activity: enrichedActivity,
          studentID,
          progID: activity.progID 
        } 
      });
    }
  };

  // Navigate to previous screen (back to student list)
  const handleBackNavigation = () => {
    const currentStudentID = studentID || localStorage.getItem('currentStudentID');
    console.log("Navigating back with studentID:", currentStudentID);
    
    if (onBack) {
      onBack({ studentID: currentStudentID });
    } else {
      // Navigate back to student list
      navigate('/studentList');
    }
  };

  // Navigate to DailyLesson when right arrow is clicked
  const navigateToDailyLesson = () => {
    const currentStudentID = studentID || localStorage.getItem('currentStudentID');
    
    if (onNext) {
      onNext(student || { studentID: currentStudentID }, 'dailyLesson');
    } else {
      navigate('/dailyLesson', { 
        state: { studentID: currentStudentID }
      });
    }
  };

  const applyFilter = (difficulty) => {
    setSearchTerm(difficulty.toLowerCase());
    setIsFilterOpen(false);
  };

  // Filter activities based on search term
  const filteredActivities = activitiesData.filter(activity => 
    (activity.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (activity.difficulty?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (activity.day?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (activity.checkpoint?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (activity.date?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Export to PDF function
  const exportToPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Load and add logo
      const img = new Image();
      img.src = logoImage;
      
      img.onload = () => {
        // Get page width for centering
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Logo dimensions
        const logoWidth = 20;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        
        // Add logo centered
        doc.addImage(img, 'PNG', logoX, 10, logoWidth, logoHeight);
        
        // Add school name centered below logo
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        const schoolName = 'DAET INTEGRATED SCHOOL';
        const schoolNameWidth = doc.getTextWidth(schoolName);
        doc.text(schoolName, (pageWidth - schoolNameWidth) / 2, 35);
        
        // Add location centered below school name
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const location = 'Daet, Camarines Norte';
        const locationWidth = doc.getTextWidth(location);
        doc.text(location, (pageWidth - locationWidth) / 2, 41);
        
        // Add title
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Activities - ${getStudentName()}`, 14, 52);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 58);
        
        const tableColumn = [
          "No.", "Day", "Category", "Difficulty", "Checkpoint",
          "Easy Q1", "Med Q1", "Med Q2", "Hard Q1", "Hard Q2", "Hard Q3",
          "Attempts", "Date"
        ];
        
        const tableRows = filteredActivities.map(activity => [
          activity.progID,
          activity.day,
          activity.category,
          activity.difficulty,
          activity.checkpoint,
          activity.easyQ1,
          activity.mediumQ1,
          activity.mediumQ2,
          activity.hardQ1,
          activity.hardQ2,
          activity.hardQ3,
          activity.attempts,
          activity.date
        ]);
        
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 64,
          styles: {
            fontSize: 7,
            cellPadding: 2,
            lineColor: [200, 200, 200]
          },
          headStyles: {
            fillColor: [0, 86, 179],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          }
        });
        
        doc.save(`DAET_Activities_${getStudentName().replace(/\s+/g, '_')}.pdf`);
      };
      
      img.onerror = () => {
        console.error("Error loading logo image");
        // If logo fails to load, generate PDF without it
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        const schoolName = 'DAET INTEGRATED SCHOOL';
        const schoolNameWidth = doc.getTextWidth(schoolName);
        doc.text(schoolName, (pageWidth - schoolNameWidth) / 2, 20);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const location = 'Daet, Camarines Norte';
        const locationWidth = doc.getTextWidth(location);
        doc.text(location, (pageWidth - locationWidth) / 2, 26);
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Activities - ${getStudentName()}`, 14, 38);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 44);
        
        const tableColumn = [
          "No.", "Day", "Category", "Difficulty", "Checkpoint",
          "Easy Q1", "Med Q1", "Med Q2", "Hard Q1", "Hard Q2", "Hard Q3",
          "Attempts", "Date"
        ];
        
        const tableRows = filteredActivities.map(activity => [
          activity.progID,
          activity.day,
          activity.category,
          activity.difficulty,
          activity.checkpoint,
          activity.easyQ1,
          activity.mediumQ1,
          activity.mediumQ2,
          activity.hardQ1,
          activity.hardQ2,
          activity.hardQ3,
          activity.attempts,
          activity.date
        ]);
        
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 50,
          styles: {
            fontSize: 7,
            cellPadding: 2,
            lineColor: [200, 200, 200]
          },
          headStyles: {
            fillColor: [0, 86, 179],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          }
        });
        
        doc.save(`DAET_Activities_${getStudentName().replace(/\s+/g, '_')}.pdf`);
      };
    } catch (err) {
      console.error("Error exporting to PDF:", err);
      alert("Error exporting to PDF: " + err.message);
    }
  };

  // Export to Excel function
  const exportToExcel = () => {
    try {
      const excelData = filteredActivities.map(activity => ({
        "No.": activity.progID,
        "Day": activity.day,
        "Category": activity.category,
        "Difficulty": activity.difficulty,
        "Checkpoint": activity.checkpoint,
        "Easy Q1": activity.easyQ1,
        "Medium Q1": activity.mediumQ1,
        "Medium Q2": activity.mediumQ2,
        "Hard Q1": activity.hardQ1,
        "Hard Q2": activity.hardQ2,
        "Hard Q3": activity.hardQ3,
        "Attempts": activity.attempts,
        "Date": activity.date
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Activities');
      
      XLSX.writeFile(workbook, `Activities_${getStudentName().replace(/\s+/g, '_')}.xlsx`);
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      alert("Error exporting to Excel: " + err.message);
    }
  };

  const getStudentName = () => {
    if (student) {
      // Handle both formats (from API or from StudentList)
      const firstName = student.first_name || student.firstName;
      const middleName = student.middle_name || student.middleName;
      const lastName = student.last_name || student.lastName;
      
      return `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`;
    }
    return 'Student';
  };

  return (
    <div className="student-list-container activities-wrapper">
      <div className="student-list-content activities-content">
        <div className="student-list-header activities-header">
          <div className="activities-navigation">
            <button className="activities-nav-button" onClick={handleBackNavigation}>
              <FaArrowLeft />
            </button>
            <h2>Activities / {getStudentName()}</h2>
            <button className="activities-nav-button" onClick={navigateToDailyLesson}>
              <FaArrowRight />
            </button>
          </div>
        </div>

        <div className="student-list-controls activities-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by day, category, difficulty, or checkpoint..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
          <div className="export-buttons activities-control-buttons">
            <div className="filter-dropdown-container" ref={filterRef}>
              <button className="filter-dropdown-button" onClick={toggleFilter}>
                <FaFilter className="icon" /> Filter
              </button>
              {isFilterOpen && (
                <div className="filter-dropdown-menu">
                  <div className="filter-option" onClick={() => applyFilter('easy')}>Easy</div>
                  <div className="filter-option" onClick={() => applyFilter('medium')}>Medium</div>
                  <div className="filter-option" onClick={() => applyFilter('hard')}>Hard</div>
                </div>
              )}
            </div>
            <button className="pdf-button" onClick={() => {
              setExportFormat('pdf');
              setConfirmMessage("Are you sure you want to export as PDF?");
              setConfirmAction(() => () => exportToPDF());
              setIsConfirmModalOpen(true);
            }}>
              <FaFilePdf className="icon" /> PDF
            </button>
            <button className="excel-button" onClick={() => {
              setExportFormat('excel');
              setConfirmMessage("Are you sure you want to export as Excel?");
              setConfirmAction(() => () => exportToExcel());
              setIsConfirmModalOpen(true);
            }}>
              <FaFileExcel className="icon" /> EXCEL
            </button>
          </div>
        </div>

        <div className="activities-table-container-ad">
          {loading ? (
            <p>Loading activities...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : (
            <table className="activities-table-ad">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Day</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Checkpoint</th>
                  <th>Easy Q1</th>
                  <th>Med Q1</th>
                  <th>Med Q2</th>
                  <th>Hard Q1</th>
                  <th>Hard Q2</th>
                  <th>Hard Q3</th>
                  <th>Attempts</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity) => (
                    <tr key={activity.progID}>
                      <td>{activity.progID}</td>
                      <td>{activity.day}</td>
                      <td>{activity.category}</td>
                      <td>{activity.difficulty}</td>
                      <td>{activity.checkpoint}</td>
                      <td>{activity.easyQ1}</td>
                      <td>{activity.mediumQ1}</td>
                      <td>{activity.mediumQ2}</td>
                      <td>{activity.hardQ1}</td>
                      <td>{activity.hardQ2}</td>
                      <td>{activity.hardQ3}</td>
                      <td>{activity.attempts}</td>
                      <td>{activity.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="13">No activities found for this student</td>
                  </tr>
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
            <div className="confirm-modal-header">
              <h2>Confirmation</h2>
            </div>
            <div className="confirm-modal-content">
              <p>{confirmMessage}</p>
              <div className="confirm-modal-actions">
                <button onClick={() => setIsConfirmModalOpen(false)} className="cancel-button">
                  Cancel
                </button>
                <button onClick={() => {
                  setIsConfirmModalOpen(false);
                  confirmAction && confirmAction();
                }} className="confirm-button">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesDetail;