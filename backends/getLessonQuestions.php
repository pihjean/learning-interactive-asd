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

// Enable error logging to PHP error log
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// If it's a GET request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Check if studentID and progressID are provided
        if (!isset($_GET['studentID']) || empty($_GET['studentID'])) {
            throw new Exception("Student ID is required");
        }
        
        if (!isset($_GET['progressID']) || empty($_GET['progressID'])) {
            throw new Exception("Progress ID is required");
        }
        
        $studentID = $conn->real_escape_string($_GET['studentID']);
        $progressID = $conn->real_escape_string($_GET['progressID']);
        
        // Step 1: Get questions from studentprogress
        $sql = "SELECT question1_text, question2_text, question3_text, question1, question2, question3 
                FROM studentprogress 
                WHERE studentID = ? AND progressID = ?";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ss", $studentID, $progressID);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            throw new Exception("No progress data found");
        }
        
        $progressRow = $result->fetch_assoc();
        $stmt->close();
        
        // Initialize the questions array
        $questionsData = [];
        
        // Process each question
        for ($i = 1; $i <= 3; $i++) {
            $questionTextColumn = "question{$i}_text";
            $userAnswerColumn = "question{$i}";
            
            // Skip if columns don't exist or question is empty
            if (!array_key_exists($questionTextColumn, $progressRow) || 
                !array_key_exists($userAnswerColumn, $progressRow) ||
                empty($progressRow[$questionTextColumn])) {
                continue;
            }
            
            $questionText = $progressRow[$questionTextColumn];
            $userAnswer = $progressRow[$userAnswerColumn];
            
            // Format user answer for display
            $formattedUserAnswer = $userAnswer;
            if ($userAnswer === "✓") {
                $formattedUserAnswer = "Correct";
            } elseif ($userAnswer === "X") {
                $formattedUserAnswer = "Wrong";
            }
            
            // Step 2: Find the matching question in questions table
            // Initial default value
            $correctAnswer = "Not available";
            
            // Try exact match first - get all needed columns including category and uid columns
            $questionSql = "SELECT questionID, answer, category, uid1, uid2, uid3 FROM questions WHERE question = ? LIMIT 1";
            $questionStmt = $conn->prepare($questionSql);
            $questionStmt->bind_param("s", $questionText);
            $questionStmt->execute();
            $questionResult = $questionStmt->get_result();
            
            // Check if we found a match
            if ($questionResult->num_rows > 0) {
                $answerRow = $questionResult->fetch_assoc();
                $questionID = $answerRow['questionID'];
                $category = $answerRow['category'];
                
                // Check if it's a Matching Type question
                if ($category === 'Matching Type') {
                    // For Matching Type, use uid1, uid2, uid3 as the answer
                    $matchingAnswers = [];
                    
                    // Add non-empty UIDs to the answer array
                    if (!empty($answerRow['uid1'])) {
                        $matchingAnswers[] = $answerRow['uid1'];
                    }
                    if (!empty($answerRow['uid2'])) {
                        $matchingAnswers[] = $answerRow['uid2'];
                    }
                    if (!empty($answerRow['uid3'])) {
                        $matchingAnswers[] = $answerRow['uid3'];
                    }
                    
                    if (count($matchingAnswers) > 0) {
                        $correctAnswer = implode(', ', $matchingAnswers);
                        error_log("Matching Type question found (ID: $questionID): '$questionText' -> Answers: '$correctAnswer'");
                    } else {
                        error_log("Matching Type question found (ID: $questionID) but no UIDs provided for: '$questionText'");
                        $correctAnswer = "No matching options provided";
                    }
                } else {
                    // For non-Matching Type, use the answer column
                    if (empty($answerRow['answer'])) {
                        error_log("Question match found (ID: $questionID) but answer is empty for: '$questionText'");
                        $correctAnswer = "Answer not provided in database";
                    } else {
                        $correctAnswer = $answerRow['answer'];
                        error_log("Question match found (ID: $questionID): '$questionText' -> Answer: '$correctAnswer'");
                    }
                }
            } else {
                // Try a more flexible match - This is optional and depends on your needs
                $fuzzyQuestionSql = "SELECT questionID, question, answer, category, uid1, uid2, uid3 FROM questions 
                                    WHERE question LIKE ? OR ? LIKE CONCAT('%', question, '%') 
                                    LIMIT 1";
                $fuzzySearchTerm = "%$questionText%";
                $fuzzyQuestionStmt = $conn->prepare($fuzzyQuestionSql);
                $fuzzyQuestionStmt->bind_param("ss", $fuzzySearchTerm, $questionText);
                $fuzzyQuestionStmt->execute();
                $fuzzyQuestionResult = $fuzzyQuestionStmt->get_result();
                
                if ($fuzzyQuestionResult->num_rows > 0) {
                    $fuzzyAnswerRow = $fuzzyQuestionResult->fetch_assoc();
                    $fuzzyQuestionID = $fuzzyAnswerRow['questionID'];
                    $matchedQuestion = $fuzzyAnswerRow['question'];
                    $fuzzyCategory = $fuzzyAnswerRow['category'];
                    
                    // Check if it's a Matching Type question
                    if ($fuzzyCategory === 'Matching Type') {
                        // For Matching Type, use uid1, uid2, uid3 as the answer
                        $matchingAnswers = [];
                        
                        // Add non-empty UIDs to the answer array
                        if (!empty($fuzzyAnswerRow['uid1'])) {
                            $matchingAnswers[] = $fuzzyAnswerRow['uid1'];
                        }
                        if (!empty($fuzzyAnswerRow['uid2'])) {
                            $matchingAnswers[] = $fuzzyAnswerRow['uid2'];
                        }
                        if (!empty($fuzzyAnswerRow['uid3'])) {
                            $matchingAnswers[] = $fuzzyAnswerRow['uid3'];
                        }
                        
                        if (count($matchingAnswers) > 0) {
                            $correctAnswer = implode(', ', $matchingAnswers);
                            error_log("Fuzzy match - Matching Type question found (ID: $fuzzyQuestionID): '$matchedQuestion' -> Answers: '$correctAnswer'");
                        } else {
                            error_log("Fuzzy match - Matching Type question found (ID: $fuzzyQuestionID) but no UIDs provided for: '$matchedQuestion'");
                            $correctAnswer = "No matching options provided";
                        }
                    } else {
                        // For non-Matching Type, use the answer column
                        if (empty($fuzzyAnswerRow['answer'])) {
                            error_log("Fuzzy match found (ID: $fuzzyQuestionID) but answer is empty. Question: '$matchedQuestion'");
                            $correctAnswer = "Answer not provided in database";
                        } else {
                            $correctAnswer = $fuzzyAnswerRow['answer'];
                            error_log("Fuzzy match found (ID: $fuzzyQuestionID): '$matchedQuestion' -> Answer: '$correctAnswer'");
                        }
                    }
                } else {
                    error_log("No match found for question: '$questionText'");
                }
                $fuzzyQuestionStmt->close();
            }
            
            $questionStmt->close();
            
            // Add to the questions data array
            $questionsData[] = [
                'id' => $i,
                'question' => $questionText,
                'answer' => $formattedUserAnswer,
                'correctAnswer' => $correctAnswer
            ];
        }
        
        // Success response
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Questions retrieved successfully",
            "data" => $questionsData
        ]);
        
    } catch (Exception $e) {
        error_log("Error in getLessonQuestions.php: " . $e->getMessage());
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