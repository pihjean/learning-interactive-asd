import React from 'react';
import { useNavigate } from 'react-router-dom';
import './mainpage.css'; // Ensure this CSS file exists
import logo from '/src/assets/logo.png';

function MainPage() {
  const navigate = useNavigate();

  return (
    <div className="main-container-mp">
      <div className="card-container-mp">
        <div className="logo-container-mp">
          <img src={logo} alt="Logo" className="main-logo-mp" />
        </div>
        <h2 className="main-title-mp">Welcome to Learning Platform</h2>
        <p className="main-subtitle-mp">Please select your role to continue</p>
        <div className="role-buttons-mp">
          <button className="role-button-mp student-btn" onClick={() => navigate('/student-login')}>
            I am a Student
          </button>
          <button className="role-button-mp admin-btn" onClick={() => navigate('/login')}>
            I am an Admin
          </button>
        </div>
      </div>
    </div>
  );
}

export default MainPage;
