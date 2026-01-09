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
        // Get day parameter
        $day = isset($_GET['day']) ? $_GET['day'] : '';
        
        if (empty($day)) {
            throw new Exception("Day parameter is required");
        }
        
        // Get day information including category, difficulty, and question IDs
        $query = "
            SELECT d.dayID, d.day, d.category, d.difficulty, 
                   d.question1, d.question2, d.question3
            FROM day_questions d
            WHERE d.day = ?
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $day);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            $dayInfo = $result->fetch_assoc();
            
            // Return the day information
            http_response_code(200);
            echo json_encode([
                "success" => true, 
                "dayInfo" => $dayInfo
            ]);
        } else {
            // No data found for this day
            http_response_code(404);
            echo json_encode([
                "success" => false, 
                "message" => "No activities found for $day"
            ]);
        }
        
        $stmt->close();
    } catch (Exception $e) {
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