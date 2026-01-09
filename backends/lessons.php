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

// Database credentials
$servername = "localhost";
$username = "u572625467_capstone_2";
$password = "Smartstep_2";
$dbname = "u572625467_smartstep";

function debugLog($message) {
    error_log(print_r($message, true));
}

// Handle requests
try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'getVideoLesson':
                $conn = createDBConnection();
                getVideoLesson($conn, $_GET);
                $conn->close();
                break;
                
            case 'getVideo':
                serveVideo($_GET);
                break;
                
            case 'getAllVideoLessons':
                $conn = createDBConnection();
                getAllVideoLessons($conn, $_GET);
                $conn->close();
                break;
            
            default:
                throw new Exception("Invalid GET action: " . $action);
        }
        exit();
    }
    
    // For POST requests (if needed in the future)
    $contentType = isset($_SERVER["CONTENT_TYPE"]) ? $_SERVER["CONTENT_TYPE"] : '';
    $conn = createDBConnection();
    
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new Exception("Invalid JSON input");
        }
        $action = $input['action'] ?? '';
        
        switch ($action) {
            case 'updateVideoLessonStatus':
                updateVideoLessonStatus($conn, $input);
                break;
                
            default:
                throw new Exception("Invalid JSON action: " . $action);
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

function getVideoLesson($conn, $params) {
    $category = $params['category'] ?? '';
    
    if (empty($category)) {
        throw new Exception("Category is required");
    }
    
    debugLog("Getting video lesson for category: " . $category);
    
    // Get the video lesson that is marked as "in use" for this category
    $stmt = $conn->prepare("SELECT videoID, category, video_path, status, created_at, updated_at FROM videolesson WHERE category = ? AND status = 'in use' LIMIT 1");
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $category);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $lesson = $result->fetch_assoc();
    
    if (!$lesson) {
        debugLog("No video lesson found with status 'in use' for category: " . $category);
        echo json_encode(["success" => false, "message" => "No video lesson found for category: " . $category]);
        return;
    }
    
    debugLog("Found video lesson: " . json_encode($lesson));
    echo json_encode(["success" => true, "lesson" => $lesson]);
}

function getAllVideoLessons($conn, $params) {
    $category = $params['category'] ?? '';
    
    $sql = "SELECT videoID, category, video_path, status, created_at, updated_at FROM videolesson";
    $bind_params = [];
    $param_types = "";
    
    if (!empty($category)) {
        $sql .= " WHERE category = ?";
        $bind_params[] = $category;
        $param_types .= "s";
    }
    
    $sql .= " ORDER BY videoID ASC";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    if (!empty($bind_params)) {
        $stmt->bind_param($param_types, ...$bind_params);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $lessons = [];
    
    while ($row = $result->fetch_assoc()) {
        $lessons[] = $row;
    }
    
    echo json_encode(["success" => true, "lessons" => $lessons]);
}

function updateVideoLessonStatus($conn, $data) {
    $videoID = intval($data['videoID']);
    $status = $data['status'] ?? '';
    $category = $data['category'] ?? '';
    
    if (empty($status) || !in_array($status, ['in use', 'not in use'])) {
        throw new Exception("Invalid status. Must be 'in use' or 'not in use'");
    }
    
    debugLog("Updating video lesson status: ID=$videoID, Status=$status, Category=$category");
    
    $conn->begin_transaction();
    
    try {
        // If setting to 'in use', set all other lessons in this category to 'not in use'
        if ($status === 'in use' && !empty($category)) {
            $reset_stmt = $conn->prepare("UPDATE videolesson SET status = 'not in use' WHERE category = ? AND status = 'in use'");
            $reset_stmt->bind_param("s", $category);
            $reset_stmt->execute();
            $reset_stmt->close();
        }
        
        // Update the specific lesson status
        $stmt = $conn->prepare("UPDATE videolesson SET status = ? WHERE videoID = ?");
        $stmt->bind_param("si", $status, $videoID);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $conn->commit();
        
        echo json_encode([
            "success" => true, 
            "message" => "Video lesson status updated successfully",
            "videoID" => $videoID,
            "status" => $status
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function serveVideo($params) {
    $file = $params['file'] ?? '';
    
    if (empty($file)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "File parameter is required"]);
        return;
    }
    
    // Security: Only allow files from uploads directory
    $allowedPath = realpath(__DIR__ . '/uploads/');
    $requestedFile = realpath(__DIR__ . '/' . $file);
    
    if (!$requestedFile || strpos($requestedFile, $allowedPath) !== 0) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "Access denied"]);
        return;
    }
    
    if (!file_exists($requestedFile)) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Video file not found"]);
        return;
    }
    
    // Get file info
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $requestedFile);
    finfo_close($finfo);
    
    // Set appropriate headers for video streaming
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . filesize($requestedFile));
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=3600');
    
    // Handle range requests for video seeking
    if (isset($_SERVER['HTTP_RANGE'])) {
        $range = $_SERVER['HTTP_RANGE'];
        $filesize = filesize($requestedFile);
        
        // Parse range header
        if (preg_match('/bytes=(\d+)-(\d+)?/', $range, $matches)) {
            $start = intval($matches[1]);
            $end = isset($matches[2]) ? intval($matches[2]) : $filesize - 1;
            
            if ($start < $filesize && $end < $filesize && $start <= $end) {
                http_response_code(206); // Partial Content
                header("Content-Range: bytes $start-$end/$filesize");
                header('Content-Length: ' . ($end - $start + 1));
                
                $file_handle = fopen($requestedFile, 'rb');
                fseek($file_handle, $start);
                echo fread($file_handle, $end - $start + 1);
                fclose($file_handle);
                return;
            }
        }
    }
    
    // Serve the entire file
    readfile($requestedFile);
}
?>