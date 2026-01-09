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
            case 'fetch_games':
                $conn = createDBConnection();
                fetchGames($conn, $_GET);
                $conn->close();
                break;
                
            case 'fetch_day_assignment':
                $conn = createDBConnection();
                fetchDayAssignment($conn, $_GET);
                $conn->close();
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
            case 'update_game_status':
                updateGameStatus($conn, $input);
                break;
                
            case 'save_day_assignment':
                saveDayAssignment($conn, $input);
                break;
                
            case 'sync_status_across_difficulties':
                syncStatusAcrossDifficulties($conn, $input);
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

function fetchGames($conn, $params) {
    $category = $params['category'] ?? '';
    $difficulty = $params['difficulty'] ?? '';
    
    if (empty($category) || empty($difficulty)) {
        throw new Exception("Category and difficulty are required");
    }
    
    $table = '';
    $id_field = '';
    $answer_fields = '';
    
    // Determine table and fields based on difficulty
    switch ($difficulty) {
        case 'easy':
            $table = 'game_easy';
            $id_field = 'easy_id';
            $answer_fields = 'correct_answer';
            break;
        case 'medium':
            $table = 'game_medium';
            $id_field = 'medium_id';
            $answer_fields = 'answer1, answer2';
            break;
        case 'hard':
            $table = 'game_hard';
            $id_field = 'hard_id';
            $answer_fields = 'answer1, answer2, answer3';
            break;
        default:
            throw new Exception("Invalid difficulty level");
    }
    
    $sql = "SELECT $id_field as id, $answer_fields, status FROM $table WHERE category = ? ORDER BY $id_field ASC";
    
    $stmt = $conn->prepare($sql);
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
        $games[] = $row;
    }
    
    echo json_encode(["success" => true, "games" => $games, "difficulty" => $difficulty]);
}

