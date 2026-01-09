import React, { useState, useEffect } from 'react';
import { FaFilePdf, FaFileExcel, FaFilter, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './Activities.css';

const Activities = ({ student }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activitiesData, setActivitiesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState(null); // 'pdf' or 'excel'

  // Fetch activity progress data when component mounts
  useEffect(() => {
    fetchActivityProgress();
  }, []);

  // Function to fetch activity progress data from the backend
  const fetchActivityProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://daetsnedlearning.site/backend/fetchActivityProgress.php', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setActivitiesData(result.data);
      } else {
        setError(result.message || 'Failed to fetch activity progress data');
      }
    } catch (err) {
      setError(`Error fetching data: ${err.message}`);
      console.error('Error fetching activity progress:', err);
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

  // Apply filter based on difficulty
  const applyFilter = (difficulty) => {
    // Fetch all data first, then filter by difficulty
    fetchActivityProgress().then(() => {
      setSearchTerm(difficulty.toLowerCase());
    });
    setIsFilterOpen(false);
  };

  // View activity details function
  const viewActivityDetails = (activity) => {
    console.log("View activity details:", activity);
    // Ensure student name is available
    const studentName = activity.name || (student ? `${student.first_name} ${student.last_name}` : 'Student');
    
    // Navigate to activities question page with activity data and IDs
    navigate('/activitiesQuestion', { 
      state: { 
        activity: {
          ...activity,
          name: studentName
        },
        studentID: activity.studentID,
        progID: activity.progID || activity.id
      } 
    });
  };

  // Prepare to show export modal
  const prepareExport = (type) => {
    setExportType(type);
    setShowExportModal(true);
  };

  // Cancel export and close modal
  const cancelExport = () => {
    setShowExportModal(false);
    setExportType(null);
  };

  // Confirm export and process according to type
  const confirmExport = () => {
    if (exportType === 'pdf') {
      exportToPDF();
    } else if (exportType === 'excel') {
      exportToExcel();
    }
    setShowExportModal(false);
    setExportType(null);
  };

  // Filter activities based on search term
  const filteredActivities = activitiesData.filter(activity => 
    (activity.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (activity.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (activity.difficulty?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (activity.date?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    try {
      // Prepare the data for Excel format
      const excelData = filteredActivities.map(activity => ({
        ID: activity.studentID,
        Name: activity.name,
        Category: activity.category,
        Difficulty: activity.difficulty,
        'Game 1': activity.game1 === null ? "N/A" : (activity.game1 ? "Correct" : "Wrong"),
        'Game 2': activity.game2 === null ? "N/A" : (activity.game2 ? "Correct" : "Wrong"),
        'Game 3': activity.game3 === null ? "N/A" : (activity.game3 ? "Correct" : "Wrong"),
        'Time Allotment': activity.timeAllotment,
        Score: activity.score,
        Attempts: activity.attempts,
        'Date & Time': activity.date
      }));
  
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Convert data to worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Progress');
      
      // Generate Excel file and trigger download
      const fileName = `ActivityProgress_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };
  
  // Export to PDF functionality
  const exportToPDF = () => {
    try {
      // Create new PDF document in landscape orientation
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      doc.setFontSize(16);
      doc.text('Activity Progress Report', 14, 15);
      
      // Add date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
  
      // Add filter information if any
      if (searchTerm) {
        doc.text(`Filter applied: "${searchTerm}"`, 14, 28);
      }
      
      // Format data for PDF table
      const tableData = filteredActivities.map(activity => [
        activity.studentID,
        activity.name,
        activity.category,
        activity.difficulty,
        activity.game1 === null ? "N/A" : (activity.game1 ? "Correct" : "Wrong"),
        activity.game2 === null ? "N/A" : (activity.game2 ? "Correct" : "Wrong"),
        activity.game3 === null ? "N/A" : (activity.game3 ? "Correct" : "Wrong"),
        activity.timeAllotment,
        activity.score,
        activity.attempts,
        activity.date
      ]);
      
      // Define table columns
      const tableColumns = [
        'ID', 'Name', 'Category', 'Difficulty', 
        'Game 1', 'Game 2', 'Game 3', 'Time', 'Score', 
        'Attempts', 'Date & Time'
      ];
      
      // Create table in PDF
      autoTable(doc, {
        head: [tableColumns],
        body: tableData,
        startY: 35,
        styles: { 
          fontSize: 8, 
          cellPadding: 1, 
          overflow: 'linebreak'
        },
        headStyles: { fillColor: [66, 66, 66] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 35 },
        didDrawPage: (data) => {
          // Add page number at the bottom
          doc.setFontSize(8);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
        }
      });
      
      // Save PDF
      const fileName = `ActivityProgress_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF. Please try again.');
    }
  };

  // Export Modal Component
  const ExportModal = () => {
    if (!showExportModal) return null;
    
    return (
      <div className="export-modal-overlay">
        <div className="export-modal">
          <h3>Export Confirmation</h3>
          <p>Are you sure you want to export {filteredActivities.length} records to {exportType === 'pdf' ? 'PDF' : 'Excel'}?</p>
          <div className="export-modal-buttons">
            <button className="export-modal-cancel" onClick={cancelExport}>Cancel</button>
            <button className="export-modal-confirm" onClick={confirmExport}>Export</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="activities-wrapper">
      <div className="activities-container">
        <div className="activities-title-container">
          <h2 className="activities-title">Activities</h2>
          <div className="activities-total">
            <span className="activities-total-label">Total:</span>
            <span className="activities-total-number">{filteredActivities.length}</span>
          </div>
        </div>

        <div className="activities-controls">
          <div className="activities-search">
            <input
              type="text"
              placeholder="Search:"
              value={searchTerm}
              onChange={handleSearch}
              className="activities-search-input"
            />
          </div>
          <div className="activities-buttons">
            <div className="activities-filter-container">
              <button 
                className="activities-filter-btn" 
                onClick={toggleFilter}
              >
                <span>Filter</span> <FaFilter className="filter-icon" />
              </button>
              {isFilterOpen && (
                <div className="activities-filter-dropdown">
                  <div className="activities-filter-option" onClick={() => applyFilter('Easy')}>Easy</div>
                  <div className="activities-filter-option" onClick={() => applyFilter('Medium')}>Medium</div>
                  <div className="activities-filter-option" onClick={() => applyFilter('Hard')}>Hard</div>
                </div>
              )}
            </div>
            <button className="activities-pdf-btn" onClick={() => prepareExport('pdf')}>
              <FaFilePdf /> PDF
            </button>
            <button className="activities-excel-btn" onClick={() => prepareExport('excel')}>
              <FaFileExcel /> EXCEL
            </button>
          </div>
        </div>

        <div className="activities-table-container">
          {loading ? (
            <div className="loading-message">Loading activity progress data...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <table className="activities-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Game 1</th>
                  <th>Game 2</th>
                  <th>Game 3</th>
                  <th>Time Allotment</th>
                  <th>Score</th>
                  <th>Attempts</th>
                  <th>Date & Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity) => (
                    <tr key={activity.id || activity.progID}>
                      <td>{activity.studentID}</td>
                      <td>{activity.name}</td>
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
                        <div className="activities-action-buttons">
                          <button 
                            className="activities-view-button" 
                            onClick={() => viewActivityDetails(activity)}
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" className="no-data-message">No activity progress data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Export Modal */}
        <ExportModal />
      </div>
    </div>
  );
};

export default Activities;