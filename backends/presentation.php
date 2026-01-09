<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Increase PHP limits for handling large video files
ini_set('memory_limit', '1024M');
ini_set('max_execution_time', 600);
ini_set('post_max_size', '1024M');
ini_set('upload_max_filesize', '1024M');

// Database credentials
$servername = "localhost";
$username = "u572625467_capstone_2";
$password = "Smartstep_2";
$dbname = "u572625467_smartstep";

// Upload directory for presentations
$upload_dir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/';

// Create upload directory if it doesn't exist
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

function debugLog($message) {
    error_log(print_r($message, true));
}

// Handle requests
try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'getPresentations':
                $conn = createDBConnection();
                getPresentations($conn, $_GET);
                $conn->close();
                break;
                
            case 'getVideo':
                streamVideo($_GET);
                break;
            
            default:
                throw new Exception("Invalid GET action: " . $action);
        }
        exit();
    }
    
    // For POST requests
    $contentType = isset($_SERVER["CONTENT_TYPE"]) ? $_SERVER["CONTENT_TYPE"] : '';
    $conn = createDBConnection();
    
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new Exception("Invalid JSON input");
        }
        $action = $input['action'] ?? '';
        
        switch ($action) {
            case 'deletePresentation':
                deletePresentation($conn, $upload_dir, $input);
                break;
                
            case 'toggleStatus':
                togglePresentationStatus($conn, $input);
                break;
                
            default:
                throw new Exception("Invalid JSON action: " . $action);
        }
    } else {
        $action = $_POST['action'] ?? '';
        
        switch ($action) {
            case 'addPresentation':
                addPresentation($conn, $upload_dir);
                break;
                
            case 'updatePresentation':
                updatePresentation($conn, $upload_dir);
                break;
                
            default:
                throw new Exception("Invalid form action: " . $action);
        }
    }
    
    $conn->close();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} 

function createDBConnection() {
    global $servername, $username, $password, $dbname;
    
    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
        exit();
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
    
    // Sanitize file path
    $filePath = str_replace('..', '', $filePath);
    $filePath = str_replace('//', '/', $filePath);
    
    $fullPath = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($filePath, '/');
    
    debugLog("Streaming presentation video from: " . $fullPath);
    
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
        $buffer = 1024 * 8;
        
        while (!feof($fp) && connection_status() == 0) {
            echo fread($fp, $buffer);
            ob_flush();
            flush();
        }
        
        fclose($fp);
    } else {
        readfile($fullPath);
    }
    
    exit;
}

function getPresentations($conn, $params) {
    $category = $params['category'] ?? '';
    
    if (empty($category)) {
        throw new Exception("Category is required");
    }
    
    $stmt = $conn->prepare("
        SELECT 
            presentation_id, 
            category,
            video_path,
            status
        FROM presentation 
        WHERE category = ?
        ORDER BY presentation_id ASC
    ");
    
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $category);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    $presentations = [];
    while ($row = $result->fetch_assoc()) {
        $presentation = [
            'presentation_id' => intval($row['presentation_id']),
            'category' => $row['category'],
            'status' => intval($row['status']),
            'inUse' => intval($row['status']) === 1
        ];
        
        // Add video path if it exists
        if (!empty($row['video_path'])) {
            $presentation['video_path'] = $row['video_path'];
            $presentation['videoUrl'] = $row['video_path'];
        }
        
        $presentations[] = $presentation;
    }
    
    // Return success even if no presentations found
    echo json_encode([
        "success" => true, 
        "presentations" => $presentations,
        "count" => count($presentations),
        "message" => count($presentations) == 0 ? "No presentations found for category: $category" : "Presentations loaded successfully"
    ]);
}

function uploadPresentationVideo($category) {
    global $upload_dir;
    
    if (!isset($_FILES['video']) || $_FILES['video']['error'] != UPLOAD_ERR_OK) {
        throw new Exception("No video file uploaded or upload error occurred");
    }
    
    $file = $_FILES['video'];
    
    // Validate MP4 format
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($file_extension !== 'mp4') {
        throw new Exception("Only MP4 video files are supported.");
    }
    
    $file_type = mime_content_type($file['tmp_name']);
    $allowed_types = ['video/mp4'];
    
    if (!in_array($file_type, $allowed_types)) {
        throw new Exception("Invalid file type. Only MP4 video files are allowed.");
    }
    
    // Create presentation directory structure: uploads/Colors/presentation/
    $presentation_path = $upload_dir . $category . '/presentation/';
    
    if (!file_exists($presentation_path)) {
        mkdir($presentation_path, 0755, true);
        debugLog("Created presentation directory: " . $presentation_path);
    }
    
    // Create unique filename with timestamp
    $base_name = pathinfo($file['name'], PATHINFO_FILENAME);
    $safe_base_name = preg_replace('/[^a-zA-Z0-9\.]/', '_', $base_name);
    $file_name = 'video_' . time() . '_' . $safe_base_name . '.mp4';
    $full_file_path = $presentation_path . $file_name;
    
    debugLog("Uploading presentation video to: " . $full_file_path);
    
    if (move_uploaded_file($file['tmp_name'], $full_file_path)) {
        // Return relative path from document root for database storage
        $relative_path = 'uploads/' . $category . '/presentation/' . $file_name;
        debugLog("Presentation video uploaded successfully. Relative path: " . $relative_path);
        return $relative_path;
    } else {
        throw new Exception("Failed to move uploaded file to $full_file_path");
    }
}

