<?php
session_start();
header('Content-Type: application/json');

if (isset($_SESSION['user_id'])) {
    require 'db.php';

    $id = intval($_SESSION['user_id']);
    $res = mysqli_query($conn, "SELECT id, name, email, phone, role FROM users WHERE id = $id");

    if ($res && mysqli_num_rows($res) > 0) {
        $user = mysqli_fetch_assoc($res);
        echo json_encode([
            'logged_in' => true,
            'user' => $user
        ]);
        exit;
    }
}

echo json_encode(['logged_in' => false]);
?>