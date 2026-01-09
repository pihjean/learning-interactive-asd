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
        // Get questionIDs parameter and add debug info
        $questionIDs = isset($_GET['questionIDs']) ? $_GET['questionIDs'] : '';
        error_log("Received questionIDs: " . $questionIDs);
        
        if (empty($questionIDs)) {
            throw new Exception("questionIDs parameter is required");
        }
        
        // Parse question IDs from comma-separated string
        $idArray = explode(',', $questionIDs);
        
        // Filter out empty values
        $idArray = array_filter($idArray, function($value) {
            return $value !== '' && $value !== null;
        });
        
        // Sanitize the array to ensure all values are integers
        $idArray = array_map('intval', $idArray);
        
        if (empty($idArray)) {
            throw new Exception("Invalid question IDs");
        }
        
        // Prepare placeholders for the IN clause
        $placeholders = str_repeat('?,', count($idArray) - 1) . '?';
        
        // Get question details
        $query = "
            SELECT q.questionID, q.question, q.answer, q.category, q.difficulty, 
                   q.type, q.media_type, q.media_content, 
                   q.image1_content, q.image2_content, q.image3_content
            FROM questions q
            WHERE q.questionID IN ($placeholders)
        ";
        
        error_log("Query: " . $query);
        error_log("ID Array: " . implode(',', $idArray));
        
        $stmt = $conn->prepare($query);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        // Bind parameters
        if (count($idArray) > 0) {
            $types = str_repeat('i', count($idArray));
            $stmt->bind_param($types, ...$idArray);
            
            if (!$stmt->execute()) {
                throw new Exception("Execute failed: " . $stmt->error);
            }
            
            $result = $stmt->get_result();
            $questions = [];
            
            if ($result && $result->num_rows > 0) {
                while ($row = $result->fetch_assoc()) {
                    // For debugging, log basic info but not the full blob data
                    $logRow = $row;
                    $logRow['media_content'] = '[BLOB DATA]';
                    $logRow['image1_content'] = '[BLOB DATA]';
                    $logRow['image2_content'] = '[BLOB DATA]';
                    $logRow['image3_content'] = '[BLOB DATA]';
                    error_log("Found question with ID " . $row['questionID'] . ": " . json_encode($logRow));
                    
                    // Convert BLOB data to base64 strings
                    if (!empty($row['media_content'])) {
                        $row['media_content'] = base64_encode($row['media_content']);
                    }
                    if (!empty($row['image1_content'])) {
                        $row['image1_content'] = base64_encode($row['image1_content']);
                    }
                    if (!empty($row['image2_content'])) {
                        $row['image2_content'] = base64_encode($row['image2_content']);
                    }
                    if (!empty($row['image3_content'])) {
                        $row['image3_content'] = base64_encode($row['image3_content']);
                    }
                    
                    // Add to questions array
                    $questions[] = $row;
                }
                
                // Return the questions data
                $response = [
                    "success" => true, 
                    "questions" => $questions
                ];
                
                // For large data, we need to ensure proper JSON encoding
                $jsonOptions = JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR;
                $jsonResponse = json_encode($response, $jsonOptions);
                
                if ($jsonResponse === false) {
                    // Handle JSON encoding error
                    error_log("JSON encoding error: " . json_last_error_msg());
                    // Try encoding with less options
                    $jsonResponse = json_encode($response);
                    
                    if ($jsonResponse === false) {
                        // Fall back to sending a simplified response
                        $simpleQuestions = array_map(function($q) {
                            return [
                                'questionID' => $q['questionID'],
                                'question' => $q['question'],
                                'answer' => $q['answer'],
                                'category' => $q['category'],
                                'difficulty' => $q['difficulty'],
                                'type' => $q['type'],
                                'media_type' => $q['media_type'],
                                // Remove binary data from response if encoding failed
                                'media_content' => null,
                                'image1_content' => null,
                                'image2_content' => null,
                                'image3_content' => null
                            ];
                        }, $questions);
                        
                        $fallbackResponse = [
                            "success" => true,
                            "questions" => $simpleQuestions,
                            "warning" => "Media content was omitted due to encoding issues"
                        ];
                        
                        http_response_code(200);
                        echo json_encode($fallbackResponse);
                    } else {
                        http_response_code(200);
                        echo $jsonResponse;
                    }
                } else {
                    http_response_code(200);
                    echo $jsonResponse;
                }
            } else {
                error_log("No questions found with the provided IDs: " . implode(',', $idArray));
                // No questions found
                http_response_code(404);
                echo json_encode([
                    "success" => false, 
                    "message" => "No questions found with the provided IDs"
                ]);
            }
        } else {
            throw new Exception("No valid question IDs provided");
        }
        
        $stmt->close();
    } catch (Exception $e) {
        error_log("Error in fetch_questions.php: " . $e->getMessage());
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