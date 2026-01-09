<?php

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


$servername = "localhost";
$username = "root";
$password = "";
$dbname = "smartstep";


$conn = new mysqli($servername, $username, $password, $dbname);


if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}


if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {

        $category = isset($_GET['category']) ? $_GET['category'] : '';
        $difficulty = isset($_GET['difficulty']) ? $_GET['difficulty'] : '';
        
        if (empty($category) || empty($difficulty)) {
            throw new Exception("Category and difficulty parameters are required");
        }
        

        $originalCategory = $category;
        

        $singularCategory = rtrim($category, 'S');
        $pluralCategory = $singularCategory . 'S';
        

        $query = "
            SELECT activityID, question1, question2, question3
            FROM activity_questions
            WHERE (category = ? OR category = ? OR category = ?) AND difficulty = ?
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ssss", $category, $singularCategory, $pluralCategory, $difficulty);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            
            // Check if all question IDs are valid
            $validQuestions = true;
            $questionIDs = [
                'question1' => $row['question1'],
                'question2' => $row['question2'],
                'question3' => $row['question3']
            ];
            
            // Filter out any null or 0 question IDs
            foreach ($questionIDs as $key => $id) {
                if (!$id) {
                    $validQuestions = false;
                    $questionIDs[$key] = 0; // Set to 0 if null
                }
            }
            
            if ($validQuestions) {
                // Return the question IDs
                http_response_code(200);
                echo json_encode([
                    "success" => true, 
                    "questionIDs" => $questionIDs,
                    "activityID" => $row['activityID']
                ]);
            } else {
                // Some question IDs are missing
                http_response_code(404);
                echo json_encode([
                    "success" => false, 
                    "message" => "Incomplete question set for $category - $difficulty"
                ]);
            }
        } else {
            // No matching entry in activity_questions
            http_response_code(404);
            echo json_encode([
                "success" => false, 
                "message" => "No activities found for $category - $difficulty",
                "debug_info" => [
                    "tried_categories" => [$category, $singularCategory, $pluralCategory],
                    "difficulty" => $difficulty
                ]
            ]);
        }
        
        $stmt->close();
    } catch (Exception $e) {
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