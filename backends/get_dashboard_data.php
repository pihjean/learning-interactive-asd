<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database credentials
$servername = "localhost";
$username = "u572625467_capstone_2";
$password = "Smartstep_2";
$dbname = "u572625467_smartstep";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

try {
    // Get total number of students
    $totalStudentsQuery = "SELECT COUNT(*) as total FROM studentlist";
    $totalResult = $conn->query($totalStudentsQuery);
    $totalStudents = $totalResult->fetch_assoc()['total'];
    
    // Get students per year (from 2025 onwards)
    $currentYear = date('Y');
    $yearData = [];
    
    // Get data from 2025 to current year
    for ($year = 2025; $year <= $currentYear; $year++) {
        $yearQuery = "SELECT COUNT(*) as count FROM studentlist WHERE YEAR(created_at) = $year";
        $yearResult = $conn->query($yearQuery);
        $yearCount = $yearResult->fetch_assoc()['count'];
        $yearData[] = ["year" => (string)$year, "students" => (int)$yearCount];
    }
    
    // Get gender distribution
    $genderQuery = "SELECT sex, COUNT(*) as count FROM studentlist GROUP BY sex";
    $genderResult = $conn->query($genderQuery);
    $maleCount = 0;
    $femaleCount = 0;
    
    while ($row = $genderResult->fetch_assoc()) {
        if (strtolower($row['sex']) === 'male') {
            $maleCount = (int)$row['count'];
        } else if (strtolower($row['sex']) === 'female') {
            $femaleCount = (int)$row['count'];
        }
    }
    
    // Get age distribution
    $ageGroups = [
        "5-10" => 0,
        "11-15" => 0,
        "16-20" => 0,
        "21-24" => 0
    ];
    
    $ageQuery = "SELECT age FROM studentlist";
    $ageResult = $conn->query($ageQuery);
    
    while ($row = $ageResult->fetch_assoc()) {
        $age = (int)$row['age'];
        
        if ($age >= 5 && $age <= 10) {
            $ageGroups["5-10"]++;
        } else if ($age >= 11 && $age <= 15) {
            $ageGroups["11-15"]++;
        } else if ($age >= 16 && $age <= 20) {
            $ageGroups["16-20"]++;
        } else if ($age >= 21 && $age <= 24) {
            $ageGroups["21-24"]++;
        }
    }
    
    $ageData = [];
    foreach ($ageGroups as $range => $count) {
        $ageData[] = [
            "range" => $range,
            "count" => $count
        ];
    }
    
    // Calculate percentages for age groups
    $totalInAgeGroups = array_sum($ageGroups);
    $agePercentages = [];
    
    foreach ($ageGroups as $range => $count) {
        $percentage = $totalInAgeGroups > 0 ? ($count / $totalInAgeGroups) * 100 : 0;
        $agePercentages[$range] = round($percentage, 1);
    }
    
    // Set timezone to Philippine time (PHT/Manila)
    date_default_timezone_set('Asia/Manila');
    
    // Return all data as JSON
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "data" => [
            "totalStudents" => $totalStudents,
            "yearlyData" => $yearData,
            "gender" => [
                "male" => $maleCount,
                "female" => $femaleCount
            ],
            "ageGroups" => $ageData,
            "agePercentages" => $agePercentages,
            "currentDateTime" => date('Y-m-d H:i:s')
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    $conn->close();
}
?>