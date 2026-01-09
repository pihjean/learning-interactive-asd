<?php
// Prevent any HTML output that could interfere with JSON
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// PHP limits
ini_set('memory_limit', '1536M');
ini_set('max_execution_time', 600);
ini_set('post_max_size', '1536M');
ini_set('upload_max_filesize', '1536M');
ini_set('max_file_uploads', 20);
ini_set('max_input_time', 600);
ini_set('default_socket_timeout', 600);
set_time_limit(600);

// Database credentials
$servername = "localhost";
$username = "u572625467_capstone_2";
$password = "Smartstep_2";
$dbname = "u572625467_smartstep";

// Upload directory
$upload_dir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/';

// Create upload directory if it doesn't exist
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

function debugLog($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message" . PHP_EOL;
    error_log($logMessage);
    
    $debugFile = $_SERVER['DOCUMENT_ROOT'] . '/debug_game_hard.log';
    @file_put_contents($debugFile, $logMessage, FILE_APPEND | LOCK_EX);
}

function sendJsonError($message, $code = 500) {
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $message]);
    exit();
}

function sendJsonSuccess($data = []) {
    echo json_encode(array_merge(["success" => true], $data));
    exit();
}

// Handle requests
try {
    debugLog("Request method: " . $_SERVER['REQUEST_METHOD']);
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'getGames':
                $conn = createDBConnection();
                getGames($conn, $_GET);
                $conn->close();
                break;
                
            case 'getVideo':
                streamVideo($_GET);
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
            case 'deleteGame':
                deleteGame($conn, $upload_dir, $input);
                break;
                
            default:
                sendJsonError("Invalid JSON action: " . $action, 400);
        }
    } else {
        $action = $_POST['action'] ?? '';
        
        switch ($action) {
            case 'uploadChunk':
                handleChunkedUpload();
                break;
                
            case 'addGame':
                addGame($conn, $upload_dir);
                break;
                
            case 'updateGame':
                updateGame($conn, $upload_dir);
                break;
                
            default:
                sendJsonError("Invalid form action: " . $action, 400);
        }
    }
    
    $conn->close();
    
} catch (Exception $e) {
    debugLog("Exception caught: " . $e->getMessage());
    debugLog("Stack trace: " . $e->getTraceAsString());
    sendJsonError($e->getMessage());
} catch (Error $e) {
    debugLog("Fatal error caught: " . $e->getMessage());
    debugLog("Stack trace: " . $e->getTraceAsString());
    sendJsonError("A system error occurred: " . $e->getMessage());
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

function handleChunkedUpload() {
    $chunkIndex = isset($_POST['chunkIndex']) ? intval($_POST['chunkIndex']) : 0;
    $totalChunks = isset($_POST['totalChunks']) ? intval($_POST['totalChunks']) : 1;
    $fileId = $_POST['fileId'] ?? '';
    $fileName = $_POST['fileName'] ?? '';
    
    if (!$fileId || !$fileName) {
        sendJsonError("Missing required chunk parameters", 400);
    }
    
    // Create temp directory for chunks
    $temp_dir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/temp/';
    if (!file_exists($temp_dir)) {
        mkdir($temp_dir, 0755, true);
    }
    
    $chunk_dir = $temp_dir . $fileId . '/';
    if (!file_exists($chunk_dir)) {
        mkdir($chunk_dir, 0755, true);
    }
    
    // Save chunk
    if (!isset($_FILES['chunk'])) {
        sendJsonError("No chunk file received", 400);
    }
    
    $chunk_path = $chunk_dir . 'chunk_' . $chunkIndex;
    if (!move_uploaded_file($_FILES['chunk']['tmp_name'], $chunk_path)) {
        sendJsonError("Failed to save chunk", 500);
    }
    
    debugLog("Saved chunk $chunkIndex of $totalChunks for file $fileName");
    
    // If this is the last chunk, merge all chunks into temp location
    if ($chunkIndex == $totalChunks - 1) {
        $field_name = $_POST['field_name'] ?? '';
        
        if (!$field_name) {
            sendJsonError("Missing field_name parameter", 400);
        }
        
        // Store merged file in temp directory with unique name
        $safe_filename = $field_name . '_' . time() . '_' . preg_replace('/[^a-zA-Z0-9\.]/', '_', pathinfo($fileName, PATHINFO_FILENAME)) . '.mp4';
        $temp_merged_path = $temp_dir . $fileId . '_' . $safe_filename;
        
        // Merge chunks
        $output = fopen($temp_merged_path, 'wb');
        if (!$output) {
            sendJsonError("Failed to create merged file", 500);
        }
        
        for ($i = 0; $i < $totalChunks; $i++) {
            $chunk_file = $chunk_dir . 'chunk_' . $i;
            if (!file_exists($chunk_file)) {
                fclose($output);
                unlink($temp_merged_path);
                sendJsonError("Missing chunk $i", 500);
            }
            
            $chunk_data = file_get_contents($chunk_file);
            fwrite($output, $chunk_data);
            unlink($chunk_file);
        }
        
        fclose($output);
        rmdir($chunk_dir);
        
        debugLog("Merged file complete at temp location: $temp_merged_path");
        
        // Return the temp path - will be moved to final location later
        sendJsonSuccess([
            "message" => "Upload complete",
            "temp_path" => $temp_merged_path,
            "filename" => $safe_filename
        ]);
    } else {
        sendJsonSuccess([
            "message" => "Chunk $chunkIndex uploaded"
        ]);
    }
}

function streamVideo($params) {
    if (!isset($params['file']) || empty($params['file'])) {
        header("HTTP/1.0 400 Bad Request");
        echo "Missing file parameter";
        exit;
    }
    
    $filePath = $params['file'];
    
    // Sanitize file path to prevent directory traversal
    $filePath = str_replace('..', '', $filePath);
    $filePath = str_replace('//', '/', $filePath);
    
    // Construct full path using document root
    $fullPath = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($filePath, '/');
    
    debugLog("Streaming video from: " . $fullPath);
    
    if (!file_exists($fullPath)) {
        header("HTTP/1.0 404 Not Found");
        echo "File not found: " . htmlspecialchars($filePath);
        debugLog("File not found at: " . $fullPath);
        exit;
    }
    
    // Security check - only serve MP4 files
    $extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
    if ($extension !== 'mp4') {
        header("HTTP/1.0 403 Forbidden");
        echo "Only MP4 files are allowed";
        exit;
    }
    
    $fileSize = filesize($fullPath);
    
    header("Content-Type: video/mp4");
    header("Content-Length: $fileSize");
    header("Content-Disposition: inline; filename=\"" . basename($fullPath) . "\"");
    header("Accept-Ranges: bytes");
    header("Cache-Control: public, max-age=3600");
    
    // Handle range requests for video seeking
    if (isset($_SERVER['HTTP_RANGE'])) {
        list($a, $range) = explode("=", $_SERVER['HTTP_RANGE'], 2);
        list($range) = explode(",", $range, 2);
        list($seek_start, $seek_end) = explode("-", $range, 2);
        
        $seek_start = empty($seek_start) ? 0 : intval($seek_start);
        $seek_end = empty($seek_end) ? ($fileSize - 1) : intval($seek_end);
        
        header("HTTP/1.1 206 Partial Content");
        header("Content-Length: " . ($seek_end - $seek_start + 1));
        header("Content-Range: bytes $seek_start-$seek_end/$fileSize");
        
        $fp = fopen($fullPath, 'rb');
        fseek($fp, $seek_start);
        $buffer = 1024 * 32;
        
        while (!feof($fp) && connection_status() == 0) {
            echo fread($fp, $buffer);
            ob_flush();
            flush();
        }
        
        fclose($fp);
    } else {
        $fp = fopen($fullPath, 'rb');
        $buffer = 1024 * 32;
        
        while (!feof($fp) && connection_status() == 0) {
            echo fread($fp, $buffer);
            ob_flush();
            flush();
        }
        
        fclose($fp);
    }
    
    exit;
}

function getGames($conn, $params) {
    $category = $params['category'] ?? '';
    
    if (empty($category)) {
        sendJsonError("Category is required", 400);
    }
    
    $stmt = $conn->prepare("
        SELECT 
            hard_id, 
            answer1,
            q1_wrong_answer1,
            q1_wrong_answer2,
            answer2,
            q2_wrong_answer1,
            q2_wrong_answer2,
            answer3,
            q3_wrong_answer1,
            q3_wrong_answer2,
            map_path,
            lesson_path,
            question1_path,
            achievement1_path,
            wrong_answer1_path,
            question2_path,
            achievement2_path,
            wrong_answer2_path,
            question3_path,
            achievement3_path,
            wrong_answer3_path,
            final_achievement_path,
            last_map_path,
            outro_path
        FROM game_hard 
        WHERE category = ?
        ORDER BY hard_id ASC
    ");
    
    if (!$stmt) {
        sendJsonError("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $category);
    
    if (!$stmt->execute()) {
        sendJsonError("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    $games = [];
    while ($row = $result->fetch_assoc()) {
        $game = [
            'hard_id' => intval($row['hard_id']),
            'answer1' => $row['answer1'],
            'q1_wrong_answer1' => $row['q1_wrong_answer1'],
            'q1_wrong_answer2' => $row['q1_wrong_answer2'],
            'answer2' => $row['answer2'],
            'q2_wrong_answer1' => $row['q2_wrong_answer1'],
            'q2_wrong_answer2' => $row['q2_wrong_answer2'],
            'answer3' => $row['answer3'],
            'q3_wrong_answer1' => $row['q3_wrong_answer1'],
            'q3_wrong_answer2' => $row['q3_wrong_answer2']
        ];
        
        $mediaFields = [
            'map' => 'map_path',
            'lesson' => 'lesson_path',
            'question1' => 'question1_path',
            'achievement1' => 'achievement1_path',
            'wrong_answer1' => 'wrong_answer1_path',
            'question2' => 'question2_path',
            'achievement2' => 'achievement2_path',
            'wrong_answer2' => 'wrong_answer2_path',
            'question3' => 'question3_path',
            'achievement3' => 'achievement3_path',
            'wrong_answer3' => 'wrong_answer3_path',
            'final_achievement' => 'final_achievement_path',
            'last_map' => 'last_map_path',
            'outro' => 'outro_path'
        ];
        
        foreach ($mediaFields as $key => $dbField) {
            if (!empty($row[$dbField])) {
                $game[$key] = ['path' => $row[$dbField]];
            }
        }
        
        $games[] = $game;
    }
    
    sendJsonSuccess(["games" => $games]);
}

function addGame($conn, $upload_dir) {
    if (!$conn || $conn->connect_error) {
        throw new Exception("Database connection lost: " . ($conn->connect_error ?? 'Unknown error'));
    }
    
    $conn->begin_transaction();
    
    try {
        set_time_limit(600);
        
        if (!isset($_POST['answer1'], $_POST['answer2'], $_POST['answer3'], $_POST['category'])) {
            throw new Exception("Missing required fields: answer1, answer2, answer3, or category");
        }
        
        $answer1 = trim($_POST['answer1']);
        $q1_wrong_answer1 = trim($_POST['q1_wrong_answer1'] ?? '');
        $q1_wrong_answer2 = trim($_POST['q1_wrong_answer2'] ?? '');
        $answer2 = trim($_POST['answer2']);
        $q2_wrong_answer1 = trim($_POST['q2_wrong_answer1'] ?? '');
        $q2_wrong_answer2 = trim($_POST['q2_wrong_answer2'] ?? '');
        $answer3 = trim($_POST['answer3']);
        $q3_wrong_answer1 = trim($_POST['q3_wrong_answer1'] ?? '');
        $q3_wrong_answer2 = trim($_POST['q3_wrong_answer2'] ?? '');
        $category = trim($_POST['category']);
        $difficulty = 'hard';
        
        if (empty($answer1) || empty($answer2) || empty($answer3) || empty($category)) {
            throw new Exception("All answer fields and category must be filled");
        }
        
        if (empty($q1_wrong_answer1)) {
            throw new Exception("Q1 Wrong Answer 1 is required");
        }
        
        if (empty($q2_wrong_answer1)) {
            throw new Exception("Q2 Wrong Answer 1 is required");
        }
        
        if (empty($q3_wrong_answer1)) {
            throw new Exception("Q3 Wrong Answer 1 is required");
        }
        
        debugLog("Starting addGame for category: $category");
        
        // Find next available ID FIRST
        $max_id_stmt = $conn->prepare("SELECT MAX(hard_id) FROM game_hard");
        if (!$max_id_stmt) {
            throw new Exception("Failed to prepare MAX ID statement: " . $conn->error);
        }
        
        $max_id_stmt->execute();
        $max_id_stmt->bind_result($max_id);
        $max_id_stmt->fetch();
        $max_id_stmt->close();
        
        $hard_id = $max_id ? $max_id + 1 : 1;
        debugLog("Generated new hard_id: " . $hard_id);
        
        // Create final directory NOW that we have the real ID
        $final_dir = $upload_dir . $category . '/' . $difficulty . '/' . $hard_id . '/';
        if (!file_exists($final_dir)) {
            if (!mkdir($final_dir, 0755, true)) {
                throw new Exception("Failed to create final directory");
            }
            debugLog("Created directory: " . $final_dir);
        }
        
        // Move uploaded files from temp to final location with correct ID
        $fileFields = ['map', 'lesson', 'question1', 'achievement1', 'wrong_answer1', 
                      'question2', 'achievement2', 'wrong_answer2', 'question3', 
                      'achievement3', 'wrong_answer3', 'final_achievement', 'last_map', 'outro'];
        
        $fileUploads = [];
        $uploadedCount = 0;
        
        debugLog("Processing uploaded files...");
        foreach ($fileFields as $field) {
            if (isset($_POST[$field . '_temp_path']) && !empty($_POST[$field . '_temp_path'])) {
                $temp_path = $_POST[$field . '_temp_path'];
                $filename = $_POST[$field . '_filename'] ?? '';
                
                // Handle both absolute and relative paths
                if (!file_exists($temp_path)) {
                    // Try with document root if it's a relative path
                    $full_temp_path = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($temp_path, '/');
                    if (file_exists($full_temp_path)) {
                        $temp_path = $full_temp_path;
                    } else {
                        debugLog("Warning: Temp file not found at: $temp_path or $full_temp_path");
                        $fileUploads[$field] = null;
                        continue;
                    }
                }
                
                // Move from temp to final location
                $final_file_path = $final_dir . $filename;
                if (!rename($temp_path, $final_file_path)) {
                    $error = error_get_last();
                    throw new Exception("Failed to move file from temp to final location for $field. Error: " . ($error['message'] ?? 'Unknown error'));
                }
                
                // Store relative path for database
                $relative_path = 'uploads/' . $category . '/' . $difficulty . '/' . $hard_id . '/' . $filename;
                $fileUploads[$field] = $relative_path;
                $uploadedCount++;
                debugLog("Moved file to final location: $relative_path");
            } else {
                $fileUploads[$field] = null;
            }
        }
        
        if ($uploadedCount == 0) {
            throw new Exception("Please upload at least one MP4 video file.");
        }
        
        debugLog("Total files processed: $uploadedCount");
        
        if (!$conn->ping()) {
            throw new Exception("Database connection lost before insert");
        }
        
        debugLog("Preparing database insert for hard_id: $hard_id");
        
        $stmt = $conn->prepare("
            INSERT INTO game_hard 
            (hard_id, category, answer1, q1_wrong_answer1, q1_wrong_answer2,
             answer2, q2_wrong_answer1, q2_wrong_answer2,
             answer3, q3_wrong_answer1, q3_wrong_answer2, status,
             map_path, lesson_path, question1_path, achievement1_path, wrong_answer1_path,
             question2_path, achievement2_path, wrong_answer2_path, question3_path, 
             achievement3_path, wrong_answer3_path, final_achievement_path, last_map_path, outro_path) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not in use', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        foreach ($fileUploads as $key => $value) {
            if (empty($value)) {
                $fileUploads[$key] = null;
            }
        }
        
        debugLog("Binding parameters for database insert");
        
        // Ensure all fileUploads are set
        foreach ($fileFields as $field) {
            if (!isset($fileUploads[$field])) {
                $fileUploads[$field] = null;
            }
        }
        
        try {
            $stmt->bind_param("issssssssssssssssssssssss", 
                $hard_id,
                $category,
                $answer1,
                $q1_wrong_answer1,
                $q1_wrong_answer2,
                $answer2,
                $q2_wrong_answer1,
                $q2_wrong_answer2,
                $answer3,
                $q3_wrong_answer1,
                $q3_wrong_answer2,
                $fileUploads['map'],
                $fileUploads['lesson'],
                $fileUploads['question1'],
                $fileUploads['achievement1'],
                $fileUploads['wrong_answer1'],
                $fileUploads['question2'],
                $fileUploads['achievement2'],
                $fileUploads['wrong_answer2'],
                $fileUploads['question3'],
                $fileUploads['achievement3'],
                $fileUploads['wrong_answer3'],
                $fileUploads['final_achievement'],
                $fileUploads['last_map'],
                $fileUploads['outro']
            );
        } catch (Exception $bindError) {
            throw new Exception("Failed to bind parameters: " . $bindError->getMessage() . ". FileUploads: " . json_encode($fileUploads));
        }
        
        debugLog("Executing database insert");
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error . ". SQL Error: " . $conn->error);
        }
        
        if ($stmt->affected_rows <= 0) {
            throw new Exception("Database insert failed - no rows affected");
        }
        
        $stmt->close();
        
        debugLog("Committing database transaction");
        if (!$conn->commit()) {
            throw new Exception("Database commit failed: " . $conn->error);
        }
        
        debugLog("Game added successfully with ID: $hard_id");
        
        sendJsonSuccess([
            "message" => "Game added successfully with $uploadedCount files uploaded",
            "game_id" => $hard_id,
            "files_uploaded" => $uploadedCount
        ]);
        
    } catch (Exception $e) {
        debugLog("Exception in addGame: " . $e->getMessage());
        
        try {
            if ($conn && $conn->ping()) {
                $conn->rollback();
                debugLog("Transaction rolled back successfully");
            }
        } catch (Exception $rollbackError) {
            debugLog("Rollback failed: " . $rollbackError->getMessage());
        }
        
        // Clean up files in final directory if insert failed
        if (isset($final_dir) && file_exists($final_dir)) {
            $files = glob($final_dir . '*');
            foreach ($files as $file) {
                if (is_file($file)) unlink($file);
            }
            @rmdir($final_dir);
            debugLog("Cleaned up failed upload directory");
        }
        
        throw $e;
    }
}

function updateGame($conn, $upload_dir) {
    $conn->begin_transaction();
    
    try {
        set_time_limit(600);
        
        if (!isset($_POST['hard_id'])) {
            throw new Exception("Missing hard_id parameter");
        }
        
        $hard_id = intval($_POST['hard_id']);
        $answer1 = trim($_POST['answer1'] ?? '');
        $q1_wrong_answer1 = trim($_POST['q1_wrong_answer1'] ?? '');
        $q1_wrong_answer2 = trim($_POST['q1_wrong_answer2'] ?? '');
        $answer2 = trim($_POST['answer2'] ?? '');
        $q2_wrong_answer1 = trim($_POST['q2_wrong_answer1'] ?? '');
        $q2_wrong_answer2 = trim($_POST['q2_wrong_answer2'] ?? '');
        $answer3 = trim($_POST['answer3'] ?? '');
        $q3_wrong_answer1 = trim($_POST['q3_wrong_answer1'] ?? '');
        $q3_wrong_answer2 = trim($_POST['q3_wrong_answer2'] ?? '');
        $category = trim($_POST['category'] ?? '');
        $difficulty = 'hard';
        
        if (empty($answer1) || empty($answer2) || empty($answer3) || empty($category)) {
            throw new Exception("All answer fields and category must be filled");
        }
        
        if (empty($q1_wrong_answer1)) {
            throw new Exception("Q1 Wrong Answer 1 is required");
        }
        
        if (empty($q2_wrong_answer1)) {
            throw new Exception("Q2 Wrong Answer 1 is required");
        }
        
        if (empty($q3_wrong_answer1)) {
            throw new Exception("Q3 Wrong Answer 1 is required");
        }
        
        $check_stmt = $conn->prepare("SELECT COUNT(*) FROM game_hard WHERE hard_id = ?");
        if (!$check_stmt) {
            throw new Exception("Failed to prepare check statement: " . $conn->error);
        }
        
        $check_stmt->bind_param("i", $hard_id);
        $check_stmt->execute();
        $check_stmt->bind_result($count);
        $check_stmt->fetch();
        $check_stmt->close();
        
        if ($count == 0) {
            throw new Exception("Game with ID $hard_id does not exist.");
        }
        
        // Create final directory if needed
        $final_dir = $upload_dir . $category . '/' . $difficulty . '/' . $hard_id . '/';
        if (!file_exists($final_dir)) {
            mkdir($final_dir, 0755, true);
        }
        
        $sql = "UPDATE game_hard SET answer1 = ?, q1_wrong_answer1 = ?, q1_wrong_answer2 = ?, answer2 = ?, q2_wrong_answer1 = ?, q2_wrong_answer2 = ?, answer3 = ?, q3_wrong_answer1 = ?, q3_wrong_answer2 = ?, category = ?";
        $params = [$answer1, $q1_wrong_answer1, $q1_wrong_answer2, $answer2, $q2_wrong_answer1, $q2_wrong_answer2, $answer3, $q3_wrong_answer1, $q3_wrong_answer2, $category];
        $types = "ssssssssss";
        
        $fields = [
            'map' => 'map_path',
            'lesson' => 'lesson_path',
            'question1' => 'question1_path',
            'achievement1' => 'achievement1_path',
            'wrong_answer1' => 'wrong_answer1_path',
            'question2' => 'question2_path',
            'achievement2' => 'achievement2_path',
            'wrong_answer2' => 'wrong_answer2_path',
            'question3' => 'question3_path',
            'achievement3' => 'achievement3_path',
            'wrong_answer3' => 'wrong_answer3_path',
            'final_achievement' => 'final_achievement_path',
            'last_map' => 'last_map_path',
            'outro' => 'outro_path'
        ];
        
        $filesUpdated = 0;
        
        foreach ($fields as $file_key => $db_field) {
            if (isset($_POST[$file_key . '_temp_path']) && !empty($_POST[$file_key . '_temp_path'])) {
                deleteOldFile($conn, $hard_id, $db_field);
                
                $temp_path = $_POST[$file_key . '_temp_path'];
                $filename = $_POST[$file_key . '_filename'] ?? '';
                
                if (file_exists($temp_path)) {
                    $final_file_path = $final_dir . $filename;
                    if (rename($temp_path, $final_file_path)) {
                        $relative_path = 'uploads/' . $category . '/' . $difficulty . '/' . $hard_id . '/' . $filename;
                        $sql .= ", $db_field = ?";
                        $params[] = $relative_path;
                        $types .= "s";
                        $filesUpdated++;
                    }
                }
            } else if (isset($_POST[$file_key . '_path'])) {
                if (empty($_POST[$file_key . '_path'])) {
                    deleteOldFile($conn, $hard_id, $db_field);
                    $sql .= ", $db_field = ?";
                    $params[] = null;
                    $types .= "s";
                } else {
                    $sql .= ", $db_field = ?";
                    $params[] = $_POST[$file_key . '_path'];
                    $types .= "s";
                }
            }
        }
        
        $sql .= " WHERE hard_id = ?";
        $params[] = $hard_id;
        $types .= "i";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param($types, ...$params);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $conn->commit();
        debugLog("Game updated successfully with ID: $hard_id, Files updated: $filesUpdated");
        
        sendJsonSuccess([
            "message" => "Game updated successfully" . ($filesUpdated > 0 ? " with $filesUpdated files updated" : ""),
            "game_id" => $hard_id,
            "files_updated" => $filesUpdated
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function deleteOldFile($conn, $hard_id, $db_field) {
    $stmt = $conn->prepare("SELECT $db_field FROM game_hard WHERE hard_id = ?");
    if (!$stmt) {
        debugLog("Failed to prepare delete old file statement: " . $conn->error);
        return;
    }
    
    $stmt->bind_param("i", $hard_id);
    $stmt->execute();
    $stmt->bind_result($old_path);
    $stmt->fetch();
    $stmt->close();
    
    if (!empty($old_path)) {
        $full_path = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($old_path, '/');
        if (file_exists($full_path)) {
            unlink($full_path);
            debugLog("Deleted old file: " . $full_path);
        }
    }
}

function deleteGame($conn, $upload_dir, $data) {
    $conn->begin_transaction();
    
    try {
        if (!isset($data['hard_id'])) {
            throw new Exception("Missing hard_id parameter");
        }
        
        $hard_id = intval($data['hard_id']);
        $category = $data['category'] ?? '';
        $difficulty = 'hard';
        
        $stmt = $conn->prepare("
            SELECT 
                map_path, lesson_path, question1_path, achievement1_path, wrong_answer1_path,
                question2_path, achievement2_path, wrong_answer2_path, question3_path, 
                achievement3_path, wrong_answer3_path, final_achievement_path, last_map_path, outro_path 
            FROM game_hard 
            WHERE hard_id = ?
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("i", $hard_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows == 0) {
            throw new Exception("No game found with ID $hard_id");
        }
        
        $row = $result->fetch_assoc();
        $deleted_files = [];
        
        foreach ($row as $field => $path) {
            if (!empty($path)) {
                $full_path = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($path, '/');
                if (file_exists($full_path)) {
                    if (unlink($full_path)) {
                        $deleted_files[] = $path;
                        debugLog("Deleted file: " . $full_path);
                    }
                }
            }
        }
        
        $stmt = $conn->prepare("DELETE FROM game_hard WHERE hard_id = ?");
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("i", $hard_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        if (!empty($category)) {
            $game_dir = $upload_dir . $category . '/' . $difficulty . '/' . $hard_id . '/';
            if (file_exists($game_dir)) {
                $files = glob($game_dir . '*');
                foreach ($files as $file) {
                    if (is_file($file)) unlink($file);
                }
                @rmdir($game_dir);
                debugLog("Cleaned up directory: " . $game_dir);
            }
        }
        
        $conn->commit();
        sendJsonSuccess([
            "message" => "Game deleted successfully",
            "deleted_files" => $deleted_files
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}
?>