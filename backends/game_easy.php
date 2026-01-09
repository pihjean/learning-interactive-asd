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

// PHP limits - these should match or be lower than Hostinger's settings
ini_set('memory_limit', '1536M');
ini_set('max_execution_time', 1800);
ini_set('post_max_size', '1536M');
ini_set('upload_max_filesize', '1536M');
ini_set('max_file_uploads', 20);
ini_set('max_input_time', 1800);
ini_set('default_socket_timeout', 1800);

// Database credentials
$servername = "localhost";
$username = "u572625467_capstone_2";
$password = "Smartstep_2";
$dbname = "u572625467_smartstep";

// Use absolute path on Hostinger server
$upload_dir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/';

// Create upload directory if it doesn't exist
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

function debugLog($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message" . PHP_EOL;
    error_log($logMessage);
    
    $debugFile = $_SERVER['DOCUMENT_ROOT'] . '/debug_game_easy.log';
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
    debugLog("Content length: " . ($_SERVER['CONTENT_LENGTH'] ?? 'Not set'));
    debugLog("Content type: " . ($_SERVER['CONTENT_TYPE'] ?? 'Not set'));
    
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
    
    $temp_dir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/temp/';
    if (!file_exists($temp_dir)) {
        mkdir($temp_dir, 0755, true);
    }
    
    $chunk_dir = $temp_dir . $fileId . '/';
    if (!file_exists($chunk_dir)) {
        mkdir($chunk_dir, 0755, true);
    }
    
    if (!isset($_FILES['chunk'])) {
        sendJsonError("No chunk file received", 400);
    }
    
    $chunk_path = $chunk_dir . 'chunk_' . $chunkIndex;
    if (!move_uploaded_file($_FILES['chunk']['tmp_name'], $chunk_path)) {
        sendJsonError("Failed to save chunk", 500);
    }
    
    debugLog("Saved chunk $chunkIndex of $totalChunks for file $fileName");
    
    if ($chunkIndex == $totalChunks - 1) {
        $field_name = $_POST['field_name'] ?? '';
        
        if (!$field_name) {
            sendJsonError("Missing field_name parameter", 400);
        }
        
        $safe_filename = $field_name . '_' . time() . '_' . preg_replace('/[^a-zA-Z0-9\.]/', '_', pathinfo($fileName, PATHINFO_FILENAME)) . '.mp4';
        $temp_merged_path = $temp_dir . $fileId . '_' . $safe_filename;
        
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
        throw new Exception("Category is required");
    }
    
    $stmt = $conn->prepare("
        SELECT 
            easy_id, 
            correct_answer,
            wrong_answer1,
            wrong_answer2,
            map_path,
            introduction_path,
            lesson_path,
            question_path,
            achievement_path,
            wrong_answer_path
        FROM game_easy 
        WHERE category = ?
        ORDER BY easy_id ASC
    ");
    
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $category);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    $games = [];
    while ($row = $result->fetch_assoc()) {
        $game = [
            'easy_id' => intval($row['easy_id']),
            'correct_answer' => $row['correct_answer'],
            'wrong_answer1' => $row['wrong_answer1'],
            'wrong_answer2' => $row['wrong_answer2']
        ];
        
        // Add media paths if they exist
        if (!empty($row['introduction_path'])) {
            $game['introduction'] = ['path' => $row['introduction_path']];
        }
        
        if (!empty($row['map_path'])) {
            $game['map'] = ['path' => $row['map_path']];
        }
        
        if (!empty($row['lesson_path'])) {
            $game['lesson'] = ['path' => $row['lesson_path']];
        }
        
        if (!empty($row['question_path'])) {
            $game['question'] = ['path' => $row['question_path']];
        }
        
        if (!empty($row['achievement_path'])) {
            $game['achievement'] = ['path' => $row['achievement_path']];
        }
        
        if (!empty($row['wrong_answer_path'])) {
            $game['wrong_answer'] = ['path' => $row['wrong_answer_path']];
        }
        
        $games[] = $game;
    }
    
    sendJsonSuccess(["games" => $games]);
}

