<?php
require_once 'dbase.php';

class Database {
    private $connection;
    
    public function __construct() {
        try {
            //Using environment variables to build a networked DB connection
            $host = getenv('DB_HOST') ?: '127.0.0.1';
            $db   = getenv('DB_NAME') ?: 'ecommerce';
            $user = getenv('DB_USER') ?: 'root';
            $pass = getenv('DB_PASS') ?: '';
            $charset = 'utf8mb4';

            $dsn = "mysql:host={$host};dbname={$db};charset={$charset}";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            $this->connection = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            // On failure, keep connection null (or handle/log as needed)
            $this->connection = null;
        }
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    // User registration
    public function registerUser($username, $email, $password) {
        try {
            // Check if user already exists
            $check_sql = "SELECT user_id FROM users WHERE email = ? OR username = ?";
            $check_stmt = $this->connection->prepare($check_sql);
            $check_stmt->execute([$email, $username]);
            
            if ($check_stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Email or username already exists!'];
            }
            
            // Hash password
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            
            // Insert new user
            $insert_sql = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'customer')";
            $insert_stmt = $this->connection->prepare($insert_sql);
            
            if ($insert_stmt->execute([$username, $email, $hashed_password])) {
                $user_id = $this->connection->lastInsertId();
                return [
                    'success' => true, 
                    'message' => 'Registration successful!',
                    'user_id' => $user_id,
                    'username' => $username,
                    'email' => $email
                ];
            } else {
                return ['success' => false, 'message' => 'Registration failed. Please try again.'];
            }
            
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }
    
    // User login
    public function loginUser($email, $password) {
        try {
            // Get user data
            $sql = "SELECT user_id, username, email, password, role, status, login_attempts, account_locked 
                    FROM users WHERE email = ?";
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if ($user) {
                // Check if account is locked
                if ($user['account_locked']) {
                    return ['success' => false, 'message' => 'Account is temporarily locked. Please contact support.'];
                }
                
                // Check if account is active
                if ($user['status'] !== 'active') {
                    return ['success' => false, 'message' => 'Account is inactive. Please contact support.'];
                }
                
                // Verify password
                if (password_verify($password, $user['password'])) {
                    // Reset login attempts on successful login
                    $this->resetLoginAttempts($user['user_id']);
                    
                    // Update last login
                    $this->updateLastLogin($user['user_id']);
                    
                    return [
                        'success' => true,
                        'user_id' => $user['user_id'],
                        'username' => $user['username'],
                        'email' => $user['email'],
                        'role' => $user['role']
                    ];
                } else {
                    // Increment login attempts
                    $this->incrementLoginAttempts($user['user_id']);
                    return ['success' => false, 'message' => 'Invalid email or password!'];
                }
            } else {
                return ['success' => false, 'message' => 'Invalid email or password!'];
            }
            
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Login failed: ' . $e->getMessage()];
        }
    }
    
    private function resetLoginAttempts($user_id) {
        $sql = "UPDATE users SET login_attempts = 0, account_locked = FALSE WHERE user_id = ?";
        $stmt = $this->connection->prepare($sql);
        $stmt->execute([$user_id]);
    }
    
    private function incrementLoginAttempts($user_id) {
        // Get current attempts
        $sql = "SELECT login_attempts FROM users WHERE user_id = ?";
        $stmt = $this->connection->prepare($sql);
        $stmt->execute([$user_id]);
        $current_attempts = $stmt->fetchColumn();
        
        $new_attempts = $current_attempts + 1;
        $lock_account = ($new_attempts >= 5); // Lock after 5 attempts
        
        $update_sql = "UPDATE users SET login_attempts = ?, account_locked = ? WHERE user_id = ?";
        $update_stmt = $this->connection->prepare($update_sql);
        $update_stmt->execute([$new_attempts, $lock_account, $user_id]);
    }
    
    private function updateLastLogin($user_id) {
        $sql = "UPDATE users SET last_login = NOW() WHERE user_id = ?";
        $stmt = $this->connection->prepare($sql);
        $stmt->execute([$user_id]);
    }
    
    // Get all users for admin
    public function getAllUsers() {
        try {
            $sql = "SELECT user_id, username, email, role, status, eco_points, created_at, last_login, login_attempts, account_locked 
                    FROM users ORDER BY created_at DESC";
            $stmt = $this->connection->query($sql);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }
    }
}
?>