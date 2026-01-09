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
        // Prepare and execute the query to get all activity progress
        $sql = "SELECT * FROM activity_progress ORDER BY datetime DESC";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }
        
        $progressData = [];
        
        // Fetch all records
        while ($row = $result->fetch_assoc()) {
            // Process question results based on the actual stored values
            // For game1 - handle '✓', 'check', 'correct', X, 'ekis', 'wrong', 'N/A'
            $game1 = null;
            if ($row['question1'] == '✓' || $row['question1'] == 'check' || $row['question1'] == 'correct') {
                $game1 = true;
            } elseif ($row['question1'] == 'X' || $row['question1'] == 'ekis' || $row['question1'] == 'wrong') {
                $game1 = false;
            } elseif ($row['question1'] == 'N/A' || $row['question1'] == null) {
                $game1 = null;
            }
            
            // For game2
            $game2 = null;
            if ($row['question2'] == '✓' || $row['question2'] == 'check' || $row['question2'] == 'correct') {
                $game2 = true;
            } elseif ($row['question2'] == 'X' || $row['question2'] == 'ekis' || $row['question2'] == 'wrong') {
                $game2 = false;
            } elseif ($row['question2'] == 'N/A' || $row['question2'] == null) {
                $game2 = null;
            }
            
            // For game3
            $game3 = null;
            if ($row['question3'] == '✓' || $row['question3'] == 'check' || $row['question3'] == 'correct') {
                $game3 = true;
            } elseif ($row['question3'] == 'X' || $row['question3'] == 'ekis' || $row['question3'] == 'wrong') {
                $game3 = false;
            } elseif ($row['question3'] == 'N/A' || $row['question3'] == null) {
                $game3 = null;
            }
            
            // Format date and time together as requested
            $formattedDateTime = date('Y-m-d H:i', strtotime($row['datetime']));
            
            // Add to progress data array
            $progressData[] = [
                'id' => $row['progID'],
                'studentID' => $row['studentID'],
                'name' => $row['name'],
                'category' => $row['category'],
                'difficulty' => $row['difficulty'],
                'game1' => $game1,
                'game2' => $game2,
                'game3' => $game3,
                'timeAllotment' => $row['timeallotment'],
                'score' => $row['score'],
                'attempts' => $row['attempts'],
                'date' => $formattedDateTime
            ];
        }
        
        // Success response
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Data retrieved successfully",
            "data" => $progressData
        ]);
        
    } catch (Exception $e) {
        error_log("Error in fetchActivityProgress.php: " . $e->getMessage());
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