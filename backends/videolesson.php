<?php
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
    $logMessage = "[$timestamp] VideoLesson: $message" . PHP_EOL;
    error_log($logMessage);
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
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'getVideoLessons':
                $conn = createDBConnection();
                getVideoLessons($conn, $_GET);
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
            case 'deleteVideoLesson':
                deleteVideoLesson($conn, $upload_dir, $input);
                break;
                
            case 'toggleStatus':
                toggleStatus($conn, $input);
                break;
                
            case 'deactivateAll':
                deactivateAllVideos($conn, $input);
                break;
                
            default:
                sendJsonError("Invalid JSON action: " . $action, 400);
        }
    } else {
        $action = $_POST['action'] ?? '';
        
        switch ($action) {
            case 'addVideoLesson':
                addVideoLesson($conn, $upload_dir);
                break;
                
            case 'updateVideoLesson':
                updateVideoLesson($conn, $upload_dir);
                break;
                
            default:
                sendJsonError("Invalid form action: " . $action, 400);
        }
    }
    
    $conn->close();
    
} catch (Exception $e) {
    debugLog("Exception caught: " . $e->getMessage());
    sendJsonError($e->getMessage());
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

function getVideoLessons($conn, $params) {
    $category = $params['category'] ?? '';
    
    if (empty($category)) {
        sendJsonError("Category is required", 400);
    }
    
    $stmt = $conn->prepare("
        SELECT 
            videoID,
            category,
            video_path,
            status,
            created_at,
            updated_at
        FROM videolesson 
        WHERE category = ?
        ORDER BY videoID DESC
    ");
    
    if (!$stmt) {
        sendJsonError("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $category);
    
    if (!$stmt->execute()) {
        sendJsonError("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    $videoLessons = [];
    while ($row = $result->fetch_assoc()) {
        $videoLesson = [
            'videoID' => intval($row['videoID']),
            'category' => $row['category'],
            'video_path' => $row['video_path'],
            'status' => $row['status'],
            'inUse' => ($row['status'] === 'in use'), // For compatibility with React component
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
        
        $videoLessons[] = $videoLesson;
    }
    
    debugLog("Found " . count($videoLessons) . " video lessons for category: $category");
    sendJsonSuccess(["videoLessons" => $videoLessons]);
}

function uploadVideo($category, $videoID) {
    global $upload_dir;
    
    if (!isset($_FILES['video']) || $_FILES['video']['error'] != UPLOAD_ERR_OK) {
        $error = $_FILES['video']['error'] ?? 'Unknown error';
        if ($error == UPLOAD_ERR_INI_SIZE || $error == UPLOAD_ERR_FORM_SIZE) {
            throw new Exception("Video file is too large. Maximum size allowed is 100MB.");
        } elseif ($error == UPLOAD_ERR_PARTIAL) {
            throw new Exception("Video file was only partially uploaded. Please try again.");
        } elseif ($error == UPLOAD_ERR_NO_FILE) {
            throw new Exception("No video file was uploaded.");
        } else {
            throw new Exception("Upload error. Error code: $error");
        }
    }
    
    $file = $_FILES['video'];
    
    // Validate file size (maximum 100MB)
    $maxFileSizeMB = 100;
    $maxFileSize = $maxFileSizeMB * 1024 * 1024;
    
    if ($file['size'] > $maxFileSize) {
        $fileSizeMB = round($file['size'] / (1024 * 1024), 1);
        throw new Exception("File size ({$fileSizeMB}MB) exceeds {$maxFileSizeMB}MB limit. Please compress your video.");
    }
    
    // Validate MP4 format
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($file_extension !== 'mp4') {
        throw new Exception("Only MP4 video files are supported.");
    }
    
    // Additional MIME type validation for security
    if (class_exists('finfo')) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $file_type = $finfo->file($file['tmp_name']);
        $allowed_types = ['video/mp4'];
        
        if (!in_array($file_type, $allowed_types)) {
            throw new Exception("Invalid file type. Only MP4 video files are allowed.");
        }
    }
    
    // Create organized directory structure: uploads/category/videolesson/videoID/
    $organized_path = $upload_dir . $category . '/videolesson/' . $videoID . '/';
    
    if (!file_exists($organized_path)) {
        if (!mkdir($organized_path, 0755, true)) {
            throw new Exception("Failed to create upload directory");
        }
        debugLog("Created directory: " . $organized_path);
    }
    
    // Create unique filename
    $base_name = pathinfo($file['name'], PATHINFO_FILENAME);
    $safe_base_name = preg_replace('/[^a-zA-Z0-9\.]/', '_', $base_name);
    $file_name = 'videolesson_' . time() . '_' . $safe_base_name . '.mp4';
    $full_file_path = $organized_path . $file_name;
    
    debugLog("Uploading video to: " . $full_file_path . " (Size: " . ($file['size'] / (1024 * 1024)) . "MB)");
    
    if (!move_uploaded_file($file['tmp_name'], $full_file_path)) {
        throw new Exception("Failed to move uploaded file to $full_file_path");
    }
    
    // Verify file was uploaded successfully
    if (!file_exists($full_file_path)) {
        throw new Exception("File upload verification failed");
    }
    
    // Return relative path from document root for database storage
    $relative_path = 'uploads/' . $category . '/videolesson/' . $videoID . '/' . $file_name;
    debugLog("Video uploaded successfully. Relative path: " . $relative_path);
    return $relative_path;
}

function addVideoLesson($conn, $upload_dir) {
    $conn->begin_transaction();
    
    try {
        if (!isset($_POST['category'])) {
            throw new Exception("Category is required");
        }
        
        $category = trim($_POST['category']);
        
        if (empty($category)) {
            throw new Exception("Category cannot be empty");
        }
        
        debugLog("Adding video lesson for category: $category");
        
        // Find next available ID
        $max_id_stmt = $conn->prepare("SELECT MAX(videoID) FROM videolesson");
        if (!$max_id_stmt) {
            throw new Exception("Failed to prepare MAX ID statement: " . $conn->error);
        }
        
        $max_id_stmt->execute();
        $max_id_stmt->bind_result($max_id);
        $max_id_stmt->fetch();
        $max_id_stmt->close();
        
        $videoID = $max_id ? $max_id + 1 : 1;
        debugLog("Generated new videoID: " . $videoID);
        
        // Upload video file
        $video_path = uploadVideo($category, $videoID);
        
        // Insert into database with default status 'not use'
        $stmt = $conn->prepare("
            INSERT INTO videolesson 
            (videoID, category, video_path, status) 
            VALUES (?, ?, ?, 'not use')
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("iss", $videoID, $category, $video_path);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $conn->commit();
        debugLog("Video lesson added successfully with ID: $videoID");
        
        sendJsonSuccess([
            "message" => "Video lesson added successfully",
            "videoID" => $videoID
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        // Clean up uploaded file if database insert failed
        if (isset($category, $videoID)) {
            cleanupFailedUpload($category, $videoID);
        }
        throw $e;
    }
}

function updateVideoLesson($conn, $upload_dir) {
    $conn->begin_transaction();
    
    try {
        if (!isset($_POST['videoID']) || !isset($_POST['category'])) {
            throw new Exception("VideoID and category are required");
        }
        
        $videoID = intval($_POST['videoID']);
        $category = trim($_POST['category']);
        
        if (empty($category)) {
            throw new Exception("Category cannot be empty");
        }
        
        // Check if video lesson exists
        $check_stmt = $conn->prepare("SELECT COUNT(*), video_path FROM videolesson WHERE videoID = ?");
        if (!$check_stmt) {
            throw new Exception("Failed to prepare check statement: " . $conn->error);
        }
        
        $check_stmt->bind_param("i", $videoID);
        $check_stmt->execute();
        $check_stmt->bind_result($count, $old_video_path);
        $check_stmt->fetch();
        $check_stmt->close();
        
        if ($count == 0) {
            throw new Exception("Video lesson with ID $videoID does not exist.");
        }
        
        // Upload new video if provided
        $video_path = null;
        if (isset($_FILES['video']) && $_FILES['video']['error'] == UPLOAD_ERR_OK) {
            // Delete old video file
            if (!empty($old_video_path)) {
                $old_full_path = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($old_video_path, '/');
                if (file_exists($old_full_path)) {
                    unlink($old_full_path);
                    debugLog("Deleted old video: " . $old_full_path);
                }
            }
            
            // Upload new video
            $video_path = uploadVideo($category, $videoID);
        }
        
        // Update database
        if ($video_path) {
            $stmt = $conn->prepare("UPDATE videolesson SET category = ?, video_path = ? WHERE videoID = ?");
            $stmt->bind_param("ssi", $category, $video_path, $videoID);
        } else {
            $stmt = $conn->prepare("UPDATE videolesson SET category = ? WHERE videoID = ?");
            $stmt->bind_param("si", $category, $videoID);
        }
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $conn->commit();
        debugLog("Video lesson updated successfully with ID: $videoID");
        
        sendJsonSuccess([
            "message" => "Video lesson updated successfully",
            "videoID" => $videoID
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function toggleStatus($conn, $data) {
    $conn->begin_transaction();
    
    try {
        if (!isset($data['videoID']) || !isset($data['category'])) {
            throw new Exception("VideoID and category are required");
        }
        
        $videoID = intval($data['videoID']);
        $category = $data['category'];
        
        // Check current status
        $check_stmt = $conn->prepare("SELECT status FROM videolesson WHERE videoID = ?");
        if (!$check_stmt) {
            throw new Exception("Failed to prepare check statement: " . $conn->error);
        }
        
        $check_stmt->bind_param("i", $videoID);
        $check_stmt->execute();
        $check_stmt->bind_result($current_status);
        $check_stmt->fetch();
        $check_stmt->close();
        
        if ($current_status === 'not use') {
            // Setting to 'in use' - check if another video is already active in this category
            $active_check_stmt = $conn->prepare("SELECT COUNT(*), videoID FROM videolesson WHERE category = ? AND status = 'in use' AND videoID != ?");
            if (!$active_check_stmt) {
                throw new Exception("Failed to prepare active check statement: " . $conn->error);
            }
            
            $active_check_stmt->bind_param("si", $category, $videoID);
            $active_check_stmt->execute();
            $active_check_stmt->bind_result($active_count, $active_videoID);
            $active_check_stmt->fetch();
            $active_check_stmt->close();
            
            if ($active_count > 0) {
                // Another video is already active - ask user for confirmation
                sendJsonError("Another video lesson (ID: $active_videoID) is already active in this category. Please confirm if you want to replace it.", 409);
                return;
            }
            
            // Set this video as 'in use'
            $update_stmt = $conn->prepare("UPDATE videolesson SET status = 'in use' WHERE videoID = ?");
            $new_status = 'in use';
        } else {
            // Setting to 'not use'
            $update_stmt = $conn->prepare("UPDATE videolesson SET status = 'not use' WHERE videoID = ?");
            $new_status = 'not use';
        }
        
        if (!$update_stmt) {
            throw new Exception("Failed to prepare update statement: " . $conn->error);
        }
        
        $update_stmt->bind_param("i", $videoID);
        
        if (!$update_stmt->execute()) {
            throw new Exception("Execute statement failed: " . $update_stmt->error);
        }
        
        $conn->commit();
        
        debugLog("Video lesson status toggled for ID: $videoID, new status: $new_status");
        
        sendJsonSuccess([
            "message" => ($new_status === 'in use') ? "Video lesson set as active" : "Video lesson set as inactive",
            "inUse" => ($new_status === 'in use'),
            "status" => $new_status
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function deleteVideoLesson($conn, $upload_dir, $data) {
    $conn->begin_transaction();
    
    try {
        if (!isset($data['videoID'])) {
            throw new Exception("VideoID is required");
        }
        
        $videoID = intval($data['videoID']);
        $category = $data['category'] ?? '';
        
        // Get video path
        $stmt = $conn->prepare("SELECT video_path FROM videolesson WHERE videoID = ?");
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("i", $videoID);
        $stmt->execute();
        $stmt->bind_result($video_path);
        $stmt->fetch();
        $stmt->close();
        
        if (empty($video_path)) {
            throw new Exception("Video lesson not found with ID $videoID");
        }
        
        // Delete video file
        $full_path = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($video_path, '/');
        if (file_exists($full_path)) {
            unlink($full_path);
            debugLog("Deleted video file: " . $full_path);
        }
        
        // Delete from database
        $delete_stmt = $conn->prepare("DELETE FROM videolesson WHERE videoID = ?");
        if (!$delete_stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $delete_stmt->bind_param("i", $videoID);
        
        if (!$delete_stmt->execute()) {
            throw new Exception("Execute statement failed: " . $delete_stmt->error);
        }
        
        // Try to remove empty directory
        if (!empty($category)) {
            $video_dir = $upload_dir . $category . '/videolesson/' . $videoID . '/';
            if (file_exists($video_dir)) {
                $files = glob($video_dir . '*');
                foreach ($files as $file) {
                    if (is_file($file)) unlink($file);
                }
                @rmdir($video_dir);
                debugLog("Cleaned up directory: " . $video_dir);
            }
        }
        
        $conn->commit();
        debugLog("Video lesson deleted successfully with ID: $videoID");
        
        sendJsonSuccess([
            "message" => "Video lesson deleted successfully"
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function cleanupFailedUpload($category, $videoID) {
    global $upload_dir;
    $video_dir = $upload_dir . $category . '/videolesson/' . $videoID . '/';
    
    if (file_exists($video_dir)) {
        $files = glob($video_dir . '*');
        foreach ($files as $file) {
            if (is_file($file)) unlink($file);
        }
        @rmdir($video_dir);
        debugLog("Cleaned up failed upload directory: " . $video_dir);
    }
}

function deactivateAllVideos($conn, $data) {
    $conn->begin_transaction();
    
    try {
        if (!isset($data['category'])) {
            throw new Exception("Category is required");
        }
        
        $category = $data['category'];
        
        $stmt = $conn->prepare("UPDATE videolesson SET status = 'not use' WHERE category = ?");
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("s", $category);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $conn->commit();
        debugLog("All video lessons deactivated for category: $category");
        
        sendJsonSuccess([
            "message" => "All video lessons deactivated"
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}
?>