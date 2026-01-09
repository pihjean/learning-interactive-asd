// student/StudentLogin.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentLogin.css";
import chibiGif from "/src/assets/Animation.gif"; // Replace with actual gif
import clickSound from "/src/assets/click_button.mp3"; // Import the click sound
import { useAudio } from "../context/AudioContext"; // Import audio context hook

function StudentLogin() {
  const [showSplash, setShowSplash] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [message, setMessage] = useState("");
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Get audio controls
  const { playAudio } = useAudio();

  // Create audio element for click sound
  const buttonClickSound = new Audio(clickSound);

  // Function to play button click sound
  const playButtonClickSound = () => {
    buttonClickSound.currentTime = 0; // Reset audio to start
    buttonClickSound.play();
  };

  const API_URL = 'https://daetsnedlearning.site/backend/studentlogin.php';

  useEffect(() => {
    // Fetch students list when component mounts
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStudentsList(data.students);
      } else {
        setMessage("Error loading student data: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Error connecting to server");
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    // Play button click sound
    playButtonClickSound();
    
    // Start playing background music when user presses Play
    playAudio();
    
    document.querySelector(".unique__splash").classList.add("slide-out");
    setTimeout(() => {
      setShowSplash(false);
      setShowLogin(true);
    }, 1000);
  };

  const handleLogin = async () => {
    // Play button click sound
    playButtonClickSound();
    
    if (!selectedStudent) {
      setMessage("Please select a student");
      return;
    }

    setLoading(true);
    
    try {
      // Find the selected student from the list
      const student = studentsList.find(s => s.studentID === selectedStudent);
      
      if (student) {
        // Navigate directly with the student ID since we already have the data
        navigate("/select-day", { 
          state: { studentID: student.studentID } 
        });
      } else {
        setMessage("Selected student not found. Please try again.");
      }
    } catch (error) {
      setMessage("Error processing login");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format student name for display
  const formatStudentName = (student) => {
    const parts = [student.first_name, student.middle_name, student.last_name].filter(Boolean);
    return parts.join(' ');
  };

  return (
    <div className="unique__container">
      {showSplash && (
        <div className="unique__splash">
          <h3 className="unique__splash-subtitle">Welcome to</h3>
          <h1 className="unique__splash-title">Smart Step</h1>
          <img
            src={chibiGif}
            alt="cute-chibi"
            className="unique__chibi-animation"
          />
          <button className="unique__play-button" onClick={handlePlay}>
            ▶ Play
          </button>
        </div>
      )}

      {showLogin && (
        <div className="unique__login-wrapper fade-in">
          <div className="unique__login-box">
            <div className="unique__login-header">SMART STEP</div>
            <div className="unique__icon-container">
              <img
                src="https://cdn-icons-png.flaticon.com/512/847/847969.png"
                alt="user-icon"
                className="unique__icon"
              />
            </div>
            
            <select
              className="unique__dropdown"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              disabled={loading || studentsList.length === 0}
            >
              <option value="">
                {loading ? "Loading students..." : 
                 studentsList.length === 0 ? "No students available" : 
                 "Select a student"}
              </option>
              {studentsList.map((student) => (
                <option key={student.studentID} value={student.studentID}>
                  {formatStudentName(student)}
                </option>
              ))}
            </select>

            {message && <div className="unique__message">{message}</div>}
            
            <button 
              className="unique__login-button" 
              onClick={handleLogin}
              disabled={loading || !selectedStudent}
            >
              {loading ? "LOADING..." : "LOGIN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentLogin;