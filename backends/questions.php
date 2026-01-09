<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Increase PHP limits for handling large files
ini_set('memory_limit', '256M');
ini_set('max_execution_time', 300); // 5 minutes
ini_set('post_max_size', '64M');
ini_set('upload_max_filesize', '64M');

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

// Set character set
$conn->set_charset("utf8mb4");

// Handle media retrieval (GET request)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id']) && isset($_GET['field'])) {
    getMedia($conn, $_GET['id'], $_GET['field']);
    exit();
}

// For all other operations, expect a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit();
}

try {
    // Check if it's a form submission (file upload) or JSON
    if (isset($_FILES['media']) || isset($_FILES['image1']) || isset($_FILES['image2']) || isset($_FILES['image3'])) {
        $action = $_POST['action'];
    } else {
        // Parse JSON input for non-file requests
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input && !isset($_POST['action'])) {
            throw new Exception("Invalid input data");
        }
        $action = isset($_POST['action']) ? $_POST['action'] : $input['action'];
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    switch ($action) {
        case 'getQuestions':
            getQuestions($conn, $input);
            break;
            
        case 'addQuestion':
            addQuestion($conn);
            break;
            
        case 'updateQuestion':
            updateQuestion($conn);
            break;
            
        case 'deleteQuestion':
            deleteQuestion($conn, $input);
            break;
            
        default:
            throw new Exception("Invalid action: " . $action);
    }
    
} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    $conn->close();
}

/**
 * Retrieve and output media content from the database
 * 
 * @param mysqli $conn Database connection
 * @param int $questionID Question ID
 * @param string $field Field name (media, image1, image2, image3)
 */
function getMedia($conn, $questionID, $field) {
    // Validate the field parameter to prevent SQL injection
    $validFields = ['media', 'image1', 'image2', 'image3'];
    if (!in_array($field, $validFields)) {
        http_response_code(400);
        die("Invalid field parameter");
    }

    try {
        // Prepare query to get the media content and type
        $stmt = $conn->prepare("
            SELECT 
                {$field}_content as content, 
                CASE 
                    WHEN '{$field}' = 'media' THEN media_type 
                    ELSE 'image' 
                END as media_type
            FROM questions 
            WHERE questionID = ?
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("i", $questionID);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows === 0) {
            http_response_code(404);
            die("Media not found");
        }
        
        $stmt->bind_result($content, $mediaType);
        $stmt->fetch();
        
        // Check if content exists
        if (empty($content)) {
            http_response_code(404);
            die("Media content not found");
        }
        
        // Set appropriate content type header
        if ($mediaType === 'image') {
            // Try to determine image type from content
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->buffer($content);
            
            if (strpos($mime, 'image/') === 0) {
                header('Content-Type: ' . $mime);
            } else {
                // Default to JPEG if we can't determine or it's not an image
                header('Content-Type: image/jpeg');
            }
            
            // Set cache control for images
            header('Cache-Control: max-age=86400, public');
        } else if ($mediaType === 'video') {
            // Set video content type
            header('Content-Type: video/mp4');
            header('Accept-Ranges: bytes');
            header('Cache-Control: max-age=2592000, public');
        } else {
            http_response_code(500);
            die("Unknown media type: " . $mediaType);
        }
        
        // Always set content length
        header('Content-Length: ' . strlen($content));
        
        // Disable caching for development, enable for production
        if ($_SERVER['SERVER_NAME'] === 'localhost') {
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
        }
        
        // Output the media content
        echo $content;
        
    } catch (Exception $e) {
        http_response_code(500);
        die("Error retrieving media: " . $e->getMessage());
    }
}
/**
 * Fetch questions based on category and difficulty
 * 
 * @param mysqli $conn Database connection
 * @param array $input Input data
 */
