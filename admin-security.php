<?php
/**
 * Shared helpers for the staff (administrator) endpoints — admin-*.php.
 * Customers and administrators sign in through the same login.php, but their
 * accounts are
 * separate: different table, different session key, and a customer session
 * can never act as an admin.
 */

require_once __DIR__ . '/portal-security.php';

// Same values as portal-config.php. They are repeated here as fallbacks because
// a portal-config.php written before the staff sign-in existed does not define
// them, and without GSX_ADMIN_IDLE_SECONDS the session check fails the moment an
// administrator is signed in (a PHP "Undefined constant" error), so the site
// treats the administrator like a plain login. Customers never reach that line.
defined('GSX_ADMIN_IDLE_SECONDS') || define('GSX_ADMIN_IDLE_SECONDS', 60 * 60);
defined('GSX_ADMIN_PASSWORD_MIN') || define('GSX_ADMIN_PASSWORD_MIN', 8);

/** Admin responses are never cached by the browser or any proxy. */
function gsx_admin_json(int $status, array $body): void
{
    header('Cache-Control: no-store');
    gsx_json_response($status, $body);
}

/**
 * Returns the signed-in admin's row, or null. Signs the admin out first if
 * they've been idle too long, or if their account was disabled or deleted
 * after they signed in.
 */
function gsx_current_admin(): ?array
{
    $adminId = $_SESSION['admin_id'] ?? null;
    if ($adminId === null) {
        return null;
    }

    $lastSeen = (int) ($_SESSION['admin_last_seen'] ?? 0);
    if ($lastSeen === 0 || time() - $lastSeen > GSX_ADMIN_IDLE_SECONDS) {
        unset($_SESSION['admin_id'], $_SESSION['admin_last_seen']);
        return null;
    }

    try {
        $stmt = gsx_db()->prepare(
            'SELECT id, email, first_name, must_change_password, status FROM admins WHERE id = :id'
        );
        $stmt->execute(['id' => $adminId]);
        $admin = $stmt->fetch();
    } catch (Throwable $e) {
        // Admin tables not created yet: nobody is an admin, and the
        // customer side of the portal must keep working regardless.
        error_log('[admin-security] admin lookup failed: ' . $e->getMessage());
        $admin = false;
    }

    if ($admin === false || $admin['status'] !== 'active') {
        unset($_SESSION['admin_id'], $_SESSION['admin_last_seen']);
        return null;
    }

    $_SESSION['admin_last_seen'] = time();
    return $admin;
}

/**
 * Stops the request with 401 unless an admin is signed in. Pass
 * $allowPasswordChangePending = true only for the endpoints an admin needs
 * in order to set their first real password.
 */
function gsx_require_admin(bool $allowPasswordChangePending = false): array
{
    $admin = gsx_current_admin();
    if ($admin === null) {
        gsx_admin_json(401, ['ok' => false, 'error' => 'not_signed_in']);
    }
    if (!$allowPasswordChangePending && (int) $admin['must_change_password'] === 1) {
        gsx_admin_json(403, ['ok' => false, 'error' => 'password_change_required']);
    }
    return $admin;
}

/** Records an admin action. Never throws — logging must not break the action. */
function gsx_admin_audit(int $adminId, string $action, ?int $targetUserId, ?string $detail): void
{
    try {
        gsx_db()->prepare(
            'INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail)
             VALUES (:admin_id, :action, :target_user_id, :detail)'
        )->execute([
            'admin_id' => $adminId,
            'action' => $action,
            'target_user_id' => $targetUserId,
            'detail' => $detail,
        ]);
    } catch (Throwable $e) {
        error_log('[admin-audit] failed: ' . $e->getMessage());
    }
}
