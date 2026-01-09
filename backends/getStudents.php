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
    // SQL query to join studentlist and guardian tables
    $query = "
        SELECT s.studentID, s.first_name, s.middle_name, s.last_name, s.age, s.sex, s.birthdate, s.address,
               g.guardianID, g.first_name AS guardian_first_name, g.middle_name AS guardian_middle_name, 
               g.last_name AS guardian_last_name, g.contact_number
        FROM studentlist s
        LEFT JOIN guardian g ON s.studentID = g.studentID
        ORDER BY s.studentID
    ";
    
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Error executing query: " . $conn->error);
    }
    
    $students = [];
    
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $students[] = $row;
        }
        
        http_response_code(200);
        echo json_encode(["success" => true, "students" => $students]);
    } else {
        http_response_code(200);
        echo json_encode(["success" => true, "students" => []]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    $conn->close();
}
?>