function addPresentation($conn, $upload_dir) {
    $conn->begin_transaction();
    
    try {
        $category = $_POST['category'];
        
        if (empty($category)) {
            throw new Exception("Category is required");
        }
        
        // Upload the video file
        $video_path = uploadPresentationVideo($category);
        
        // Insert into database - status defaults to 0 (not in use)
        $stmt = $conn->prepare("
            INSERT INTO presentation 
            (category, video_path, status) 
            VALUES (?, ?, 0)
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("ss", $category, $video_path);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $presentation_id = $conn->insert_id;
        
        $conn->commit();
        echo json_encode([
            "success" => true, 
            "message" => "Presentation video added successfully",
            "presentation_id" => $presentation_id
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        // Clean up uploaded file if database insert failed
        if (isset($video_path)) {
            $full_path = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($video_path, '/');
            if (file_exists($full_path)) {
                unlink($full_path);
            }
        }
        throw $e;
    }
}

function updatePresentation($conn, $upload_dir) {
    $conn->begin_transaction();
    
    try {
        $presentation_id = intval($_POST['presentation_id']);
        $category = $_POST['category'];
        
        if (empty($category) || $presentation_id <= 0) {
            throw new Exception("Valid presentation ID and category are required");
        }
        
        // Check if presentation exists
        $check_stmt = $conn->prepare("SELECT video_path FROM presentation WHERE presentation_id = ?");
        $check_stmt->bind_param("i", $presentation_id);
        $check_stmt->execute();
        $check_stmt->bind_result($old_video_path);
        $check_stmt->fetch();
        $check_stmt->close();
        
        if ($old_video_path === null) {
            throw new Exception("Presentation with ID $presentation_id does not exist.");
        }
        
        // Check if a new video file was uploaded
        if (isset($_FILES['video']) && $_FILES['video']['error'] == UPLOAD_ERR_OK) {
            // Upload new video
            $new_video_path = uploadPresentationVideo($category);
            
            // Delete old video file
            if (!empty($old_video_path)) {
                $old_full_path = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($old_video_path, '/');
                if (file_exists($old_full_path)) {
                    unlink($old_full_path);
                    debugLog("Deleted old presentation video: " . $old_full_path);
                }
            }
            
            // Update database with new video path
            $stmt = $conn->prepare("UPDATE presentation SET video_path = ?, category = ? WHERE presentation_id = ?");
            $stmt->bind_param("ssi", $new_video_path, $category, $presentation_id);
        } else {
            // Just update category if no new video
            $stmt = $conn->prepare("UPDATE presentation SET category = ? WHERE presentation_id = ?");
            $stmt->bind_param("si", $category, $presentation_id);
        }
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $conn->commit();
        echo json_encode([
            "success" => true, 
            "message" => "Presentation updated successfully",
            "presentation_id" => $presentation_id
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function togglePresentationStatus($conn, $data) {
    $conn->begin_transaction();
    
    try {
        $presentation_id = intval($data['presentation_id']);
        $category = $data['category'];
        
        if ($presentation_id <= 0 || empty($category)) {
            throw new Exception("Valid presentation ID and category are required");
        }
        
        // Get current status
        $stmt = $conn->prepare("SELECT status FROM presentation WHERE presentation_id = ? AND category = ?");
        $stmt->bind_param("is", $presentation_id, $category);
        $stmt->execute();
        $stmt->bind_result($current_status);
        $stmt->fetch();
        $stmt->close();
        
        if ($current_status === null) {
            throw new Exception("Presentation not found");
        }
        
        $new_status = $current_status == 1 ? 0 : 1;
        
        // If setting to "in use", first set all other presentations in this category to "not in use"
        if ($new_status == 1) {
            $stmt = $conn->prepare("UPDATE presentation SET status = 0 WHERE category = ?");
            $stmt->bind_param("s", $category);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to update other presentations: " . $stmt->error);
            }
            
            debugLog("Set all other presentations in category '$category' to not in use");
        }
        
        // Update the selected presentation
        $stmt = $conn->prepare("UPDATE presentation SET status = ? WHERE presentation_id = ?");
        $stmt->bind_param("ii", $new_status, $presentation_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $conn->commit();
        echo json_encode([
            "success" => true, 
            "message" => "Presentation status updated successfully",
            "new_status" => $new_status,
            "inUse" => $new_status == 1
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function deletePresentation($conn, $upload_dir, $data) {
    $conn->begin_transaction();
    
    try {
        $presentation_id = intval($data['presentation_id']);
        $category = $data['category'];
        
        if ($presentation_id <= 0 || empty($category)) {
            throw new Exception("Valid presentation ID and category are required");
        }
        
        // Get the video path
        $stmt = $conn->prepare("SELECT video_path FROM presentation WHERE presentation_id = ? AND category = ?");
        $stmt->bind_param("is", $presentation_id, $category);
        $stmt->execute();
        $stmt->bind_result($video_path);
        $stmt->fetch();
        $stmt->close();
        
        if ($video_path === null) {
            throw new Exception("Presentation not found");
        }
        
        // Delete the video file
        if (!empty($video_path)) {
            $full_path = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($video_path, '/');
            if (file_exists($full_path)) {
                if (unlink($full_path)) {
                    debugLog("Deleted presentation video file: " . $full_path);
                } else {
                    debugLog("Failed to delete presentation video file: " . $full_path);
                }
            }
        }
        
        // Delete from database
        $stmt = $conn->prepare("DELETE FROM presentation WHERE presentation_id = ?");
        $stmt->bind_param("i", $presentation_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $conn->commit();
        echo json_encode([
            "success" => true, 
            "message" => "Presentation deleted successfully"
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}
?>