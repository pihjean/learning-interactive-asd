<?php
// Set specific origin for better security in production
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database credentials
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "smartstep";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

// If it's a GET request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Check if studentID is provided
        if (!isset($_GET['studentID']) || empty($_GET['studentID'])) {
            throw new Exception("Student ID is required");
        }
        
        $studentID = $conn->real_escape_string($_GET['studentID']);
        
        // Prepare and execute the query to get student data
        $sql = "SELECT * FROM studentlist WHERE studentID = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $studentID);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }
        
        // Check if student exists
        if ($result->num_rows === 0) {
            throw new Exception("Student not found");
        }
        
        // Get student data
        $student = $result->fetch_assoc();
        
        // Success response
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Student retrieved successfully",
            "student" => $student
        ]);
        
    } catch (Exception $e) {
        error_log("Error in getStudent.php: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
}

// Close the database connection
$conn->close();
?>