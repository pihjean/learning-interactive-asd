import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './studentList.css';
import { FaFilePdf, FaFileExcel, FaEdit, FaEye, FaPlus, FaTimes, FaCheck } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import axios from 'axios';


import logoImage from '../assets/logo.png';

const StudentList = ({ onViewLesson }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    age: '',
    sex: 'Female',
    birthdate: '',
    address: '',
    guardianFirstName: '',
    guardianMiddleName: '',
    guardianLastName: '',
    contactNumber: ''
  });
  
  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // API base URL - Updated to use Hostinger
  const API_BASE_URL = 'https://daetsnedlearning.site/backend';

  // Fetch students data
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/getStudents.php`);
      if (response.data.success) {
        setStudents(response.data.students);
      } else {
        console.error("Failed to fetch students:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           student.studentID.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const openAddModal = () => {
    setModalMode('add');
    setSelectedStudent(null);
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      age: '',
      sex: 'Female',
      birthdate: '',
      address: '',
      guardianFirstName: '',
      guardianMiddleName: '',
      guardianLastName: '',
      contactNumber: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setModalMode('edit');
    setSelectedStudent(student);
    
    setFormData({
      firstName: student.first_name || '',
      middleName: student.middle_name || '',
      lastName: student.last_name || '',
      age: student.age || '',
      sex: student.sex || 'Female',
      birthdate: student.birthdate || '',
      address: student.address || '',
      guardianFirstName: student.guardian_first_name || '',
      guardianMiddleName: student.guardian_middle_name || '',
      guardianLastName: student.guardian_last_name || '',
      contactNumber: student.contact_number || ''
    });
    
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openExportModal = () => {
    setIsExportModalOpen(true);
  };

  const closeExportModal = () => {
    setIsExportModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    // Basic validation - check required fields
    if (!formData.firstName || !formData.lastName || !formData.age || 
        !formData.birthdate || !formData.address || 
        !formData.guardianFirstName || !formData.guardianLastName || 
        !formData.contactNumber) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert("Please fill all required fields.");
      return;
    }
    
    const confirmMsg = modalMode === 'add' 
      ? "Are you sure you want to add this student?"
      : "Are you sure you want to update this student?";
    
    setConfirmMessage(confirmMsg);
    setConfirmAction(() => () => saveStudent());
    setIsConfirmModalOpen(true);
  };

  const saveStudent = async () => {
    try {
      const url = `${API_BASE_URL}/saveStudent.php`;
      const requestData = {
        mode: modalMode,
        studentID: selectedStudent ? selectedStudent.studentID : null,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        age: formData.age,
        sex: formData.sex,
        birthdate: formData.birthdate,
        address: formData.address,
        guardianFirstName: formData.guardianFirstName,
        guardianMiddleName: formData.guardianMiddleName,
        guardianLastName: formData.guardianLastName,
        contactNumber: formData.contactNumber
      };
      
      const response = await axios.post(url, requestData);
      
      if (response.data.success) {
        alert(modalMode === 'add' ? "Student added successfully!" : "Student updated successfully!");
        closeModal();
        fetchStudents();
      } else {
        alert("Error: " + response.data.message);
      }
    } catch (error) {
      console.error("Error saving student:", error);
      alert("An error occurred while saving the student.");
    }
  };

  // Updated handleViewStudent function
  const handleViewStudent = (student) => {
    console.log("Viewing student with ID:", student.studentID);
    
    // Navigate to dailyLessonDetails with student data
    navigate('/activitiesDetails', { 
      state: { 
        studentID: student.studentID,
        studentData: {
          studentID: student.studentID,
          firstName: student.first_name,
          middleName: student.middle_name,
          lastName: student.last_name,
          age: student.age,
          sex: student.sex,
          birthdate: student.birthdate,
          address: student.address,
          guardianFirstName: student.guardian_first_name,
          guardianMiddleName: student.guardian_middle_name,
          guardianLastName: student.guardian_last_name,
          contactNumber: student.contact_number
        }
      }
    });
  };

 // Export to PDF function
 const exportToPDF = () => {
  try {
    // Create a new jsPDF instance
    const doc = new jsPDF();
    
    // Load and add logo
    const img = new Image();
    img.src = logoImage; // Use imported logo
    
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
      doc.text('Student List', 14, 56);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 62);
      
      // Define table columns
      const tableColumn = ["Student ID", "Name", "Age", "Sex", "Guardian", "Contact No."];
      
      // Define table rows
      const tableRows = filteredStudents.map(student => [
        student.studentID,
        `${student.first_name} ${student.middle_name || ''} ${student.last_name}`,
        student.age,
        student.sex,
        `${student.guardian_first_name} ${student.guardian_middle_name || ''} ${student.guardian_last_name}`,
        student.contact_number
      ]);
      
      // Use autoTable function
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 68,
        styles: {
          fontSize: 10,
          cellPadding: 3,
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
      doc.save('DAET_Integrated_School_StudentList.pdf');
      closeExportModal();
    };
    
    img.onerror = () => {
      console.error("Error loading logo image");
      // If logo fails to load, generate PDF without it
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      const schoolName = 'DAET INTEGRATED SCHOOL';
      const schoolNameWidth = doc.getTextWidth(schoolName);
      doc.text(schoolName, (pageWidth - schoolNameWidth) / 2, 20);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      const location = 'Daet, Camarines Norte';
      const locationWidth = doc.getTextWidth(location);
      doc.text(location, (pageWidth - locationWidth) / 2, 26);
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Student List', 14, 42);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 48);
      
      const tableColumn = ["Student ID", "Name", "Age", "Sex", "Guardian", "Contact No."];
      const tableRows = filteredStudents.map(student => [
        student.studentID,
        `${student.first_name} ${student.middle_name || ''} ${student.last_name}`,
        student.age,
        student.sex,
        `${student.guardian_first_name} ${student.guardian_middle_name || ''} ${student.guardian_last_name}`,
        student.contact_number
      ]);
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 54,
        styles: {
          fontSize: 10,
          cellPadding: 3,
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
      
      doc.save('DAET_Integrated_School_StudentList.pdf');
      closeExportModal();
    };
  } catch (err) {
    console.error("Error exporting to PDF:", err);
    alert("Error exporting to PDF: " + err.message);
  }
};
  // Export to Excel function
  const exportToExcel = () => {
    try {
      // Prepare the data
      const excelData = filteredStudents.map(student => ({
        "Student ID": student.studentID,
        "First Name": student.first_name,
        "Middle Name": student.middle_name || '',
        "Last Name": student.last_name,
        "Age": student.age,
        "Sex": student.sex,
        "Birthdate": student.birthdate,
        "Address": student.address,
        "Guardian Name": `${student.guardian_first_name} ${student.guardian_middle_name || ''} ${student.guardian_last_name}`,
        "Contact Number": student.contact_number
      }));
      
      // Create worksheet from data
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Create workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'StudentList');
      
      // Generate Excel file
      XLSX.writeFile(workbook, 'SmartStepStudentList.xlsx');
      closeExportModal();
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      alert("Error exporting to Excel: " + err.message);
    }
  };
  
  // Handle export based on selected format
  const handleExport = () => {
    setIsConfirmModalOpen(false);
    if (exportFormat === 'pdf') {
      exportToPDF();
    } else {
      exportToExcel();
    }
  };

  return (
    <div className="student-list-container">
      <div className="student-list-content">
        <div className="student-list-header">
          <h2>Student List</h2>
          <button className="add-button" onClick={openAddModal}><FaPlus/></button>
        </div>
        <div className="student-list-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search:"
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
          <div className="export-buttons">
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

        <div className="student-table-container">
          {loading ? (
            <p>Loading students...</p>
          ) : (
            <table className="student-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Guardian</th>
                  <th>Contact No.</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.studentID}>
                      <td>{student.studentID}</td>
                      <td>{`${student.first_name} ${student.middle_name || ''} ${student.last_name}`}</td>
                      <td>{student.age}</td>
                      <td>{student.sex}</td>
                      <td>{`${student.guardian_first_name} ${student.guardian_middle_name || ''} ${student.guardian_last_name}`}</td>
                      <td>{student.contact_number}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="edit-button" onClick={() => openEditModal(student)}><FaEdit /></button>
                          <button className="edit-button" onClick={() => handleViewStudent(student)}><FaEye /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Student Modal */}
      {isModalOpen && (
        <div className="student-modal-overlay">
          <div className="student-modal-container">
            <div className="student-modal-header">
              <h2>{modalMode === 'add' ? 'Add Student Details' : 'Edit Student Details'}</h2>
              <button className="close-button" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            
            <div className="student-modal-content">
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <h3>Personal Information</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name*</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="Enter First Name"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Middle Name</label>
                      <input
                        type="text"
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleChange}
                        placeholder="Enter Middle Name"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Last Name*</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Enter Last Name"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group small">
                      <label>Age*</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="Age"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Sex*</label>
                      <select 
                        name="sex" 
                        value={formData.sex} 
                        onChange={handleChange}
                        required
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Birthdate*</label>
                      <input
                        type="date"
                        name="birthdate"
                        value={formData.birthdate}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group full-width">
                      <label>Address*</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter Address"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="form-section">
                  <h3>Guardian Information</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name*</label>
                      <input
                        type="text"
                        name="guardianFirstName"
                        value={formData.guardianFirstName}
                        onChange={handleChange}
                        placeholder="Enter First Name"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Middle Name</label>
                      <input
                        type="text"
                        name="guardianMiddleName"
                        value={formData.guardianMiddleName}
                        onChange={handleChange}
                        placeholder="Enter Middle Name"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Last Name*</label>
                      <input
                        type="text"
                        name="guardianLastName"
                        value={formData.guardianLastName}
                        onChange={handleChange}
                        placeholder="Enter Last Name"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Contact Number*</label>
                      <input
                        className="cn-group"
                        type="text"
                        name="contactNumber"
                        value={formData.contactNumber}
                        onChange={handleChange}
                        placeholder="Enter Contact Number"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="save-button">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
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
                  <FaTimes /> Cancel
                </button>
                <button onClick={() => {
                  setIsConfirmModalOpen(false);
                  confirmAction && confirmAction();
                }} className="confirm-button">
                  <FaCheck /> Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;