<?php
// Set specific origin for better security in production
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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

// If it's a POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Get the JSON data from the request
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        
        if (!$data) {
            throw new Exception("Invalid JSON data");
        }
        
        // Required fields validation
        $requiredFields = ['studentID', 'category', 'difficulty', 'questionResults', 'timeallotment', 'score', 'questionTexts'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field])) {
                throw new Exception("Missing required field: $field");
            }
        }
        
        // Get student name from studentID
        $stmt = $conn->prepare("SELECT CONCAT(first_name, ' ', middle_name, ' ', last_name) as name FROM studentlist WHERE studentID = ?");
        if (!$stmt) {
            throw new Exception("Prepare failed for name query: " . $conn->error);
        }
        
        $stmt->bind_param("s", $data['studentID']);
        if (!$stmt->execute()) {
            throw new Exception("Execute failed for name query: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            throw new Exception("Student with ID {$data['studentID']} not found");
        }
        
        $student = $result->fetch_assoc();
        $studentName = $student['name'];
        $stmt->close();
        
        // Check if there's a previous attempt for this student, category, and difficulty
        $checkStmt = $conn->prepare("SELECT attempts FROM activity_progress 
                                    WHERE studentID = ? AND category = ? AND difficulty = ?
                                    ORDER BY datetime DESC LIMIT 1");
        if (!$checkStmt) {
            throw new Exception("Prepare failed for check query: " . $conn->error);
        }
        
        $checkStmt->bind_param("sss", $data['studentID'], $data['category'], $data['difficulty']);
        if (!$checkStmt->execute()) {
            throw new Exception("Execute failed for check query: " . $checkStmt->error);
        }
        
        $checkResult = $checkStmt->get_result();
        $attempts = 1; // Default to 1 for first attempt
        
        if ($checkResult->num_rows > 0) {
            $prevAttempt = $checkResult->fetch_assoc();
            $attempts = $prevAttempt['attempts'] + 1;
        }
        
        $checkStmt->close();
        
        // Format question results
        $q1Result = isset($data['questionResults'][0]) ? $data['questionResults'][0] : 'N/A';
        $q2Result = isset($data['questionResults'][1]) ? $data['questionResults'][1] : 'N/A';
        $q3Result = isset($data['questionResults'][2]) ? $data['questionResults'][2] : 'N/A';
        
        // Get question texts
        $q1Text = isset($data['questionTexts'][0]) ? $data['questionTexts'][0] : 'N/A';
        $q2Text = isset($data['questionTexts'][1]) ? $data['questionTexts'][1] : 'N/A';
        $q3Text = isset($data['questionTexts'][2]) ? $data['questionTexts'][2] : 'N/A';
        
        // Insert progress into database - now including question text fields
        $insertStmt = $conn->prepare("INSERT INTO activity_progress 
                                    (studentID, name, category, difficulty, 
                                     question1, question2, question3, 
                                     question1_text, question2_text, question3_text,
                                     timeallotment, score, attempts, datetime) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        
        if (!$insertStmt) {
            throw new Exception("Prepare failed for insert query: " . $conn->error);
        }
        
        $insertStmt->bind_param(
            "sssssssssssii",
            $data['studentID'],
            $studentName,
            $data['category'],
            $data['difficulty'],
            $q1Result,
            $q2Result,
            $q3Result,
            $q1Text,
            $q2Text,
            $q3Text,
            $data['timeallotment'],
            $data['score'],
            $attempts
        );
        
        if (!$insertStmt->execute()) {
            throw new Exception("Execute failed for insert query: " . $insertStmt->error);
        }
        
        $insertStmt->close();
        
        // Success response
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Progress saved successfully",
            "progressID" => $conn->insert_id,
            "attempts" => $attempts
        ]);
        
    } catch (Exception $e) {
        error_log("Error in saveProgress.php: " . $e->getMessage());
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