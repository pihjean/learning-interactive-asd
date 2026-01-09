<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

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

// Get request method to determine the operation
$method = $_SERVER['REQUEST_METHOD'];

try {
    // For POST request (save operations)
    if ($method === 'POST') {
        // Get JSON data
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['action'])) {
            throw new Exception("Missing action parameter");
        }
        
        // Handle action
        switch ($data['action']) {
            case 'save_day_questions':
                saveAssignedQuestions($conn, $data);
                break;
            default:
                throw new Exception("Unknown action: " . $data['action']);
        }
    }
    // For GET request (fetch operations)
    elseif ($method === 'GET') {
        if (!isset($_GET['action'])) {
            throw new Exception("Missing action parameter");
        }
        
        // Handle action
        switch ($_GET['action']) {
            case 'fetch_assignments':
                fetchAssignedCategories($conn);
                break;
            case 'fetch_questions':
                if (!isset($_GET['category']) || !isset($_GET['difficulty'])) {
                    throw new Exception("Missing category or difficulty parameter");
                }
                fetchQuestions($conn, $_GET['category'], $_GET['difficulty']);
                break;
            case 'fetch_day_questions':
                if (!isset($_GET['day']) || !isset($_GET['category']) || !isset($_GET['difficulty'])) {
                    throw new Exception("Missing day, category or difficulty parameter");
                }
                fetchDayQuestions($conn, $_GET['day'], $_GET['category'], $_GET['difficulty']);
                break;
            default:
                throw new Exception("Unknown action: " . $_GET['action']);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    $conn->close();
}

// Function to save assigned questions
function saveAssignedQuestions($conn, $data) {
    // Validate required parameters
    if (!isset($data['day']) || !isset($data['category']) || !isset($data['difficulty'])) {
        throw new Exception("Missing required parameters");
    }
    
    // Extract data
    $day = $conn->real_escape_string($data['day']);
    $category = $conn->real_escape_string($data['category']);
    $difficulty = $conn->real_escape_string($data['difficulty']);
    $question1 = isset($data['question1']) ? $data['question1'] : null;
    $question2 = isset($data['question2']) ? $data['question2'] : null;
    $question3 = isset($data['question3']) ? $data['question3'] : null;
    
    // Prepare SQL query
    $sql = "INSERT INTO day_questions (day, category, difficulty, question1, question2, question3) 
            VALUES ('$day', '$category', '$difficulty', " . 
            ($question1 !== null ? $question1 : "NULL") . ", " . 
            ($question2 !== null ? $question2 : "NULL") . ", " . 
            ($question3 !== null ? $question3 : "NULL") . ") 
            ON DUPLICATE KEY UPDATE 
            question1 = " . ($question1 !== null ? $question1 : "NULL") . ", 
            question2 = " . ($question2 !== null ? $question2 : "NULL") . ", 
            question3 = " . ($question3 !== null ? $question3 : "NULL");
    
    // Execute query
    if ($conn->query($sql) === TRUE) {
        echo json_encode(["success" => true, "message" => "Questions assigned successfully"]);
    } else {
        throw new Exception("Error assigning questions: " . $conn->error);
    }
}

// Function to fetch all assigned categories by day
function fetchAssignedCategories($conn) {
    $sql = "SELECT day, category FROM day_questions GROUP BY day, category";
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Error fetching assigned categories: " . $conn->error);
    }
    
    $assignments = [];
    
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $assignments[] = $row;
        }
    }
    
    echo json_encode(["success" => true, "assignments" => $assignments]);
}

// Function to fetch questions by category and difficulty
function fetchQuestions($conn, $category, $difficulty) {
    $category = $conn->real_escape_string($category);
    $difficulty = $conn->real_escape_string($difficulty);
    
    $sql = "SELECT * FROM questions WHERE category = '$category' AND difficulty = '$difficulty'";
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Error fetching questions: " . $conn->error);
    }
    
    $questions = [];
    
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            // Convert binary data to base64 for frontend display
            if ($row['media_content'] !== null) {
                $row['media_content'] = base64_encode($row['media_content']);
            }
            if ($row['image1_content'] !== null) {
                $row['image1_content'] = base64_encode($row['image1_content']);
            }
            if ($row['image2_content'] !== null) {
                $row['image2_content'] = base64_encode($row['image2_content']);
            }
            if ($row['image3_content'] !== null) {
                $row['image3_content'] = base64_encode($row['image3_content']);
            }
            
            $questions[] = $row;
        }
    }
    
    echo json_encode(["success" => true, "questions" => $questions]);
}

// Function to fetch assigned questions for a specific day, category, and difficulty
function fetchDayQuestions($conn, $day, $category, $difficulty) {
    $day = $conn->real_escape_string($day);
    $category = $conn->real_escape_string($category);
    $difficulty = $conn->real_escape_string($difficulty);
    
    $sql = "SELECT * FROM day_questions WHERE day = '$day' AND category = '$category' AND difficulty = '$difficulty'";
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Error fetching day questions: " . $conn->error);
    }
    
    if ($result->num_rows > 0) {
        $assignment = $result->fetch_assoc();
        echo json_encode(["success" => true, "assignment" => $assignment]);
    } else {
        echo json_encode(["success" => true, "assignment" => null]);
    }
}
?>