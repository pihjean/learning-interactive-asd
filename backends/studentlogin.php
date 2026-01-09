<?php
// Set CORS headers for your frontend domain
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database credentials for Hostinger
$servername = "localhost";
$username = "u572625467_capstone_2";
$password = "Smartstep_2";
$dbname = "u572625467_smartstep";

// Error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Create connection
try {
    $conn = new mysqli($servername, $username, $password, $dbname);
    
    // Check connection
    if ($conn->connect_error) {
        sendJsonResponse([
            "success" => false, 
            "message" => "Database connection failed: " . $conn->connect_error
        ], 500);
    }
    
    // Set charset
    $conn->set_charset("utf8mb4");
    
} catch (Exception $e) {
    sendJsonResponse([
        "success" => false, 
        "message" => "Database connection error: " . $e->getMessage()
    ], 500);
}

// Handle GET request - Fetch all students
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // SQL query to get student list
        $query = "
            SELECT studentID, first_name, middle_name, last_name
            FROM studentlist
            ORDER BY first_name ASC, last_name ASC
        ";
        
        $result = $conn->query($query);
        
        if (!$result) {
            throw new Exception("Error executing query: " . $conn->error);
        }
        
        $students = [];
        
        if ($result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                // Keep studentID as string since it's VARCHAR
                $students[] = $row;
            }
        }
        
        sendJsonResponse([
            "success" => true, 
            "students" => $students,
            "count" => count($students)
        ]);
        
    } catch (Exception $e) {
        sendJsonResponse([
            "success" => false, 
            "message" => "Error fetching students: " . $e->getMessage()
        ], 500);
    }
}

// Handle POST request - Login with student ID (for future use if needed)
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Get JSON data from request
        $json_input = file_get_contents("php://input");
        if (empty($json_input)) {
            throw new Exception("No data received");
        }
        
        $data = json_decode($json_input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON data: " . json_last_error_msg());
        }
        
        // Check if studentID is provided
        if (!isset($data['studentID'])) {
            throw new Exception("Student ID is required");
        }
        
        $studentID = trim($data['studentID']);
        
        if (empty($studentID)) {
            throw new Exception("Invalid student ID");
        }
        
        // Verify student exists
        $stmt = $conn->prepare("
            SELECT studentID, first_name, middle_name, last_name 
            FROM studentlist 
            WHERE studentID = ?
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("s", $studentID);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $student = $result->fetch_assoc();
            // Keep studentID as string since it's VARCHAR
            
            sendJsonResponse([
                "success" => true, 
                "studentID" => $student['studentID'],
                "student" => $student,
                "message" => "Login successful"
            ]);
        } else {
            sendJsonResponse([
                "success" => false, 
                "message" => "Student not found with ID: " . $studentID
            ], 404);
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        sendJsonResponse([
            "success" => false, 
            "message" => "Login error: " . $e->getMessage()
        ], 400);
    }
}

// Handle unsupported methods
else {
    sendJsonResponse([
        "success" => false, 
        "message" => "Method not allowed: " . $_SERVER['REQUEST_METHOD']
    ], 405);
}

// Close the database connection
$conn->close();
?>