function getQuestions($conn, $input) {
    // Get parameters
    $category = isset($_POST['category']) ? $_POST['category'] : $input['category'];
    $difficulty = isset($_POST['difficulty']) ? $_POST['difficulty'] : $input['difficulty'];
    
    try {
        // Prepare and execute query
        $query = "
            SELECT 
                questionID, question, answer, category, difficulty, type, 
                media_type,
                CASE WHEN media_content IS NOT NULL THEN 1 ELSE 0 END as has_media,
                CASE WHEN image1_content IS NOT NULL THEN 1 ELSE 0 END as has_image1,
                CASE WHEN image2_content IS NOT NULL THEN 1 ELSE 0 END as has_image2,
                CASE WHEN image3_content IS NOT NULL THEN 1 ELSE 0 END as has_image3,
                uid1, uid2, uid3
            FROM questions 
            WHERE category = ? AND difficulty = ?
            ORDER BY questionID DESC
        ";
        
        $stmt = $conn->prepare($query);
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("ss", $category, $difficulty);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        
        $questions = [];
        while ($row = $result->fetch_assoc()) {
            // Generate URLs for media content if they exist
            if ($row['has_media']) {
                $row['media_url'] = "questions.php?id={$row['questionID']}&field=media";
            }
            
            if ($row['has_image1']) {
                $row['image1_url'] = "questions.php?id={$row['questionID']}&field=image1";
            }
            
            if ($row['has_image2']) {
                $row['image2_url'] = "questions.php?id={$row['questionID']}&field=image2";
            }
            
            if ($row['has_image3']) {
                $row['image3_url'] = "questions.php?id={$row['questionID']}&field=image3";
            }
            
            // Remove binary indicators from the response
            unset($row['has_media']);
            unset($row['has_image1']);
            unset($row['has_image2']);
            unset($row['has_image3']);
            
            $questions[] = $row;
        }
        
        $conn->commit();
        echo json_encode(["success" => true, "questions" => $questions]);
    } catch (Exception $e) {
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
}

/**
 * Add a new question to the database
 * 
 * @param mysqli $conn Database connection
 */
function addQuestion($conn) {
    // Get form data
    $question = $_POST['question'];
    $answer = $_POST['answer'];
    $category = $_POST['category'];
    $difficulty = $_POST['difficulty'];
    $type = $_POST['type'];
    
    // Determine if it's a match type question
    $isMatchType = ($type === 'matchType');
    
    // Set media type based on question type
    $mediaType = 'none';
    if (!$isMatchType && isset($_FILES['media']) && $_FILES['media']['size'] > 0) {
        $fileType = mime_content_type($_FILES['media']['tmp_name']);
        $mediaType = strpos($fileType, 'image') !== false ? 'image' : 'video';
    } else if ($isMatchType) {
        // For match type, always set media_type to 'image'
        $mediaType = 'image';
    }
    
    // Insert basic question data
    if ($isMatchType) {
        $stmt = $conn->prepare("
            INSERT INTO questions 
            (question, answer, category, difficulty, type, media_type, uid1, uid2, uid3) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $uid1 = $_POST['uid1'];
        $uid2 = $_POST['uid2'];
        $uid3 = $_POST['uid3'];
        
        $stmt->bind_param("sssssssss", 
            $question, $answer, $category, $difficulty, $type, $mediaType, $uid1, $uid2, $uid3
        );
    } else {
        $stmt = $conn->prepare("
            INSERT INTO questions 
            (question, answer, category, difficulty, type, media_type) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("ssssss", 
            $question, $answer, $category, $difficulty, $type, $mediaType
        );
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Error adding question: " . $stmt->error);
    }
    
    $questionID = $conn->insert_id;
    
    // Handle media uploads
    if ($isMatchType) {
        // Process match type images
        if (isset($_FILES['image1']) && $_FILES['image1']['size'] > 0) {
            handleMediaUpload($conn, $_FILES['image1'], 'image1', $questionID);
        }
        
        if (isset($_FILES['image2']) && $_FILES['image2']['size'] > 0) {
            handleMediaUpload($conn, $_FILES['image2'], 'image2', $questionID);
        }
        
        if (isset($_FILES['image3']) && $_FILES['image3']['size'] > 0) {
            handleMediaUpload($conn, $_FILES['image3'], 'image3', $questionID);
        }
    } else {
        // Process single media (image or video)
        if (isset($_FILES['media']) && $_FILES['media']['size'] > 0) {
            $mediaType = handleMediaUpload($conn, $_FILES['media'], 'media', $questionID);
            
            // Update media type if needed
            if ($mediaType !== 'none') {
                $updateStmt = $conn->prepare("UPDATE questions SET media_type = ? WHERE questionID = ?");
                if (!$updateStmt) {
                    throw new Exception("Prepare statement failed: " . $conn->error);
                }
                $updateStmt->bind_param("si", $mediaType, $questionID);
                $updateStmt->execute();
            }
        }
    }
    
    $conn->commit();
    echo json_encode(["success" => true, "message" => "Question added successfully", "questionID" => $questionID]);
}

/**
 * Update an existing question in the database
 * 
 * @param mysqli $conn Database connection
 */
function updateQuestion($conn) {
    // Get form data
    $questionID = $_POST['questionID'];
    $question = $_POST['question'];
    $answer = $_POST['answer'];
    $type = $_POST['type'];
    
    // Determine if it's a match type question
    $isMatchType = ($type === 'matchType');
    
    // Get current data for this question
    $stmt = $conn->prepare("SELECT media_type FROM questions WHERE questionID = ?");
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    $stmt->bind_param("i", $questionID);
    $stmt->execute();
    $stmt->bind_result($currentMediaType);
    $stmt->fetch();
    $stmt->close();
    
    // Set media type based on question type
    $mediaType = 'none';
    if (!$isMatchType) {
        if (isset($_FILES['media']) && $_FILES['media']['size'] > 0) {
            $fileType = mime_content_type($_FILES['media']['tmp_name']);
            $mediaType = strpos($fileType, 'image') !== false ? 'image' : 'video';
        } else {
            // Keep the current media type if no new media is uploaded
            $mediaType = $currentMediaType;
        }
    } else if ($isMatchType) {
        // For match type, always set media_type to 'image'
        $mediaType = 'image';
    }
    
    // Update basic question data
    if ($isMatchType) {
        $stmt = $conn->prepare("
            UPDATE questions 
            SET question = ?, answer = ?, type = ?, media_type = ?, uid1 = ?, uid2 = ?, uid3 = ?
            WHERE questionID = ?
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $uid1 = $_POST['uid1'];
        $uid2 = $_POST['uid2'];
        $uid3 = $_POST['uid3'];
        
        $stmt->bind_param("sssssssi", 
            $question, $answer, $type, $mediaType, $uid1, $uid2, $uid3, $questionID
        );
    } else {
        $stmt = $conn->prepare("
            UPDATE questions 
            SET question = ?, answer = ?, type = ?, media_type = ?
            WHERE questionID = ?
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("ssssi", 
            $question, $answer, $type, $mediaType, $questionID
        );
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Error updating question: " . $stmt->error);
    }
    
    // Handle media uploads
    if ($isMatchType) {
        // Process match type images
        if (isset($_FILES['image1']) && $_FILES['image1']['size'] > 0) {
            handleMediaUpload($conn, $_FILES['image1'], 'image1', $questionID);
        }
        
        if (isset($_FILES['image2']) && $_FILES['image2']['size'] > 0) {
            handleMediaUpload($conn, $_FILES['image2'], 'image2', $questionID);
        }
        
        if (isset($_FILES['image3']) && $_FILES['image3']['size'] > 0) {
            handleMediaUpload($conn, $_FILES['image3'], 'image3', $questionID);
        }
        
        // Clear media when switching to match type
        if ($currentMediaType !== 'none' && $currentMediaType !== 'image') {
            $clearStmt = $conn->prepare("
                UPDATE questions 
                SET media_content = NULL
                WHERE questionID = ?
            ");
            if (!$clearStmt) {
                throw new Exception("Prepare statement failed: " . $conn->error);
            }
            $clearStmt->bind_param("i", $questionID);
            $clearStmt->execute();
        }
    } else {
        // Process single media (image or video)
        if (isset($_FILES['media']) && $_FILES['media']['size'] > 0) {
            $mediaType = handleMediaUpload($conn, $_FILES['media'], 'media', $questionID);
            
            // Update media type if needed
            if ($mediaType !== 'none') {
                $updateStmt = $conn->prepare("UPDATE questions SET media_type = ? WHERE questionID = ?");
                if (!$updateStmt) {
                    throw new Exception("Prepare statement failed: " . $conn->error);
                }
                $updateStmt->bind_param("si", $mediaType, $questionID);
                $updateStmt->execute();
            }
        }
        
        // Clear match type images when switching from match type to another type
        if (!$isMatchType && $currentMediaType === 'image') {
            $clearStmt = $conn->prepare("
                UPDATE questions 
                SET image1_content = NULL, image2_content = NULL, image3_content = NULL,
                    uid1 = NULL, uid2 = NULL, uid3 = NULL
                WHERE questionID = ?
            ");
            if (!$clearStmt) {
                throw new Exception("Prepare statement failed: " . $conn->error);
            }
            $clearStmt->bind_param("i", $questionID);
            $clearStmt->execute();
        }
    }
    
    $conn->commit();
    echo json_encode(["success" => true, "message" => "Question updated successfully"]);
}

/**
 * Delete a question from the database
 * 
 * @param mysqli $conn Database connection
 * @param array $input Input data
 */
function deleteQuestion($conn, $input) {
    // Get question ID
    $questionID = isset($_POST['questionID']) ? $_POST['questionID'] : $input['questionID'];
    
    // Delete the question
    $stmt = $conn->prepare("DELETE FROM questions WHERE questionID = ?");
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    $stmt->bind_param("i", $questionID);
    
    if (!$stmt->execute()) {
        throw new Exception("Error deleting question: " . $stmt->error);
    }
    
    $conn->commit();
    echo json_encode(["success" => true, "message" => "Question deleted successfully"]);
}

/**
 * Handle media upload and save to database
 * 
 * @param mysqli $conn Database connection
 * @param array $file File data
 * @param string $field_name Field name
 * @param int $questionID Question ID
 * @return string Media type
 */
function handleMediaUpload($conn, $file, $field_name, $questionID) {
    // Check file size
    if ($file['size'] > 60 * 1024 * 1024) { // 60MB max
        throw new Exception("File size exceeds the limit of 60MB");
    }
    
    $tempPath = $file['tmp_name'];
    $fileType = mime_content_type($tempPath);
    
    // Determine media type based on mime type
    if (strpos($fileType, 'image/') === 0) {
        $mediaType = 'image';
    } else if (strpos($fileType, 'video/') === 0) {
        $mediaType = 'video';
    } else {
        throw new Exception("Unsupported file type: $fileType. Only images and videos are supported.");
    }
    
    // Prepare the file data
    try {
        // For smaller files, read at once
        if ($file['size'] < 10 * 1024 * 1024) { // 10MB
            $fileData = file_get_contents($tempPath);
            
            $stmt = $conn->prepare("UPDATE questions SET {$field_name}_content = ? WHERE questionID = ?");
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->error);
            }
            
            $null = NULL; // Need a variable to bind
            $stmt->bind_param("bi", $null, $questionID);
            $stmt->send_long_data(0, $fileData);
            
            if (!$stmt->execute()) {
                throw new Exception("Error storing media: " . $stmt->error . 
                                ". You may need to increase max_allowed_packet in MySQL configuration.");
            }
        } else {
            // For larger files, read in chunks to avoid memory issues
            $fileData = fopen($tempPath, 'rb');
            
            $stmt = $conn->prepare("UPDATE questions SET {$field_name}_content = ? WHERE questionID = ?");
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->error);
            }
            
            $null = NULL;
            $stmt->bind_param("bi", $null, $questionID);
            
            // Initialize with empty data
            $stmt->send_long_data(0, '');
            
            // Read and send in chunks
            while (!feof($fileData)) {
                $chunk = fread($fileData, 1024 * 1024); // 1MB chunks
                $stmt->send_long_data(0, $chunk);
            }
            fclose($fileData);
            
            if (!$stmt->execute()) {
                throw new Exception("Error storing media: " . $stmt->error . 
                                ". You may need to increase max_allowed_packet in MySQL configuration.");
            }
        }
        
        return $mediaType;
    } catch (Exception $e) {
        throw new Exception("Failed to upload media: " . $e->getMessage());
    }
}
?>