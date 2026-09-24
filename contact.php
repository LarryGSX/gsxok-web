<?php
/**
 * Contact form submission endpoint — HostGator static build.
 *
 * Drop-in PHP replacement for the Vercel version's app/api/contact
 * route.ts. Same JSON request/response shape (see
 * components/contact/ContactForm.tsx), same anti-spam layering and order,
 * same field limits — ported from lib/contact/schema.ts and
 * lib/contact/spamGuard.ts rather than reinvented. The one real difference:
 * rate-limit/duplicate tracking is file-based here (see contact-config.php)
 * instead of the in-memory Map the Node version used, which only ever
 * persisted for the life of one serverless instance. File-based storage is
 * actually more correct for this — it persists across requests instead of
 * resetting on every cold start.
 *
 * Order of checks, matching the original exactly: honeypot -> timing ->
 * rate limit -> duplicate -> send. Honeypot and timing failures return the
 * same { ok: true } shape as a real success (a bot that trips either one
 * gets no signal it was caught). Rate-limit failures return a real error.
 * Duplicate-submission failures return success, since the visitor's own
 * message already went out the first time.
 */

require_once __DIR__ . '/contact-config.php';

header('Content-Type: application/json');

function gsx_json_response(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gsx_json_response(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);

if (!is_array($body)) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_request']);
}

// ── Field extraction + validation — mirrors lib/contact/schema.ts's Zod
//    schema field-by-field. Any hard failure here is a real client error,
//    distinct from the honeypot/timing checks below (which intentionally
//    respond as if the submission succeeded). ───────────────────────────────

function gsx_str(array $body, string $key): string
{
    return isset($body[$key]) && is_string($body[$key]) ? trim($body[$key]) : '';
}

$name = gsx_str($body, 'name');
$email = gsx_str($body, 'email');
$phone = gsx_str($body, 'phone');
$company = gsx_str($body, 'company');
$reason = gsx_str($body, 'reason');
$message = gsx_str($body, 'message');
$gsxHpToken = gsx_str($body, 'gsxHpToken');
$renderedAt = isset($body['renderedAt']) && is_numeric($body['renderedAt']) ? (float) $body['renderedAt'] : null;

$errors = [];
if ($name === '' || mb_strlen($name) > GSX_NAME_MAX) {
    $errors[] = 'name';
}
if (
    $email === '' ||
    mb_strlen($email) > GSX_EMAIL_MAX ||
    filter_var($email, FILTER_VALIDATE_EMAIL) === false
) {
    $errors[] = 'email';
}
if (mb_strlen($phone) > GSX_PHONE_MAX) {
    $errors[] = 'phone';
}
if (mb_strlen($company) > GSX_COMPANY_MAX) {
    $errors[] = 'company';
}
if (!in_array($reason, GSX_CONTACT_REASONS, true)) {
    $errors[] = 'reason';
}
if ($message === '' || mb_strlen($message) > GSX_MESSAGE_MAX) {
    $errors[] = 'message';
}
if ($renderedAt === null) {
    $errors[] = 'renderedAt';
}
if (mb_strlen($gsxHpToken) > GSX_HONEYPOT_MAX) {
    $errors[] = 'gsxHpToken';
}

if (!empty($errors)) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_fields']);
}

// ── Honeypot — real visitors never see or fill this field. ─────────────────
if ($gsxHpToken !== '') {
    gsx_json_response(200, ['ok' => true]);
}

// ── Minimum time-to-submit. ─────────────────────────────────────────────────
$nowMs = microtime(true) * 1000;
if ($nowMs - $renderedAt < GSX_MIN_SUBMIT_MS) {
    gsx_json_response(200, ['ok' => true]);
}

// ── File-backed rate limit + duplicate stores. Each store is a single JSON
//    file, guarded with flock() so concurrent requests can't corrupt it or
//    race past the limit. ───────────────────────────────────────────────────

