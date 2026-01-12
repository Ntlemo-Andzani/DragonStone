<?php
error_reporting(0); // Hide PHP warnings from breaking JSON
session_start();
require_once 'dbase.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die(json_encode(['success' => false, 'message' => 'Invalid request method']));
}

$data = json_decode(file_get_contents('php://input'), true);

// Check if JSON decoding worked
if ($data === null) {
    die(json_encode(['success' => false, 'message' => 'Invalid JSON data']));
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$password = $data['password'] ?? '';

// Validation
if (empty($name) || empty($email) || empty($password)) {
    die(json_encode(['success' => false, 'message' => 'All fields are required']));
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    die(json_encode(['success' => false, 'message' => 'Invalid email format']));
}

if (strlen($password) < 6) {
    die(json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']));
}

// Check if email exists (PREPARED STATEMENT)
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
if (!$stmt) {
    die(json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]));
}

$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $stmt->close();
    mysqli_close($conn);
    die(json_encode(['success' => false, 'message' => 'Email already registered']));
}
$stmt->close();

// Hash password and insert user (PREPARED STATEMENT)
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);
$role = 'user';

$stmt = $conn->prepare("INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)");
if (!$stmt) {
    die(json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]));
}

$stmt->bind_param("sssss", $name, $email, $phone, $hashedPassword, $role);

if ($stmt->execute()) {
    $userId = $stmt->insert_id;
    $stmt->close();
    
    // Set session
    $_SESSION['user_id'] = $userId;
    $_SESSION['user_role'] = $role;
    $_SESSION['user_name'] = $name;
    $_SESSION['user_email'] = $email;

    // Return user data (without password)
    echo json_encode([
        'success' => true, 
        'user' => [
            'id' => $userId,
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'role' => $role,
            'ecopoints' => 100
        ]
    ]);
} else {
    $stmt->close();
    echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $conn->error]);
}

mysqli_close($conn);
?>