function updateGameStatus($conn, $data) {
    $id = intval($data['id']);
    $difficulty = $data['difficulty'] ?? '';
    $status = $data['status'] ?? '';
    $category = $data['category'] ?? '';
    
    if (empty($difficulty) || empty($status) || !in_array($status, ['in use', 'not in use'])) {
        throw new Exception("Invalid parameters");
    }
    
    $table = '';
    $id_field = '';
    
    switch ($difficulty) {
        case 'easy':
            $table = 'game_easy';
            $id_field = 'easy_id';
            break;
        case 'medium':
            $table = 'game_medium';
            $id_field = 'medium_id';
            break;
        case 'hard':
            $table = 'game_hard';
            $id_field = 'hard_id';
            break;
        default:
            throw new Exception("Invalid difficulty level");
    }
    
    $conn->begin_transaction();
    
    try {
        // If setting to 'in use', check if there are other games already in use in this category and difficulty
        if ($status === 'in use') {
            $check_stmt = $conn->prepare("SELECT COUNT(*) FROM $table WHERE category = ? AND status = 'in use'");
            $check_stmt->bind_param("s", $category);
            $check_stmt->execute();
            $check_stmt->bind_result($count);
            $check_stmt->fetch();
            $check_stmt->close();
            
            // Set all other games in this category and difficulty to 'not in use'
            if ($count > 0) {
                $reset_stmt = $conn->prepare("UPDATE $table SET status = 'not in use' WHERE category = ? AND status = 'in use'");
                $reset_stmt->bind_param("s", $category);
                $reset_stmt->execute();
                $reset_stmt->close();
            }
        }
        
        // Update the specific game status
        $stmt = $conn->prepare("UPDATE $table SET status = ? WHERE $id_field = ?");
        $stmt->bind_param("si", $status, $id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $conn->commit();
        
        // Check if we should prompt for cross-difficulty synchronization
        $should_prompt = false;
        if ($status === 'in use') {
            // Check if the same ID exists in other difficulties
            $other_difficulties = [];
            if ($difficulty !== 'easy') {
                $check_easy = $conn->prepare("SELECT COUNT(*) FROM game_easy WHERE easy_id = ? AND category = ?");
                $check_easy->bind_param("is", $id, $category);
                $check_easy->execute();
                $check_easy->bind_result($easy_count);
                $check_easy->fetch();
                $check_easy->close();
                if ($easy_count > 0) {
                    $other_difficulties[] = 'easy';
                }
            }
            
            if ($difficulty !== 'medium') {
                $check_medium = $conn->prepare("SELECT COUNT(*) FROM game_medium WHERE medium_id = ? AND category = ?");
                $check_medium->bind_param("is", $id, $category);
                $check_medium->execute();
                $check_medium->bind_result($medium_count);
                $check_medium->fetch();
                $check_medium->close();
                if ($medium_count > 0) {
                    $other_difficulties[] = 'medium';
                }
            }
            
            if ($difficulty !== 'hard') {
                $check_hard = $conn->prepare("SELECT COUNT(*) FROM game_hard WHERE hard_id = ? AND category = ?");
                $check_hard->bind_param("is", $id, $category);
                $check_hard->execute();
                $check_hard->bind_result($hard_count);
                $check_hard->fetch();
                $check_hard->close();
                if ($hard_count > 0) {
                    $other_difficulties[] = 'hard';
                }
            }
            
            $should_prompt = count($other_difficulties) > 0;
        }
        
        echo json_encode([
            "success" => true, 
            "message" => "Game status updated successfully",
            "should_prompt_sync" => $should_prompt,
            "available_difficulties" => $other_difficulties ?? [],
            "current_id" => $id,
            "current_difficulty" => $difficulty,
            "category" => $category
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function syncStatusAcrossDifficulties($conn, $data) {
    $id = intval($data['id']);
    $category = $data['category'] ?? '';
    $current_difficulty = $data['current_difficulty'] ?? '';
    $target_difficulties = $data['target_difficulties'] ?? [];
    
    if (empty($category) || empty($current_difficulty) || empty($target_difficulties)) {
        throw new Exception("Invalid parameters for synchronization");
    }
    
    $conn->begin_transaction();
    
    try {
        foreach ($target_difficulties as $difficulty) {
            if ($difficulty === $current_difficulty) continue;
            
            $table = '';
            $id_field = '';
            
            switch ($difficulty) {
                case 'easy':
                    $table = 'game_easy';
                    $id_field = 'easy_id';
                    break;
                case 'medium':
                    $table = 'game_medium';
                    $id_field = 'medium_id';
                    break;
                case 'hard':
                    $table = 'game_hard';
                    $id_field = 'hard_id';
                    break;
                default:
                    continue;
            }
            
            // Set all games in this category and difficulty to 'not in use'
            $reset_stmt = $conn->prepare("UPDATE $table SET status = 'not in use' WHERE category = ? AND status = 'in use'");
            $reset_stmt->bind_param("s", $category);
            $reset_stmt->execute();
            $reset_stmt->close();
            
            // Set the specific ID to 'in use' if it exists
            $sync_stmt = $conn->prepare("UPDATE $table SET status = 'in use' WHERE $id_field = ? AND category = ?");
            $sync_stmt->bind_param("is", $id, $category);
            $sync_stmt->execute();
            $sync_stmt->close();
        }
        
        $conn->commit();
        echo json_encode(["success" => true, "message" => "Status synchronized across difficulties"]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function fetchDayAssignment($conn, $params) {
    $day = $params['day'] ?? '';
    
    if (empty($day)) {
        throw new Exception("Day is required");
    }
    
    $stmt = $conn->prepare("SELECT * FROM games_per_day WHERE day = ?");
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $day);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $assignment = $result->fetch_assoc();
    
    echo json_encode(["success" => true, "assignment" => $assignment]);
}

function saveDayAssignment($conn, $data) {
    $day = $data['day'] ?? '';
    $category = $data['category'] ?? '';
    
    if (empty($day) || empty($category)) {
        throw new Exception("Day and category are required");
    }
    
    $conn->begin_transaction();
    
    try {
        // Get the IDs of games that are currently 'in use' for this category
        $easy_id = null;
        $medium_id = null;
        $hard_id = null;
        
        // Get easy ID
        $easy_stmt = $conn->prepare("SELECT easy_id FROM game_easy WHERE category = ? AND status = 'in use' LIMIT 1");
        $easy_stmt->bind_param("s", $category);
        $easy_stmt->execute();
        $easy_stmt->bind_result($easy_id);
        $easy_stmt->fetch();
        $easy_stmt->close();
        
        // Get medium ID
        $medium_stmt = $conn->prepare("SELECT medium_id FROM game_medium WHERE category = ? AND status = 'in use' LIMIT 1");
        $medium_stmt->bind_param("s", $category);
        $medium_stmt->execute();
        $medium_stmt->bind_result($medium_id);
        $medium_stmt->fetch();
        $medium_stmt->close();
        
        // Get hard ID
        $hard_stmt = $conn->prepare("SELECT hard_id FROM game_hard WHERE category = ? AND status = 'in use' LIMIT 1");
        $hard_stmt->bind_param("s", $category);
        $hard_stmt->execute();
        $hard_stmt->bind_result($hard_id);
        $hard_stmt->fetch();
        $hard_stmt->close();
        
        // Check if assignment already exists for this day
        $check_stmt = $conn->prepare("SELECT COUNT(*) FROM games_per_day WHERE day = ?");
        $check_stmt->bind_param("s", $day);
        $check_stmt->execute();
        $check_stmt->bind_result($exists);
        $check_stmt->fetch();
        $check_stmt->close();
        
        if ($exists > 0) {
            // Update existing assignment
            $update_stmt = $conn->prepare("UPDATE games_per_day SET category = ?, easyID = ?, mediumID = ?, hardID = ?, updated_at = CURRENT_TIMESTAMP WHERE day = ?");
            $update_stmt->bind_param("siiis", $category, $easy_id, $medium_id, $hard_id, $day);
            
            if (!$update_stmt->execute()) {
                throw new Exception("Update statement failed: " . $update_stmt->error);
            }
            $update_stmt->close();
        } else {
            // Insert new assignment
            $insert_stmt = $conn->prepare("INSERT INTO games_per_day (day, category, easyID, mediumID, hardID) VALUES (?, ?, ?, ?, ?)");
            $insert_stmt->bind_param("ssiii", $day, $category, $easy_id, $medium_id, $hard_id);
            
            if (!$insert_stmt->execute()) {
                throw new Exception("Insert statement failed: " . $insert_stmt->error);
            }
            $insert_stmt->close();
        }
        
        $conn->commit();
        echo json_encode([
            "success" => true, 
            "message" => "Day assignment saved successfully",
            "day" => $day,
            "category" => $category,
            "easy_id" => $easy_id,
            "medium_id" => $medium_id,
            "hard_id" => $hard_id
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}
?>