function gsx_client_identifier(): string
{
    $forwardedFor = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null;
    if ($forwardedFor) {
        $parts = explode(',', $forwardedFor);
        return trim($parts[0]);
    }
    return $_SERVER['HTTP_X_REAL_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

/** Reads, mutates (via $mutator), and writes a JSON store under an exclusive lock. */
function gsx_with_locked_store(string $filename, callable $mutator)
{
    if (!is_dir(GSX_DATA_DIR)) {
        @mkdir(GSX_DATA_DIR, 0755, true);
    }
    $path = GSX_DATA_DIR . '/' . $filename;

    $handle = fopen($path, 'c+');
    if ($handle === false) {
        // Can't open the store — fail open rather than blocking every
        // submission on a filesystem-permissions problem the visitor can't
        // fix. Flagged via error_log so it's visible to whoever manages
        // the hosting account.
        error_log("[contact.php] Could not open store: $path");
        return $mutator([]);
    }

    flock($handle, LOCK_EX);
    $contents = stream_get_contents($handle);
    $data = $contents ? json_decode($contents, true) : [];
    if (!is_array($data)) {
        $data = [];
    }

    $result = $mutator($data);

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($result['data']));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    return $result['return'];
}

function gsx_check_rate_limit(string $identifier): bool
{
    return gsx_with_locked_store('rate-limit.json', function (array $data) use ($identifier) {
        $now = time();
        $windowStart = $now - GSX_RATE_LIMIT_WINDOW_SECONDS;

        // Prune every identifier's timestamps, not just this one — keeps
        // the file from growing unbounded over time.
        foreach ($data as $key => $timestamps) {
            $fresh = array_values(array_filter($timestamps, fn($t) => $t >= $windowStart));
            if (empty($fresh)) {
                unset($data[$key]);
            } else {
                $data[$key] = $fresh;
            }
        }

        $timestamps = $data[$identifier] ?? [];
        if (count($timestamps) >= GSX_RATE_LIMIT_MAX) {
            return ['data' => $data, 'return' => false];
        }

        $timestamps[] = $now;
        $data[$identifier] = $timestamps;
        return ['data' => $data, 'return' => true];
    });
}

function gsx_check_duplicate(string $email, string $message): bool
{
    return gsx_with_locked_store('duplicates.json', function (array $data) use ($email, $message) {
        $now = time();

        foreach ($data as $key => $ts) {
            if ($now - $ts > GSX_DUPLICATE_WINDOW_SECONDS) {
                unset($data[$key]);
            }
        }

        $key = strtolower(trim($email)) . '::' . strtolower(trim($message));
        if (isset($data[$key])) {
            return ['data' => $data, 'return' => false];
        }

        $data[$key] = $now;
        return ['data' => $data, 'return' => true];
    });
}

$identifier = gsx_client_identifier();

if (!gsx_check_rate_limit($identifier)) {
    gsx_json_response(429, ['ok' => false, 'error' => 'rate_limited']);
}

if (!gsx_check_duplicate($email, $message)) {
    gsx_json_response(200, ['ok' => true]);
}

// ── Delivery. ────────────────────────────────────────────────────────────────
if (!GSX_MAIL_READY) {
    error_log('[contact.php] GSX_MAIL_READY is false in contact-config.php, cannot deliver message');
    gsx_json_response(503, ['ok' => false, 'error' => 'delivery_unavailable']);
}

$subject = 'New contact form message: ' . $reason;
$bodyLines = ["Name: $name", "Email: $email"];
if ($phone !== '') {
    $bodyLines[] = "Phone: $phone";
}
if ($company !== '') {
    $bodyLines[] = "Company: $company";
}
$bodyLines[] = "Reason: $reason";
$bodyLines[] = '';
$bodyLines[] = $message;
$emailBody = implode("\n", $bodyLines);

$headers = [];
$headers[] = 'From: ' . GSX_CONTACT_FROM;
$headers[] = 'Reply-To: ' . $email;
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'MIME-Version: 1.0';

$sent = mail(GSX_CONTACT_TO, $subject, $emailBody, implode("\r\n", $headers));

if (!$sent) {
    error_log('[contact.php] mail() returned false');
    gsx_json_response(502, ['ok' => false, 'error' => 'send_failed']);
}

gsx_json_response(200, ['ok' => true]);
