import React, { useState, useRef, useEffect } from 'react';
import './DailyActivitiesDetails.css';
import { FaArrowLeft, FaArrowRight, FaFilePdf, FaFileExcel, FaEye, FaFilter, FaBook, FaGamepad } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const DailyActivitiesDetails = ({ onBack, onNext }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get studentID from location state, URL query params, or localStorage
  const getStudentID = () => {
    // Check if coming back from another component via location state
    if (location.state?.studentID) {
      console.log("Found studentID in location state:", location.state.studentID);
      return location.state.studentID;
    }
    
    // Try to get from URL query params as fallback
    const searchParams = new URLSearchParams(location.search);
    const urlStudentID = searchParams.get('studentID');
    if (urlStudentID) {
      console.log("Found studentID in URL params:", urlStudentID);
      return urlStudentID;
    }
    
    // Last resort - check localStorage
    const localStorageID = localStorage.getItem('currentStudentID');
    if (localStorageID) {
      console.log("Found studentID in localStorage:", localStorageID);
      return localStorageID;
    }
    
    console.log("No studentID found in any source");
    return null;
  };
  
  const initialStudentID = getStudentID();
  const [studentID, setStudentID] = useState(initialStudentID);
  const [student, setStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('dailyLessons'); // 'dailyLessons' or 'activities'
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lessonData, setLessonData] = useState([]);
  const [activitiesData, setActivitiesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filterRef = useRef(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');

  // Store studentID in localStorage for persistence
  useEffect(() => {
    if (studentID) {
      localStorage.setItem('currentStudentID', studentID);
    }
  }, [studentID]);

  // Fetch student data and related data when component mounts
  useEffect(() => {
    if (studentID) {
      console.log("useEffect triggered with studentID:", studentID);
      fetchStudent();
      fetchData();
    } else {
      setError("No student ID provided");
      setLoading(false);
    }
  }, [studentID, activeTab]);

  const fetchStudent = async () => {
    try {
      console.log("Fetching student with ID:", studentID);
      const response = await axios.get(`http://daetsnedlearning.site/backend/get_student.php?studentID=${studentID}`);
      console.log("Student API response:", response.data);
      
      if (response.data.success) {
        setStudent(response.data.student);
      } else {
        setError("Failed to fetch student details: " + response.data.message);
      }
    } catch (error) {
      console.error("Error fetching student:", error);
      setError("Error fetching student details");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'dailyLessons') {
        await fetchLessons();
      } else {
        await fetchActivities();
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
      setError(`Error fetching ${activeTab} data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      console.log("Fetching lessons for student ID:", studentID);
      
      const response = await axios.get(`http://daetsnedlearning.site/backend/getStudentProgress.php?studentID=${studentID}`);
      console.log("Lessons API response:", response.data);
      
      if (response.data.success) {
        console.log(`Found ${response.data.data.length} lessons for student ${studentID}`);
        setLessonData(response.data.data);
      } else {
        setError("Failed to fetch lessons: " + response.data.message);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
      throw error;
    }
  };

  const fetchActivities = async () => {
    try {
      console.log("Fetching activities for student ID:", studentID);
      
      const response = await axios.get(`http://daetsnedlearning.site/backend/getActivityProgress.php?studentID=${studentID}`);
      console.log("Activities API response:", response.data);
      
      if (response.data.success) {
        setActivitiesData(response.data.data);
        console.log(`Found ${response.data.data.length} activities for student ${studentID}`);
      } else {
        setError("Failed to fetch activities: " + response.data.message);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      throw error;
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

  // Navigation functions
  const navigateToPrevious = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const navigateToNext = () => {
    if (activeTab === 'dailyLessons') {
      // Switch to activities tab
      setActiveTab('activities');
    } else {
      // Navigate to DailyLesson with studentID
      if (onNext) {
        onNext(student || { studentID }, 'dailyLesson');
      } else {
        navigate('/dailyLesson', { state: { studentID } });
      }
    }
  };

  // UPDATED: Pass studentID consistently to ensure persistence
  const viewLessonDetails = (lesson) => {
    // Add console logs to debug
    console.log("viewLessonDetails called with lesson:", lesson);
    console.log("studentID in scope:", studentID);
    
    // Ensure the lesson has the studentID
    const enrichedLesson = {
      ...lesson, 
      studentID: studentID,
      name: student ? `${student.first_name} ${student.last_name}` : 'Student'
    };
    
    // Pass all lesson data including studentID and progressID to the next screen
    if (onNext) {
      console.log("Using onNext to navigate with data:", enrichedLesson);
      onNext(enrichedLesson, 'dailyLessonQuestion');
    } else {
      console.log("Using direct navigation with state:", { 
        lesson: enrichedLesson,
        studentID: studentID,
        progressID: lesson.progressID
      });
      navigate('/dailyLessonQuestionDetails', { 
        state: { 
          lesson: enrichedLesson,
          studentID: studentID,
          progressID: lesson.progressID
        } 
      });
    }
  };

  // UPDATED: Pass studentID to activities view
  const viewActivityDetails = (activity) => {
    // Ensure the activity has the studentID and student name
    const enrichedActivity = {
      ...activity, 
      studentID: studentID,
      name: student ? `${student.first_name} ${student.last_name}` : 'Student'
    };
    
    // Pass all activity data and studentID to the next screen
    if (onNext) {
      onNext(enrichedActivity, 'activitiesQuestion');
    } else {
      navigate('/activitiesQuestion', { 
        state: { 
          activity: enrichedActivity,
          studentID 
        } 
      });
    }
  };

  const applyFilter = (difficulty) => {
    setSearchTerm(difficulty.toLowerCase());
    setIsFilterOpen(false);
  };

  // Filter data based on search term and active tab
  const getFilteredData = () => {
    if (activeTab === 'dailyLessons') {
      return lessonData.filter(lesson => 
        (lesson.day?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (lesson.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (lesson.difficulty?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (lesson.date?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    } else {
      return activitiesData.filter(activity => 
        (activity.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (activity.difficulty?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (activity.date?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }
  };

  // Export functions
  const exportToPDF = () => {
    try {
      const filteredData = getFilteredData();
      const isLessons = activeTab === 'dailyLessons';
      
      // Create a new jsPDF instance in landscape orientation
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      doc.setFontSize(18);
      doc.text(`SmartStep ${isLessons ? 'Daily Lessons' : 'Activities'} - ${student?.first_name} ${student?.last_name}`, 14, 20);
      doc.setFontSize(11);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Define table columns
      const tableColumn = isLessons ? 
        ["No.", "Day", "Category", "Difficulty", "Game 1", "Game 2", "Game 3", "Time Allotment", "Score", "Attempts", "Date"] :
        ["No.", "Category", "Difficulty", "Game 1", "Game 2", "Game 3", "Time Allotment", "Score", "Attempts", "Date"];
      
      // Define table rows
      const tableRows = filteredData.map(item => {
        if (isLessons) {
          return [
            item.progressID,
            item.day,
            item.category,
            item.difficulty,
            item.game1 === null ? "N/A" : (item.game1 ? "Correct" : "Wrong"),
            item.game2 === null ? "N/A" : (item.game2 ? "Correct" : "Wrong"),
            item.game3 === null ? "N/A" : (item.game3 ? "Correct" : "Wrong"),
            item.timeAllotment,
            item.score,
            item.attempts,
            item.date
          ];
        } else {
          return [
            item.progID || "N/A",
            item.category,
            item.difficulty,
            item.game1 === null ? "N/A" : (item.game1 ? "Correct" : "Wrong"),
            item.game2 === null ? "N/A" : (item.game2 ? "Correct" : "Wrong"),
            item.game3 === null ? "N/A" : (item.game3 ? "Correct" : "Wrong"),
            item.timeAllotment,
            item.score,
            item.attempts,
            item.date
          ];
        }
      });
      
      // Use autoTable function
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: {
          fontSize: 8,
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
      
      // Save the PDF
      doc.save(`${isLessons ? 'DailyLessons' : 'Activities'}_${student?.first_name}_${student?.last_name}.pdf`);
    } catch (err) {
      console.error("Error exporting to PDF:", err);
      alert("Error exporting to PDF: " + err.message);
    }
  };

  const exportToExcel = () => {
    try {
      const filteredData = getFilteredData();
      const isLessons = activeTab === 'dailyLessons';
      
      // Prepare the data
      const excelData = filteredData.map(item => {
        if (isLessons) {
          return {
            "No.": item.progressID,
            "Day": item.day,
            "Category": item.category,
            "Difficulty": item.difficulty,
            "Game 1": item.game1 === null ? "N/A" : (item.game1 ? "Correct" : "Wrong"),
            "Game 2": item.game2 === null ? "N/A" : (item.game2 ? "Correct" : "Wrong"),
            "Game 3": item.game3 === null ? "N/A" : (item.game3 ? "Correct" : "Wrong"),
            "Time Allotment": item.timeAllotment,
            "Score": item.score,
            "Attempts": item.attempts,
            "Date": item.date
          };
        } else {
          return {
            "No.": item.progID || "N/A",
            "Category": item.category,
            "Difficulty": item.difficulty,
            "Game 1": item.game1 === null ? "N/A" : (item.game1 ? "Correct" : "Wrong"),
            "Game 2": item.game2 === null ? "N/A" : (item.game2 ? "Correct" : "Wrong"),
            "Game 3": item.game3 === null ? "N/A" : (item.game3 ? "Correct" : "Wrong"),
            "Time Allotment": item.timeAllotment,
            "Score": item.score,
            "Attempts": item.attempts,
            "Date": item.date
          };
        }
      });
      
      // Create worksheet from data
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Create workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, isLessons ? 'DailyLessons' : 'Activities');
      
      // Generate Excel file
      XLSX.writeFile(workbook, `${isLessons ? 'DailyLessons' : 'Activities'}_${student?.first_name}_${student?.last_name}.xlsx`);
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      alert("Error exporting to Excel: " + err.message);
    }
  };

  const getStudentName = () => {
    if (student) {
      return `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`;
    }
    return 'Student';
  };

  const renderDailyLessonsTable = () => {
    const filteredLessons = getFilteredData();
    
    return (
      <div className="da-table-container">
        <table className="da-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Day</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Game 1</th>
              <th>Game 2</th>
              <th>Game 3</th>
              <th>Time Allotment</th>
              <th>Score</th>
              <th>Attempts</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLessons.length > 0 ? (
              filteredLessons.map((lesson) => (
                <tr key={lesson.progressID}>
                  <td>{lesson.progressID}</td>
                  <td>{lesson.day}</td>
                  <td>{lesson.category}</td>
                  <td>{lesson.difficulty}</td>
                  <td>{lesson.game1 === null ? "N/A" : (lesson.game1 ? "✓" : "✗")}</td>
                  <td>{lesson.game2 === null ? "N/A" : (lesson.game2 ? "✓" : "✗")}</td>
                  <td>{lesson.game3 === null ? "N/A" : (lesson.game3 ? "✓" : "✗")}</td>
                  <td>{lesson.timeAllotment}</td>
                  <td>{lesson.score}</td>
                  <td>{lesson.attempts}</td>
                  <td>{lesson.date}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="view-button" onClick={() => viewLessonDetails(lesson)}>
                        <FaEye />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="12">No lessons found for this student</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderActivitiesTable = () => {
    const filteredActivities = getFilteredData();
    
    return (
      <div className="da-table-container">
        <table className="da-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Game 1</th>
              <th>Game 2</th>
              <th>Game 3</th>
              <th>Time Allotment</th>
              <th>Score</th>
              <th>Attempts</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => (
                <tr key={activity.progID || activity.id}>
                  <td>{activity.progID || "N/A"}</td>
                  <td>{activity.category}</td>
                  <td>{activity.difficulty}</td>
                  <td>{activity.game1 === null ? "N/A" : (activity.game1 ? "✓" : "✗")}</td>
                  <td>{activity.game2 === null ? "N/A" : (activity.game2 ? "✓" : "✗")}</td>
                  <td>{activity.game3 === null ? "N/A" : (activity.game3 ? "✓" : "✗")}</td>
                  <td>{activity.timeAllotment}</td>
                  <td>{activity.score}</td>
                  <td>{activity.attempts}</td>
                  <td>{activity.date}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="view-button" onClick={() => viewActivityDetails(activity)}>
                        <FaEye />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11">No activities found for this student</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="student-list-container da-wrapper">
      <div className="student-list-content da-content">
        <div className="student-list-header da-header">
          <div className="da-navigation">
            {/* Left arrow navigates to previous screen */}
            <button className="da-nav-button" onClick={navigateToPrevious}>
              <FaArrowLeft />
            </button>
            <h2>
              {activeTab === 'dailyLessons' ? 'Daily Lesson' : 'Activities'} / {getStudentName()}
            </h2>
            {/* Right arrow navigates to next screen */}
            <button className="da-nav-button" onClick={navigateToNext}>
              <FaArrowRight />
            </button>
          </div>
        </div>

        <div className="da-tabs">
          <button 
            className={`da-tab ${activeTab === 'dailyLessons' ? 'active' : ''}`} 
            onClick={() => setActiveTab('dailyLessons')}
          >
            <FaBook /> Daily Lessons
          </button>
          <button 
            className={`da-tab ${activeTab === 'activities' ? 'active' : ''}`} 
            onClick={() => setActiveTab('activities')}
          >
            <FaGamepad /> Activities
          </button>
        </div>

        <div className="student-list-controls da-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search:"
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
          <div className="export-buttons da-control-buttons">
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
              setConfirmMessage(`Are you sure you want to export ${activeTab === 'dailyLessons' ? 'Daily Lessons' : 'Activities'} as PDF?`);
              setConfirmAction(() => () => exportToPDF());
              setIsConfirmModalOpen(true);
            }}>
              <FaFilePdf className="icon" /> PDF
            </button>
            <button className="excel-button" onClick={() => {
              setExportFormat('excel');
              setConfirmMessage(`Are you sure you want to export ${activeTab === 'dailyLessons' ? 'Daily Lessons' : 'Activities'} as Excel?`);
              setConfirmAction(() => () => exportToExcel());
              setIsConfirmModalOpen(true);
            }}>
              <FaFileExcel className="icon" /> EXCEL
            </button>
          </div>
        </div>

        {loading ? (
          <div className="da-loading">Loading data...</div>
        ) : error ? (
          <div className="da-error">{error}</div>
        ) : (
          activeTab === 'dailyLessons' ? renderDailyLessonsTable() : renderActivitiesTable()
        )}
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

export default DailyActivitiesDetails;