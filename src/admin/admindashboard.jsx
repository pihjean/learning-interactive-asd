import React, { useState, useEffect } from 'react';
import { FaUser } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './admindashboard.css';

const AdminDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('yearly');
  const [yearFilter, setYearFilter] = useState('all');
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    yearlyData: [],
    gender: {
      male: 0,
      female: 0
    },
    ageGroups: [],
    agePercentages: {},
    currentDateTime: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Toggle dropdown visibility
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Fetch data from the backend API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Replace with your actual API endpoint
        const response = await fetch('http://daetsnedlearning.site/backend/get_dashboard_data.php');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setDashboardData(result.data);
          
          // Ensure we have data for years 2025-2030
          const existingYears = result.data.yearlyData.map(item => item.year);
          const updatedYearlyData = [...result.data.yearlyData];
          
          for (let year = 2025; year <= 2030; year++) {
            const yearStr = year.toString();
            if (!existingYears.includes(yearStr)) {
              updatedYearlyData.push({
                year: yearStr,
                students: 0
              });
            }
          }
          
          // Sort by year
          updatedYearlyData.sort((a, b) => parseInt(a.year) - parseInt(b.year));
          
          // Update dashboard data with the expanded yearly data
          setDashboardData(prevData => ({
            ...prevData,
            yearlyData: updatedYearlyData
          }));
        } else {
          throw new Error(result.message || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
    
    // Refresh data every 5 minutes
    const intervalId = setInterval(fetchDashboardData, 300000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Update the current time every second
  useEffect(() => {
    const timerID = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(timerID);
    };
  }, []);

  // Format date and time
  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const formatTime = (dateObj) => {
    if (!dateObj) return '';
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  
  const formatSeconds = (dateObj) => {
    if (!dateObj) return '';
    return dateObj.getSeconds().toString().padStart(2, '0');
  };

  // Calculate percentage for donut chart
  const calculateDonutOffset = () => {
    const total = dashboardData.gender.male + dashboardData.gender.female;
    if (total === 0) return 0;
    
    const malePercentage = (dashboardData.gender.male / total) * 100;
    return malePercentage;
  };

  // Filter year options based on available data
  const yearOptions = dashboardData.yearlyData.map(item => item.year);

  // Calculate max value for Y axis in student chart
  const maxStudents = Math.max(...dashboardData.yearlyData.map(item => item.students), 10);
  const yAxisMax = Math.ceil(maxStudents / 20) * 20;

  if (loading) {
    return <div className="dash-loading">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="dash-error">Error loading dashboard: {error}</div>;
  }

  return (
    <div className="dash-wrapper">
      <div className="dash-container">
        <div className="dash-header">
          <h1 className="dash-title">Dashboard</h1>
        </div>
        
        <div className="dash-main-content">
          {/* Left section with student chart */}
          <div className="dash-chart-container">
            <div className="dash-chart-section">
              <div className="dash-chart-header">
                <h2 className="dash-chart-title">Number of Students</h2>
                <div className="dash-chart-filters">
                  <div className="dash-filter-option dash-filter-active">
                    <span className="dash-filter-dot"></span>
                    <span>Student</span>
                  </div>
                  <div className="dash-filter-option dash-year-dropdown">
                    <span onClick={() => setShowYearDropdown(!showYearDropdown)}>
                      Yearly
                      <span className="dash-dropdown-arrow">▼</span>
                    </span>
                    {showYearDropdown && yearOptions.length > 0 && (
                      <div className="dash-year-dropdown-menu">
                        {yearOptions.map(year => (
                          <div 
                            key={year} 
                            className="dash-year-option" 
                            onClick={() => {
                              setYearFilter(year);
                              setShowYearDropdown(false);
                            }}
                          >
                            {year}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="dash-chart">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={dashboardData.yearlyData.filter(item => 
                      parseInt(item.year) >= 2025 && parseInt(item.year) <= 2030
                    )}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[0, yAxisMax]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="students" 
                      stroke="#1E88E5" 
                      strokeWidth={2} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Right section with date and student count */}
          <div className="dash-side-content">
            <div className="dash-date-time">
              <div className="dash-date">{formatDate(currentTime)}</div>
              <div className="dash-time">{formatTime(currentTime)}</div>
              <div className="dash-seconds">{formatSeconds(currentTime)}</div>
            </div>
            
            <div className="dash-total-students">
              <div className="dash-student-text">
                <span className="dash-student-label">Total Number of Students:</span>
                <div className="dash-student-icon-count">
                  <FaUser className="dash-user-icon" />
                  <span className="dash-student-count">{dashboardData.totalStudents}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom row with gender and age charts */}
        <div className="dash-demographics-row">
          <div className="dash-gender-section">
            <h2 className="dash-section-title">Gender</h2>
            
            <div className="dash-gender-content">
              <div className="dash-gender-info">
                <div className="dash-gender-item">
                  <span className="dash-gender-dot female"></span>
                  <span className="dash-gender-label">Female</span>
                  <span className="dash-gender-count">{dashboardData.gender.female}</span>
                </div>
                
                <div className="dash-gender-item">
                  <span className="dash-gender-dot male"></span>
                  <span className="dash-gender-label">Male</span>
                  <span className="dash-gender-count">{dashboardData.gender.male}</span>
                </div>
              </div>
              
              <div className="dash-gender-chart">
                <div className="dash-donut-chart">
                  <svg viewBox="0 0 100 100" className="dash-donut-svg">
                    {/* Male portion */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke="#FF4081" 
                      strokeWidth="20" 
                      strokeDasharray="251.4" 
                      strokeDashoffset={0}
                    />
                    {/* Female portion */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke="#1E88E5" 
                      strokeWidth="20" 
                      strokeDasharray="251.4" 
                      strokeDashoffset={251.4 * (1 - calculateDonutOffset() / 100)}
                    />
                    <text x="50" y="55" textAnchor="middle" className="dash-donut-text">
                      {dashboardData.totalStudents}
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="dash-age-section">
            <h2 className="dash-section-title">Age</h2>
            
            <div className="dash-age-content">
              {dashboardData.ageGroups.map((ageGroup) => (
                <div className="dash-age-range" key={ageGroup.range}>
                  <div className="dash-age-label">{ageGroup.range}</div>
                  <div className="dash-age-bar-container">
                    <div 
                      className="dash-age-bar" 
                      style={{ 
                        width: `${dashboardData.agePercentages[ageGroup.range]}%` 
                      }}
                    ></div>
                  </div>
                  <div className="dash-age-count">{ageGroup.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;