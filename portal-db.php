<?php
/**
 * Database connection — HostGator MySQL build.
 *
 * A single shared PDO connection, using prepared statements everywhere
 * (see the other portal-*.php files) so nothing here is vulnerable to SQL
 * injection regardless of what a caller passes in.
 */

require_once __DIR__ . '/portal-config.php';

function gsx_db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . GSX_DB_HOST . ';dbname=' . GSX_DB_NAME . ';charset=utf8mb4';

    try {
        $pdo = new PDO($dsn, GSX_DB_USER, GSX_DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        error_log('[portal-db] Connection failed: ' . $e->getMessage());
        http_response_code(503);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'database_unavailable']);
        exit;
    }

    return $pdo;
}
