import React, { useState, useEffect, useRef } from 'react';
import { FaFilePdf, FaFileExcel } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './DailyLesson.css';
import logoImage from '../assets/logo.png';

const DailyLesson = ({ student }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [lessonData, setLessonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState(null);
  
  // Ref to store interval ID
  const refreshIntervalRef = useRef(null);
  
  // Auto-refresh interval in milliseconds (5 seconds)
  const REFRESH_INTERVAL = 5000;

  // Fetch student progress data when component mounts
  useEffect(() => {
    fetchStudentProgress();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Start auto-refresh interval
  const startAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    refreshIntervalRef.current = setInterval(() => {
      fetchStudentProgress(true); // Pass true for silent refresh
    }, REFRESH_INTERVAL);
  };

  // Function to determine difficulty based on checkpoint
  const getDifficultyFromCheckpoint = (checkpoint) => {
    if (!checkpoint) return 'Unknown';
    if (checkpoint.startsWith('videolesson') || checkpoint.startsWith('easy')) return 'Easy';
    if (checkpoint.startsWith('medium')) return 'Medium';
    if (checkpoint.startsWith('hard')) return 'Hard';
    return 'Unknown';
  };

  // Function to format question result for display
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

  // Function to fetch student progress data from progress.php
  const fetchStudentProgress = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      
      const response = await fetch('https://daetsnedlearning.site/backend/progress.php?action=getAllProgress', {
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
      
      if (result.success && result.progress) {
        const transformedData = result.progress.map((progress) => {
          const difficulty = getDifficultyFromCheckpoint(progress.checkpoint);
          
          return {
            id: progress.progressID,
            progressID: progress.progressID,
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
            questions: {
              e_quest1: progress.e_quest1,
              m_quest1: progress.m_quest1,
              m_quest2: progress.m_quest2,
              h_quest1: progress.h_quest1,
              h_quest2: progress.h_quest2,
              h_quest3: progress.h_quest3
            }
          };
        });
        
        transformedData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setLessonData(transformedData);
        console.log('Transformed lesson data:', transformedData);
      } else {
        setError(result.message || 'Failed to fetch student progress data');
      }
    } catch (err) {
      setError(`Error fetching data: ${err.message}`);
      console.error('Error fetching student progress:', err);
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

  const applyFilter = (difficulty) => {
    setSearchTerm(difficulty.toLowerCase());
    setIsFilterOpen(false);
  };

  const filteredLessons = lessonData.filter(lesson => 
    (lesson.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (lesson.day?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (lesson.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (lesson.difficulty?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (lesson.checkpoint?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (lesson.date?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const prepareExport = (type) => {
    setExportType(type);
    setShowExportModal(true);
  };

  const cancelExport = () => {
    setShowExportModal(false);
    setExportType(null);
  };

  const confirmExport = () => {
    if (exportType === 'pdf') {
      exportToPDF();
    } else if (exportType === 'excel') {
      exportToExcel();
    }
    setShowExportModal(false);
    setExportType(null);
  };

  const exportToExcel = () => {
    try {
      const excelData = filteredLessons.map(lesson => ({
        'Progress ID': lesson.progressID,
        'Student ID': lesson.studentID,
        Name: lesson.name,
        Day: lesson.day,
        Category: lesson.category,
        Difficulty: lesson.difficulty,
        Checkpoint: lesson.checkpoint,
        'Easy Q1': lesson.easyQ1,
        'Medium Q1': lesson.mediumQ1,
        'Medium Q2': lesson.mediumQ2,
        'Hard Q1': lesson.hardQ1,
        'Hard Q2': lesson.hardQ2,
        'Hard Q3': lesson.hardQ3,
        Attempts: lesson.attempts,
        'Date & Time (PH)': lesson.date
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Progress');
      
      const fileName = `DAET_StudentProgress_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

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
        doc.text('Student Progress Report', 14, 54);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 60);
    
        if (searchTerm) {
          doc.text(`Filter applied: "${searchTerm}"`, 14, 66);
        }
        
        const tableData = filteredLessons.map(lesson => [
          lesson.progressID,
          lesson.studentID,
          lesson.name,
          lesson.day,
          lesson.category,
          lesson.difficulty,
          lesson.checkpoint,
          lesson.easyQ1,
          lesson.mediumQ1,
          lesson.mediumQ2,
          lesson.hardQ1,
          lesson.hardQ2,
          lesson.hardQ3,
          lesson.timeAllotment,
          lesson.attempts,
          lesson.date
        ]);
        
        const tableColumns = [
          'Progress ID', 'Student ID', 'Name', 'Day', 'Category', 'Difficulty', 'Checkpoint',
          'Easy Q1', 'Medium Q1', 'Medium Q2', 'Hard Q1', 'Hard Q2', 'Hard Q3', 
          'Time', 'Attempts', 'Date & Time (PH)'
        ];
        
        autoTable(doc, {
          head: [tableColumns],
          body: tableData,
          startY: searchTerm ? 72 : 66,
          styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' },
          headStyles: { fillColor: [0, 86, 179] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          didDrawPage: (data) => {
            doc.setFontSize(8);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
          }
        });
        
        const fileName = `DAET_StudentProgress_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
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
        doc.text('Student Progress Report', 14, 38);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 44);
    
        if (searchTerm) {
          doc.text(`Filter applied: "${searchTerm}"`, 14, 50);
        }
        
        const tableData = filteredLessons.map(lesson => [
          lesson.progressID,
          lesson.studentID,
          lesson.name,
          lesson.day,
          lesson.category,
          lesson.difficulty,
          lesson.checkpoint,
          lesson.easyQ1,
          lesson.mediumQ1,
          lesson.mediumQ2,
          lesson.hardQ1,
          lesson.hardQ2,
          lesson.hardQ3,
          lesson.timeAllotment,
          lesson.attempts,
          lesson.date
        ]);
        
        const tableColumns = [
          'Progress ID', 'Student ID', 'Name', 'Day', 'Category', 'Difficulty', 'Checkpoint',
          'Easy Q1', 'Medium Q1', 'Medium Q2', 'Hard Q1', 'Hard Q2', 'Hard Q3', 
          'Time', 'Attempts', 'Date & Time (PH)'
        ];
        
        autoTable(doc, {
          head: [tableColumns],
          body: tableData,
          startY: searchTerm ? 56 : 50,
          styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' },
          headStyles: { fillColor: [0, 86, 179] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          didDrawPage: (data) => {
            doc.setFontSize(8);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
          }
        });
        
        const fileName = `DAET_StudentProgress_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      };
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF. Please try again.');
    }
  };

  const ExportModal = () => {
    if (!showExportModal) return null;
    
    return (
      <div className="export-modal-overlay">
        <div className="export-modal">
          <h3>Export Confirmation</h3>
          <p>Are you sure you want to export {filteredLessons.length} records to {exportType === 'pdf' ? 'PDF' : 'Excel'}?</p>
          <div className="export-modal-buttons">
            <button className="export-modal-cancel" onClick={cancelExport}>Cancel</button>
            <button className="export-modal-confirm" onClick={confirmExport}>Export</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="daily-lesson-wrapper">
      <div className="daily-lesson-container">
        <div className="daily-lesson-title-container">
          <h2 className="daily-lesson-title">Lesson Progress</h2>
          <div className="daily-lesson-total">
            <span className="daily-lesson-total-label">Total:</span>
            <span className="daily-lesson-total-number">{filteredLessons.length}</span>
          </div>
        </div>

        <div className="daily-lesson-controls">
          <div className="daily-lesson-search">
            <input
              type="text"
              placeholder="Search by name, day, category, difficulty, or checkpoint..."
              value={searchTerm}
              onChange={handleSearch}
              className="daily-lesson-search-input"
            />
          </div>
          <div className="daily-lesson-buttons">
            <button className="daily-lesson-pdf-btn" onClick={() => prepareExport('pdf')}>
              <FaFilePdf /> PDF
            </button>
            <button className="daily-lesson-excel-btn" onClick={() => prepareExport('excel')}>
              <FaFileExcel /> EXCEL
            </button>
          </div>
        </div>

        <div className="daily-lesson-table-container">
          {loading ? (
            <div className="loading-message">Loading student progress data...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <table className="daily-lesson-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Day</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Checkpoint</th>
                  <th>Easy Q1</th>
                  <th>Medium Q1</th>
                  <th>Medium Q2</th>
                  <th>Hard Q1</th>
                  <th>Hard Q2</th>
                  <th>Hard Q3</th>
                  <th>Attempts</th>
                  <th>Date & Time (PH)</th>
                </tr>
              </thead>
              <tbody>
                {filteredLessons.length > 0 ? (
                  filteredLessons.map((lesson) => (
                    <tr key={lesson.progressID}>
                      <td>{lesson.studentID}</td>
                      <td>{lesson.name}</td>
                      <td>{lesson.day}</td>
                      <td>{lesson.category}</td>
                      <td>{lesson.difficulty}</td>
                      <td>{lesson.checkpoint}</td>
                      <td>{lesson.easyQ1}</td>
                      <td>{lesson.mediumQ1}</td>
                      <td>{lesson.mediumQ2}</td>
                      <td>{lesson.hardQ1}</td>
                      <td>{lesson.hardQ2}</td>
                      <td>{lesson.hardQ3}</td>
                      <td>{lesson.attempts}</td>
                      <td>{lesson.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="14" className="no-data-message">No student progress data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        <ExportModal />
      </div>
    </div>
  );
};

export default DailyLesson;