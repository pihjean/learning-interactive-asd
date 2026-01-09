<?php
// Prevent any HTML output that could interfere with JSON
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Start output buffering to catch any unexpected output
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_clean();
    exit();
}

// Database credentials
$servername = "localhost";
$username = "u572625467_capstone_2";
$password = "Smartstep_2";
$dbname = "u572625467_smartstep";

function debugLog($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] Progress: $message" . PHP_EOL;
    error_log($logMessage);
    
    // Also write to a specific debug file if possible
    $debugFile = $_SERVER['DOCUMENT_ROOT'] . '/debug_progress.log';
    @file_put_contents($debugFile, $logMessage, FILE_APPEND | LOCK_EX);
}

function sendJsonError($message, $code = 500) {
    ob_end_clean(); // Clear any buffered output
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $message]);
    exit();
}

function sendJsonSuccess($data = []) {
    ob_end_clean(); // Clear any buffered output
    echo json_encode(array_merge(["success" => true], $data));
    exit();
}

function validateRequiredFields($data, $requiredFields) {
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            return "Missing or empty required field: $field";
        }
    }
    return null;
}

function validateAnswerValues($data) {
    $validAnswers = ['correct', 'wrong', 'skipped', 'not_yet_answered'];
    $answerFields = ['e_quest1', 'm_quest1', 'm_quest2', 'h_quest1', 'h_quest2', 'h_quest3'];
    
    foreach ($answerFields as $field) {
        if (isset($data[$field]) && !in_array($data[$field], $validAnswers)) {
            return "Invalid value for $field. Must be one of: " . implode(', ', $validAnswers);
        }
    }
    return null;
}

function validateDay($day) {
    $validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    if (!in_array($day, $validDays)) {
        return "Invalid day. Must be one of: " . implode(', ', $validDays);
    }
    return null;
}

function checkIfGameCompleted($progress) {
    if (!$progress) return false;
    
    // Check if status is already marked as Completed
    if (isset($progress['status']) && $progress['status'] === 'Completed') {
        return true;
    }
    
    // Check if user reached outro stage
    if ($progress['checkpoint'] === 'hard_outro') {
        return true;
    }
    
    // Check if all hard questions were answered (any result - correct, wrong, or skipped)
    $allHardAnswered = 
        $progress['h_quest1'] !== 'not_yet_answered' && 
        $progress['h_quest2'] !== 'not_yet_answered' && 
        $progress['h_quest3'] !== 'not_yet_answered';
    
    return $allHardAnswered;
}

// Handle requests
try {
    debugLog("Request method: " . $_SERVER['REQUEST_METHOD']);
    debugLog("Content type: " . ($_SERVER['CONTENT_TYPE'] ?? 'Not set'));
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'getProgress':
                $conn = createDBConnection();
                getProgress($conn, $_GET);
                $conn->close();
                break;
                
            case 'getAllProgress':
                $conn = createDBConnection();
                getAllProgress($conn, $_GET);
                $conn->close();
                break;
            
            default:
                sendJsonError("Invalid GET action: " . $action, 400);
        }
        exit();
    }
    
    // For POST requests
    $contentType = isset($_SERVER["CONTENT_TYPE"]) ? $_SERVER["CONTENT_TYPE"] : '';
    $conn = createDBConnection();
    
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            sendJsonError("Invalid JSON input", 400);
        }
        $action = $input['action'] ?? '';
        
        switch ($action) {
            case 'saveProgress':
                saveProgress($conn, $input);
                break;
                
            case 'updateProgress':
                updateProgress($conn, $input);
                break;
                
            default:
                sendJsonError("Invalid JSON action: " . $action, 400);
        }
    } else {
        sendJsonError("Invalid content type. Expected application/json", 400);
    }
    
    $conn->close();
    
} catch (Exception $e) {
    debugLog("Exception caught: " . $e->getMessage());
    sendJsonError($e->getMessage());
} catch (Error $e) {
    debugLog("Fatal error caught: " . $e->getMessage());
    sendJsonError("A system error occurred. Please try again.");
}

function createDBConnection() {
    global $servername, $username, $password, $dbname;
    
    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        sendJsonError("Database connection failed: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");
    return $conn;
}