function uploadFile($file_key, $category, $difficulty, $game_id) {
    global $upload_dir;
    
    if (!isset($_FILES[$file_key]) || $_FILES[$file_key]['error'] != UPLOAD_ERR_OK) {
        return '';
    }
    
    $file = $_FILES[$file_key];
    
    // Validate file size (maximum 500MB)
    $maxFileSizeMB = 500;
    $maxFileSize = $maxFileSizeMB * 1024 * 1024;
    
    if ($file['size'] > $maxFileSize) {
        $fileSizeMB = round($file['size'] / (1024 * 1024), 1);
        throw new Exception("File size for $file_key ({$fileSizeMB}MB) exceeds {$maxFileSizeMB}MB limit. Please compress your video.");
    }
    
    // Validate MP4 format
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($file_extension !== 'mp4') {
        throw new Exception("Only MP4 video files are supported for $file_key.");
    }
    
    // Additional MIME type validation for security
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $file_type = $finfo->file($file['tmp_name']);
    $allowed_types = ['video/mp4'];
    
    if (!in_array($file_type, $allowed_types)) {
        throw new Exception("Invalid file type for $file_key. Only MP4 video files are allowed.");
    }
    
    // Create organized directory structure: uploads/Colors/easy/1/
    $organized_path = $upload_dir . $category . '/' . $difficulty . '/' . $game_id . '/';
    
    if (!file_exists($organized_path)) {
        mkdir($organized_path, 0755, true);
        debugLog("Created directory: " . $organized_path);
    }
    
    // Create unique filename
    $base_name = pathinfo($file['name'], PATHINFO_FILENAME);
    $safe_base_name = preg_replace('/[^a-zA-Z0-9\.]/', '_', $base_name);
    $file_name = $file_key . '_' . time() . '_' . $safe_base_name . '.mp4';
    $full_file_path = $organized_path . $file_name;
    
    debugLog("Uploading file to: " . $full_file_path . " (Size: " . ($file['size'] / (1024 * 1024)) . "MB)");
    
    // Use chunked upload for files larger than 50MB
    if ($file['size'] > 50 * 1024 * 1024) {
        if (!moveUploadedFileChunked($file['tmp_name'], $full_file_path)) {
            throw new Exception("Failed to move uploaded file to $full_file_path using chunked transfer");
        }
    } else {
        if (!move_uploaded_file($file['tmp_name'], $full_file_path)) {
            throw new Exception("Failed to move uploaded file to $full_file_path");
        }
    }
    
    // Verify file was uploaded successfully
    if (!file_exists($full_file_path)) {
        throw new Exception("File upload verification failed for $file_key");
    }
    
    // Return relative path from document root for database storage
    $relative_path = 'uploads/' . $category . '/' . $difficulty . '/' . $game_id . '/' . $file_name;
    debugLog("File uploaded successfully. Relative path: " . $relative_path);
    return $relative_path;
}

function moveUploadedFileChunked($source, $destination) {
    $sourceHandle = fopen($source, 'rb');
    $destHandle = fopen($destination, 'wb');
    
    if (!$sourceHandle || !$destHandle) {
        if ($sourceHandle) fclose($sourceHandle);
        if ($destHandle) fclose($destHandle);
        return false;
    }
    
    $chunkSize = 1024 * 1024;
    
    while (!feof($sourceHandle)) {
        $chunk = fread($sourceHandle, $chunkSize);
        if ($chunk === false) {
            fclose($sourceHandle);
            fclose($destHandle);
            unlink($destination);
            return false;
        }
        
        if (fwrite($destHandle, $chunk) === false) {
            fclose($sourceHandle);
            fclose($destHandle);
            unlink($destination);
            return false;
        }
    }
    
    fclose($sourceHandle);
    fclose($destHandle);
    
    unlink($source);
    
    return true;
}

