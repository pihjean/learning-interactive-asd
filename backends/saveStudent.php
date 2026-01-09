<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get request data
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid input data"]);
    exit();
}

// Database credentials
$servername = "localhost";
$username = "u572625467_capstone_2";
$password = "Smartstep_2";
$dbname = "u572625467_smartstep";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

// Start transaction
$conn->begin_transaction();

try {
    $mode = $data['mode'];
    $studentID = isset($data['studentID']) ? $data['studentID'] : null;
    
    // Student data
    $firstName = $data['firstName'];
    $middleName = $data['middleName'];
    $lastName = $data['lastName'];
    $age = $data['age'];
    $sex = $data['sex'];
    $birthdate = $data['birthdate'];
    $address = $data['address'];
    
    // Guardian data
    $guardianFirstName = $data['guardianFirstName'];
    $guardianMiddleName = $data['guardianMiddleName'];
    $guardianLastName = $data['guardianLastName'];
    $contactNumber = $data['contactNumber'];
    
    if ($mode === 'add') {
        // Generate a new student ID
        $result = $conn->query("SELECT MAX(CAST(SUBSTRING(studentID, 3) AS UNSIGNED)) as max_id FROM studentlist");
        $row = $result->fetch_assoc();
        $nextId = intval($row['max_id']) + 1;
        $studentID = 'S-' . str_pad($nextId, 2, '0', STR_PAD_LEFT);
        
        // Insert into studentlist table
        $stmt = $conn->prepare("INSERT INTO studentlist (studentID, first_name, middle_name, last_name, age, sex, birthdate, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssssss", $studentID, $firstName, $middleName, $lastName, $age, $sex, $birthdate, $address);
        
        if (!$stmt->execute()) {
            throw new Exception("Error inserting student: " . $stmt->error);
        }
        
        // Insert into guardian table
        $stmt = $conn->prepare("INSERT INTO guardian (studentID, first_name, middle_name, last_name, contact_number) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sssss", $studentID, $guardianFirstName, $guardianMiddleName, $guardianLastName, $contactNumber);
        
        if (!$stmt->execute()) {
            throw new Exception("Error inserting guardian: " . $stmt->error);
        }
        
    } else if ($mode === 'edit') {
        // Update studentlist table
        $stmt = $conn->prepare("UPDATE studentlist SET first_name = ?, middle_name = ?, last_name = ?, age = ?, sex = ?, birthdate = ?, address = ? WHERE studentID = ?");
        $stmt->bind_param("ssssssss", $firstName, $middleName, $lastName, $age, $sex, $birthdate, $address, $studentID);
        
        if (!$stmt->execute()) {
            throw new Exception("Error updating student: " . $stmt->error);
        }
        
        // Check if guardian record exists
        $result = $conn->query("SELECT guardianID FROM guardian WHERE studentID = '$studentID'");
        
        if ($result->num_rows > 0) {
            // Update guardian table
            $stmt = $conn->prepare("UPDATE guardian SET first_name = ?, middle_name = ?, last_name = ?, contact_number = ? WHERE studentID = ?");
            $stmt->bind_param("sssss", $guardianFirstName, $guardianMiddleName, $guardianLastName, $contactNumber, $studentID);
            
            if (!$stmt->execute()) {
                throw new Exception("Error updating guardian: " . $stmt->error);
            }
        } else {
            // Insert new guardian record
            $stmt = $conn->prepare("INSERT INTO guardian (studentID, first_name, middle_name, last_name, contact_number) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("sssss", $studentID, $guardianFirstName, $guardianMiddleName, $guardianLastName, $contactNumber);
            
            if (!$stmt->execute()) {
                throw new Exception("Error inserting guardian: " . $stmt->error);
            }
        }
    } else {
        throw new Exception("Invalid mode: " . $mode);
    }
    
    // Commit transaction
    $conn->commit();
    
    http_response_code(200);
    echo json_encode([
        "success" => true, 
        "message" => $mode === 'add' ? "Student added successfully" : "Student updated successfully",
        "studentID" => $studentID
    ]);
    
} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    $conn->close();
}
?>