function getProgress($conn, $params) {
    $studentID = $params['studentID'] ?? '';
    $day = $params['day'] ?? '';
    $category = $params['category'] ?? '';
    
    // Enhanced validation
    $requiredFields = ['studentID', 'day', 'category'];
    $validationError = validateRequiredFields($params, $requiredFields);
    if ($validationError) {
        sendJsonError($validationError, 400);
    }
    
    $dayValidationError = validateDay($day);
    if ($dayValidationError) {
        sendJsonError($dayValidationError, 400);
    }
    
    debugLog("Getting progress for: StudentID=$studentID, Day=$day, Category=$category");
    
    // Get the latest progress for this student/day/category combination - NOW WITH STATUS
    $stmt = $conn->prepare("
        SELECT progressID, studentID, studentName, day, category, 
               e_quest1, m_quest1, m_quest2, h_quest1, h_quest2, h_quest3, 
               checkpoint, attempts, time, status, date_time, created_at 
        FROM progress 
        WHERE studentID = ? AND day = ? AND category = ? 
        ORDER BY progressID DESC 
        LIMIT 1
    ");
    
    if (!$stmt) {
        sendJsonError("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("sss", $studentID, $day, $category);
    
    if (!$stmt->execute()) {
        sendJsonError("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $progress = $result->fetch_assoc();
    $stmt->close();
    
    if (!$progress) {
        debugLog("No progress found for: StudentID=$studentID, Day=$day, Category=$category");
        sendJsonError("No progress found", 404);
    }
    
    debugLog("Found progress: " . json_encode($progress));
    sendJsonSuccess(["progress" => $progress]);
}

function getAllProgress($conn, $params) {
    $studentID = $params['studentID'] ?? '';
    
    // NOW WITH STATUS FIELD
    $sql = "SELECT progressID, studentID, studentName, day, category, 
                   e_quest1, m_quest1, m_quest2, h_quest1, h_quest2, h_quest3, 
                   checkpoint, attempts, time, status, date_time, created_at 
            FROM progress";
    
    $bind_params = [];
    $param_types = "";
    
    if (!empty($studentID)) {
        $sql .= " WHERE studentID = ?";
        $bind_params[] = $studentID;
        $param_types .= "s";
    }
    
    $sql .= " ORDER BY date_time DESC";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        sendJsonError("Prepare statement failed: " . $conn->error);
    }
    
    if (!empty($bind_params)) {
        $stmt->bind_param($param_types, ...$bind_params);
    }
    
    if (!$stmt->execute()) {
        sendJsonError("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $progressList = [];
    
    while ($row = $result->fetch_assoc()) {
        $progressList[] = $row;
    }
    
    $stmt->close();
    sendJsonSuccess(["progress" => $progressList]);
}

function saveProgress($conn, $data) {
    // Enhanced validation with detailed error checking
    $requiredFields = ['studentID', 'studentName', 'day', 'category', 'checkpoint'];
    $validationError = validateRequiredFields($data, $requiredFields);
    if ($validationError) {
        sendJsonError($validationError, 400);
    }
    
    // Validate answer values
    $answerValidationError = validateAnswerValues($data);
    if ($answerValidationError) {
        sendJsonError($answerValidationError, 400);
    }
    
    // Clean and validate input data
    $studentID = trim($data['studentID']);
    $studentName = trim($data['studentName']);
    $day = trim($data['day']);
    $category = trim($data['category']);
    $checkpoint = trim($data['checkpoint']);
    
    // Check if this is a request for a new record (completed game replay)
    $forceNewRecord = $data['forceNewRecord'] ?? false;
    
    // Additional validation
    if (strlen($studentName) < 2) {
        sendJsonError("Student name must be at least 2 characters long", 400);
    }
    
    if (strlen($category) < 1) {
        sendJsonError("Category cannot be empty", 400);
    }
    
    if (strlen($checkpoint) < 3 || !strpos($checkpoint, '_')) {
        sendJsonError("Invalid checkpoint format. Expected format: difficulty_stage", 400);
    }
    
    $dayValidationError = validateDay($day);
    if ($dayValidationError) {
        sendJsonError($dayValidationError, 400);
    }
    
    // Set default values for optional fields
    $e_quest1 = $data['e_quest1'] ?? 'not_yet_answered';
    $m_quest1 = $data['m_quest1'] ?? 'not_yet_answered';
    $m_quest2 = $data['m_quest2'] ?? 'not_yet_answered';
    $h_quest1 = $data['h_quest1'] ?? 'not_yet_answered';
    $h_quest2 = $data['h_quest2'] ?? 'not_yet_answered';
    $h_quest3 = $data['h_quest3'] ?? 'not_yet_answered';
    $time = intval($data['time'] ?? 0);
    $isComplete = $data['isComplete'] ?? false;
    
    // Get attempts from frontend (frontend manages session-based attempts)
    $attempts = intval($data['attempts'] ?? 1);
    
    // CONVERT isComplete TO status STRING
    $status = $isComplete ? 'Completed' : 'Not Complete';
    
    debugLog("Processing progress: StudentID=$studentID, Day=$day, Category=$category, Checkpoint=$checkpoint, Status=$status, ForceNewRecord=" . ($forceNewRecord ? 'true' : 'false'));
    
    $conn->begin_transaction();
    
    try {
        // Check if record exists for this student/day/category combination
        $checkStmt = $conn->prepare("
            SELECT progressID, attempts, checkpoint, status, e_quest1, m_quest1, m_quest2, h_quest1, h_quest2, h_quest3
            FROM progress 
            WHERE studentID = ? AND day = ? AND category = ?
            ORDER BY progressID DESC LIMIT 1
        ");
        
        if (!$checkStmt) {
            throw new Exception("Prepare check statement failed: " . $conn->error);
        }
        
        $checkStmt->bind_param("sss", $studentID, $day, $category);
        
        if (!$checkStmt->execute()) {
            throw new Exception("Execute check statement failed: " . $checkStmt->error);
        }
        
        $result = $checkStmt->get_result();
        $existingRecord = $result->fetch_assoc();
        $checkStmt->close();
        
        // Determine if we should create a new record or update existing
        $shouldCreateNewRecord = false;
        
        if (!$existingRecord) {
            // No existing record, create new
            $shouldCreateNewRecord = true;
            debugLog("No existing record found - creating new record");
        } else if ($forceNewRecord) {
            // Force new record requested (completed game replay)
            $shouldCreateNewRecord = true;
            debugLog("Force new record requested - creating new record for completed game replay");
        } else {
            // Check if previous game was completed
            $previousGameCompleted = checkIfGameCompleted($existingRecord);
            if ($previousGameCompleted) {
                $shouldCreateNewRecord = true;
                debugLog("Previous game was completed - creating new record");
            } else {
                $shouldCreateNewRecord = false;
                debugLog("Previous game not completed - updating existing record");
            }
        }
        
        if ($shouldCreateNewRecord) {
            // INSERT new record WITH STATUS
            debugLog("Inserting new progress record with status: $status");
            
            $insertStmt = $conn->prepare("
                INSERT INTO progress 
                (studentID, studentName, day, category, e_quest1, m_quest1, m_quest2, 
                 h_quest1, h_quest2, h_quest3, checkpoint, attempts, time, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            ");
            
            if (!$insertStmt) {
                throw new Exception("Prepare insert statement failed: " . $conn->error);
            }
            
            $insertStmt->bind_param("ssssssssssiis", 
                $studentID, $studentName, $day, $category, 
                $e_quest1, $m_quest1, $m_quest2, $h_quest1, $h_quest2, $h_quest3, 
                $checkpoint, $time, $status
            );
            
            if (!$insertStmt->execute()) {
                throw new Exception("Execute insert statement failed: " . $insertStmt->error);
            }
            
            if ($insertStmt->affected_rows <= 0) {
                throw new Exception("Insert failed - no rows affected");
            }
            
            $progressID = $conn->insert_id;
            $insertStmt->close();
            
            $message = "New progress record created (attempt 1) with status: $status";
            $action = "inserted";
            
        } else {
            // UPDATE existing record WITH STATUS
            $progressID = $existingRecord['progressID'];
            
            // Use attempts value from frontend (already incremented when they loaded progress)
            debugLog("Updating existing record: ProgressID=$progressID, Attempts=$attempts, Status=$status");
            
            $updateStmt = $conn->prepare("
                UPDATE progress SET 
                    studentName = ?, e_quest1 = ?, m_quest1 = ?, m_quest2 = ?, 
                    h_quest1 = ?, h_quest2 = ?, h_quest3 = ?, 
                    checkpoint = ?, attempts = ?, time = ?, status = ?, date_time = CURRENT_TIMESTAMP
                WHERE progressID = ?
            ");
            
            if (!$updateStmt) {
                throw new Exception("Prepare update statement failed: " . $conn->error);
            }
            
            $updateStmt->bind_param("ssssssssiisi", 
                $studentName, $e_quest1, $m_quest1, $m_quest2, 
                $h_quest1, $h_quest2, $h_quest3, $checkpoint, $attempts, $time, $status, $progressID
            );
            
            if (!$updateStmt->execute()) {
                throw new Exception("Execute update statement failed: " . $updateStmt->error);
            }
            
            if ($updateStmt->affected_rows <= 0) {
                // This is okay for frequent updates with same data
                debugLog("Update didn't change any rows - data may be the same");
            }
            
            $updateStmt->close();
            
            $message = "Progress updated for existing day/category with status: $status";
            $action = "updated";
        }
        
        // Check database connection before commit
        if (!$conn->ping()) {
            throw new Exception("Database connection lost before commit");
        }
        
        if (!$conn->commit()) {
            throw new Exception("Database commit failed: " . $conn->error);
        }
        
        debugLog("Progress processed successfully: ProgressID=$progressID, Action=$action, Checkpoint=$checkpoint, Status=$status");
        
        sendJsonSuccess([
            "message" => $message,
            "progressID" => $progressID,
            "status" => $status,
            "action" => $action,
            "checkpoint" => $checkpoint
        ]);
        
    } catch (Exception $e) {
        debugLog("Exception in saveProgress: " . $e->getMessage());
        
        // Rollback transaction
        try {
            if ($conn && $conn->ping()) {
                $conn->rollback();
                debugLog("Transaction rolled back successfully");
            }
        } catch (Exception $rollbackError) {
            debugLog("Rollback failed: " . $rollbackError->getMessage());
        }
        
        throw $e;
    }
}

function updateProgress($conn, $data) {
    // Enhanced validation
    $requiredFields = ['progressID', 'studentID', 'studentName', 'day', 'category', 'checkpoint'];
    $validationError = validateRequiredFields($data, $requiredFields);
    if ($validationError) {
        sendJsonError($validationError, 400);
    }
    
    // Validate answer values
    $answerValidationError = validateAnswerValues($data);
    if ($answerValidationError) {
        sendJsonError($answerValidationError, 400);
    }
    
    $progressID = intval($data['progressID']);
    if ($progressID <= 0) {
        sendJsonError("Valid progressID is required for update", 400);
    }
    
    // Clean and validate input data
    $studentID = trim($data['studentID']);
    $studentName = trim($data['studentName']);
    $day = trim($data['day']);
    $category = trim($data['category']);
    $checkpoint = trim($data['checkpoint']);
    
    // Additional validation
    if (strlen($studentName) < 2) {
        sendJsonError("Student name must be at least 2 characters long", 400);
    }
    
    $dayValidationError = validateDay($day);
    if ($dayValidationError) {
        sendJsonError($dayValidationError, 400);
    }
    
    // Set default values for optional fields
    $e_quest1 = $data['e_quest1'] ?? 'not_yet_answered';
    $m_quest1 = $data['m_quest1'] ?? 'not_yet_answered';
    $m_quest2 = $data['m_quest2'] ?? 'not_yet_answered';
    $h_quest1 = $data['h_quest1'] ?? 'not_yet_answered';
    $h_quest2 = $data['h_quest2'] ?? 'not_yet_answered';
    $h_quest3 = $data['h_quest3'] ?? 'not_yet_answered';
    $attempts = intval($data['attempts'] ?? 1);
    $time = intval($data['time'] ?? 0);
    $isComplete = $data['isComplete'] ?? false;
    
    // CONVERT isComplete TO status STRING
    $status = $isComplete ? 'Completed' : 'Not Complete';
    
    debugLog("Updating progress: ProgressID=$progressID, StudentID=$studentID, Checkpoint=$checkpoint, Status=$status");
    
    $conn->begin_transaction();
    
    try {
        // Verify record exists before updating
        $verifyStmt = $conn->prepare("SELECT COUNT(*) FROM progress WHERE progressID = ? AND studentID = ?");
        if (!$verifyStmt) {
            throw new Exception("Prepare verify statement failed: " . $conn->error);
        }
        
        $verifyStmt->bind_param("is", $progressID, $studentID);
        $verifyStmt->execute();
        $verifyStmt->bind_result($recordCount);
        $verifyStmt->fetch();
        $verifyStmt->close();
        
        if ($recordCount == 0) {
            throw new Exception("No progress record found with ID $progressID for student $studentID");
        }
        
        // Update existing progress record WITH STATUS
        $stmt = $conn->prepare("
            UPDATE progress SET 
                studentName = ?, day = ?, category = ?, 
                e_quest1 = ?, m_quest1 = ?, m_quest2 = ?, 
                h_quest1 = ?, h_quest2 = ?, h_quest3 = ?, 
                checkpoint = ?, attempts = ?, time = ?, status = ?, date_time = CURRENT_TIMESTAMP
            WHERE progressID = ? AND studentID = ?
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("sssssssssiiisis", 
            $studentName, $day, $category, 
            $e_quest1, $m_quest1, $m_quest2, $h_quest1, $h_quest2, $h_quest3, 
            $checkpoint, $attempts, $time, $status, $progressID, $studentID
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        if ($stmt->affected_rows === 0) {
            debugLog("Update didn't change any rows - data may be the same");
        }
        
        $stmt->close();
        
        if (!$conn->commit()) {
            throw new Exception("Database commit failed: " . $conn->error);
        }
        
        debugLog("Progress updated successfully: ProgressID=$progressID, Checkpoint=$checkpoint, Status=$status");
        
        sendJsonSuccess([
            "message" => "Progress updated successfully",
            "progressID" => $progressID,
            "status" => $status,
            "checkpoint" => $checkpoint
        ]);
        
    } catch (Exception $e) {
        debugLog("Exception in updateProgress: " . $e->getMessage());
        
        try {
            if ($conn && $conn->ping()) {
                $conn->rollback();
            }
        } catch (Exception $rollbackError) {
            debugLog("Rollback failed: " . $rollbackError->getMessage());
        }
        
        throw $e;
    }
}
?>