function addGame($conn, $upload_dir) {
    if (!$conn || $conn->connect_error) {
        throw new Exception("Database connection lost: " . ($conn->connect_error ?? 'Unknown error'));
    }
    
    $conn->begin_transaction();
    
    try {
        set_time_limit(600);
        
        if (!isset($_POST['correct_answer'], $_POST['wrong_answer1'], $_POST['category'])) {
            throw new Exception("Missing required fields: correct_answer, wrong_answer1, or category");
        }
        
        $correct_answer = trim($_POST['correct_answer']);
        $wrong_answer1 = trim($_POST['wrong_answer1']);
        $wrong_answer2 = trim($_POST['wrong_answer2'] ?? '');
        $category = trim($_POST['category']);
        $difficulty = trim($_POST['difficulty'] ?? 'easy');
        
        // Validate required fields
        if (empty($correct_answer)) {
            throw new Exception("Correct answer is required");
        }
        
        if (empty($wrong_answer1)) {
            throw new Exception("At least one wrong answer is required");
        }
        
        debugLog("Starting addGame for category: $category");
        
        // Find next available ID
        $max_id_stmt = $conn->prepare("SELECT MAX(easy_id) FROM game_easy");
        if (!$max_id_stmt) {
            throw new Exception("Failed to prepare MAX ID statement: " . $conn->error);
        }
        
        $max_id_stmt->execute();
        $max_id_stmt->bind_result($max_id);
        $max_id_stmt->fetch();
        $max_id_stmt->close();
        
        $easy_id = $max_id ? $max_id + 1 : 1;
        debugLog("Generated new easy_id: " . $easy_id);
        
        $final_dir = $upload_dir . $category . '/' . $difficulty . '/' . $easy_id . '/';
        if (!file_exists($final_dir)) {
            if (!mkdir($final_dir, 0755, true)) {
                throw new Exception("Failed to create final directory");
            }
            debugLog("Created directory: " . $final_dir);
        }
        
        $fileFields = ['introduction', 'map', 'lesson', 'question', 'achievement', 'wrong_answer'];
        
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
                
                $final_file_path = $final_dir . $filename;
                if (!rename($temp_path, $final_file_path)) {
                    $error = error_get_last();
                    throw new Exception("Failed to move file from temp to final location for $field. Error: " . ($error['message'] ?? 'Unknown error'));
                }
                
                $relative_path = 'uploads/' . $category . '/' . $difficulty . '/' . $easy_id . '/' . $filename;
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
        
        debugLog("Preparing database insert for easy_id: $easy_id");
        
        // Insert into database with status column
        $stmt = $conn->prepare("
            INSERT INTO game_easy 
            (easy_id, correct_answer, wrong_answer1, wrong_answer2, category, status,
             introduction_path, map_path, lesson_path, question_path, achievement_path, wrong_answer_path) 
            VALUES (?, ?, ?, ?, ?, 'not in use', ?, ?, ?, ?, ?, ?)
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
        
        $stmt->bind_param("issssssssss", 
            $easy_id,
            $correct_answer,
            $wrong_answer1,
            $wrong_answer2,
            $category,
            $fileUploads['introduction'],
            $fileUploads['map'],
            $fileUploads['lesson'],
            $fileUploads['question'],
            $fileUploads['achievement'],
            $fileUploads['wrong_answer']
        );
        
        debugLog("Executing database insert");
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        if ($stmt->affected_rows <= 0) {
            throw new Exception("Database insert failed - no rows affected");
        }
        
        $stmt->close();
        
        debugLog("Committing database transaction");
        if (!$conn->commit()) {
            throw new Exception("Database commit failed: " . $conn->error);
        }
        
        debugLog("Game added successfully with ID: $easy_id");
        
        sendJsonSuccess([
            "message" => "Game added successfully with $uploadedCount files uploaded",
            "game_id" => $easy_id,
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
        $easy_id = intval($_POST['easy_id']);
        $correct_answer = $_POST['correct_answer'];
        $wrong_answer1 = $_POST['wrong_answer1'];
        $wrong_answer2 = $_POST['wrong_answer2'] ?? '';
        $category = $_POST['category'];
        $difficulty = $_POST['difficulty'];
        
        // Validate required fields
        if (empty($correct_answer)) {
            throw new Exception("Correct answer is required");
        }
        
        if (empty($wrong_answer1)) {
            throw new Exception("At least one wrong answer is required");
        }
        
        // Check if game exists
        $check_stmt = $conn->prepare("SELECT COUNT(*) FROM game_easy WHERE easy_id = ?");
        $check_stmt->bind_param("i", $easy_id);
        $check_stmt->execute();
        $check_stmt->bind_result($count);
        $check_stmt->fetch();
        $check_stmt->close();
        
        if ($count == 0) {
            throw new Exception("Game with ID $easy_id does not exist.");
        }
        
        $final_dir = $upload_dir . $category . '/' . $difficulty . '/' . $easy_id . '/';
        if (!file_exists($final_dir)) {
            mkdir($final_dir, 0755, true);
        }
        
        // Build dynamic SQL update
        $sql = "UPDATE game_easy SET correct_answer = ?, wrong_answer1 = ?, wrong_answer2 = ?, category = ?";
        $params = [$correct_answer, $wrong_answer1, $wrong_answer2, $category];
        $types = "ssss";
        
        $fields = [
            'introduction' => 'introduction_path',
            'map' => 'map_path',
            'lesson' => 'lesson_path',
            'question' => 'question_path',
            'achievement' => 'achievement_path',
            'wrong_answer' => 'wrong_answer_path'
        ];
        
        $filesUpdated = 0;
        
        foreach ($fields as $file_key => $db_field) {
            if (isset($_POST[$file_key . '_temp_path']) && !empty($_POST[$file_key . '_temp_path'])) {
                deleteOldFile($conn, $easy_id, $db_field);
                
                $temp_path = $_POST[$file_key . '_temp_path'];
                $filename = $_POST[$file_key . '_filename'] ?? '';
                
                // Handle both absolute and relative paths
                if (!file_exists($temp_path)) {
                    $full_temp_path = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($temp_path, '/');
                    if (file_exists($full_temp_path)) {
                        $temp_path = $full_temp_path;
                    }
                }
                
                if (file_exists($temp_path)) {
                    $final_file_path = $final_dir . $filename;
                    if (rename($temp_path, $final_file_path)) {
                        $relative_path = 'uploads/' . $category . '/' . $difficulty . '/' . $easy_id . '/' . $filename;
                        $sql .= ", $db_field = ?";
                        $params[] = $relative_path;
                        $types .= "s";
                        $filesUpdated++;
                    }
                }
            } else if (isset($_POST[$file_key . '_path'])) {
                if (empty($_POST[$file_key . '_path'])) {
                    deleteOldFile($conn, $easy_id, $db_field);
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
        
        $sql .= " WHERE easy_id = ?";
        $params[] = $easy_id;
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
        debugLog("Game updated successfully with ID: $easy_id");
        
        sendJsonSuccess([
            "message" => "Game updated successfully",
            "game_id" => $easy_id
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function deleteOldFile($conn, $easy_id, $db_field) {
    $stmt = $conn->prepare("SELECT $db_field FROM game_easy WHERE easy_id = ?");
    $stmt->bind_param("i", $easy_id);
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
        $easy_id = intval($data['easy_id']);
        $category = $data['category'];
        $difficulty = $data['difficulty'];
        
        // Get file paths
        $stmt = $conn->prepare("
            SELECT 
                introduction_path, map_path, lesson_path, 
                question_path, achievement_path, wrong_answer_path 
            FROM game_easy 
            WHERE easy_id = ?
        ");
        
        $stmt->bind_param("i", $easy_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows == 0) {
            throw new Exception("No game found with ID $easy_id");
        }
        
        $row = $result->fetch_assoc();
        $deleted_files = [];
        
        // Delete files from organized structure
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
        
        // Delete from database
        $stmt = $conn->prepare("DELETE FROM game_easy WHERE easy_id = ?");
        $stmt->bind_param("i", $easy_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        // Try to remove empty game directory
        $game_dir = $upload_dir . $category . '/' . $difficulty . '/' . $easy_id . '/';
        if (file_exists($game_dir)) {
            $files = glob($game_dir . '*');
            foreach ($files as $file) {
                if (is_file($file)) unlink($file);
            }
            @rmdir($game_dir);
            debugLog("Cleaned up directory: " . $game_dir);
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

function cleanupFailedUpload($category, $difficulty, $game_id) {
    if (!$game_id) return;
    
    global $upload_dir;
    $game_dir = $upload_dir . $category . '/' . $difficulty . '/' . $game_id . '/';
    
    if (file_exists($game_dir)) {
        $files = glob($game_dir . '*');
        foreach ($files as $file) {
            if (is_file($file)) unlink($file);
        }
        @rmdir($game_dir);
        debugLog("Cleaned up failed upload directory: " . $game_dir);
    }
}
?>