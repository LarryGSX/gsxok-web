<?php
/**
 * Shared helpers for the customer ordering endpoints (shop-*.php).
 *
 * Who a request belongs to always comes from the server-side login session,
 * never from anything the browser sends, so a customer can only ever see or
 * change their own cart, companies, and orders. Prices are always looked up
 * here from the products table; the browser never gets to say what
 * something costs.
 */

require_once __DIR__ . '/portal-security.php';

/** Stops the request with 401 unless an active customer is signed in; returns their account row. */
function gsx_shop_customer(): array
{
    $userId = $_SESSION['user_id'] ?? null;
    if ($userId === null) {
        gsx_json_response(401, ['ok' => false, 'error' => 'not_signed_in']);
    }

    $stmt = gsx_db()->prepare(
        'SELECT id, first_name, last_name, email, phone, account_status, legacy_id
         FROM users WHERE id = :id'
    );
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();

    if ($user === false || $user['account_status'] !== 'active') {
        gsx_json_response(401, ['ok' => false, 'error' => 'not_signed_in']);
    }
    return $user;
}

/**
 * Which of the two price lists a customer is charged from: 'grandfathered'
 * (the original prices) or 'standard' (the current prices).
 *
 * PROVISIONAL: Larry has said original customers keep the grandfathered
 * chocolate prices, but the old site itself had a single price list and no
 * source defines who counts as an "original" customer. Until Larry answers,
 * this treats a customer whose portal account is linked to an account from
 * the old GSX system (users.legacy_id) as original. Whatever he decides, this
 * is the ONLY place the rule needs to change; everything that shows or charges
 * a price goes through it.
 */
function gsx_price_list_for_customer(array $customer): string
{
    return $customer['legacy_id'] !== null ? 'grandfathered' : 'standard';
}

/** A product's price in cents for the given price list. */
function gsx_unit_cents(array $product, string $priceList): int
{
    $price = ($priceList === 'grandfathered' && $product['legacy_price'] !== null)
        ? $product['legacy_price']
        : $product['price'];
    return (int) round(((float) $price) * 100);
}

function gsx_cents_to_money(int $cents): string
{
    return number_format($cents / 100, 2, '.', '');
}

function gsx_image_url(string $file): string
{
    return '/images/products/' . rawurlencode($file);
}

/** Reads and decodes a JSON request body, or stops with 400. */
function gsx_json_body(): array
{
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($body)) {
        gsx_json_response(400, ['ok' => false, 'error' => 'invalid_request']);
    }
    return $body;
}

/** The customer's saved cart: each line priced from their price list, plus the total. */
function gsx_cart_lines(PDO $db, array $customer): array
{
    $stmt = $db->prepare(
        'SELECT c.product_id, c.qty, p.title, p.image, p.price, p.legacy_price, p.in_stock
         FROM cart_items c
         JOIN products p ON p.id = c.product_id
         WHERE c.user_id = :user_id
         ORDER BY c.created_at, c.product_id'
    );
    $stmt->execute(['user_id' => $customer['id']]);
    $priceList = gsx_price_list_for_customer($customer);

    $lines = [];
    foreach ($stmt->fetchAll() as $r) {
        $unit = gsx_unit_cents($r, $priceList);
        $lines[] = [
            'product_id' => (int) $r['product_id'],
            'title' => $r['title'],
            'image' => $r['image'],
            'in_stock' => (int) $r['in_stock'] === 1,
            'qty' => (int) $r['qty'],
            'unit_cents' => $unit,
            'line_cents' => $unit * (int) $r['qty'],
        ];
    }
    return $lines;
}

/** The cart in the shape the page uses. */
function gsx_cart_response(PDO $db, array $customer): array
{
    $lines = gsx_cart_lines($db, $customer);
    $total = 0;
    $items = [];
    foreach ($lines as $l) {
        $total += $l['line_cents'];
        $items[] = [
            'productId' => $l['product_id'],
            'title' => $l['title'],
            'image' => gsx_image_url($l['image']),
            'inStock' => $l['in_stock'],
            'qty' => $l['qty'],
            'unitPrice' => gsx_cents_to_money($l['unit_cents']),
            'lineTotal' => gsx_cents_to_money($l['line_cents']),
        ];
    }
    return ['ok' => true, 'items' => $items, 'total' => gsx_cents_to_money($total)];
}

function gsx_h(string $v): string
{
    return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
}

/** A safe single-line value for an email header. */
function gsx_header_line(string $v): string
{
    return trim((string) preg_replace('/[\r\n]+/', ' ', $v));
}

/** Order-summary HTML table used in both order emails. */
function gsx_order_items_html(array $items, int $subtotalCents): string
{
    $cell = 'border:1px solid #dddddd;text-align:left;padding:8px;';
    $html = '<table style="border-collapse:collapse;width:100%;">'
        . '<tr>'
        . '<th style="' . $cell . 'background:#f2f2f2;">Products</th>'
        . '<th style="' . $cell . 'background:#f2f2f2;">Price</th>'
        . '<th style="' . $cell . 'background:#f2f2f2;">Qty</th>'
        . '<th style="' . $cell . 'background:#f2f2f2;">Total</th>'
        . '</tr>';
    foreach ($items as $it) {
        $html .= '<tr>'
            . '<td style="' . $cell . '">' . gsx_h($it['title']) . '</td>'
            . '<td style="' . $cell . '">$' . gsx_cents_to_money($it['unit_cents']) . '</td>'
            . '<td style="' . $cell . '">' . (int) $it['qty'] . '&nbsp;x&nbsp;$' . gsx_cents_to_money($it['unit_cents']) . '</td>'
            . '<td style="' . $cell . '">$' . gsx_cents_to_money($it['line_cents']) . '</td>'
            . '</tr>';
    }
    $html .= '<tr><td colspan="3" style="' . $cell . 'font-weight:bold;">Grand Total</td>'
        . '<td style="' . $cell . 'font-weight:bold;">$' . gsx_cents_to_money($subtotalCents) . '</td></tr>'
        . '</table>';
    return $html;
}

/**
 * Sends the two order emails exactly as the old site did: the order to GSX
 * (sales@gsxok.com), and a confirmation to the selected company's email.
 * Best-effort: the order is already saved, so a mail failure must never
 * change the result.
 */
function gsx_send_order_emails(int $orderId, array $customer, array $company, array $items, int $subtotalCents): void
{
    try {
        $companyEmail = gsx_header_line($company['email']);
        $validCompanyEmail = filter_var($companyEmail, FILTER_VALIDATE_EMAIL) !== false;

        $details = '<p><b>Company Name:</b> ' . gsx_h($company['name']) . '<br>'
            . '<b>Address:</b> ' . gsx_h($company['address'] . ', ' . $company['city'] . ', ' . $company['state'] . ' ' . $company['zip']) . '<br>'
            . '<b>OMMA License Number:</b> ' . gsx_h($company['license']) . '<br>'
            . '<b>Email:</b> ' . gsx_h($company['email']) . '<br>'
            . '<b>Phone:</b> ' . gsx_h($company['phone']) . '</p>';
        $table = gsx_order_items_html($items, $subtotalCents);

        $headersBase = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nFrom: " . GSX_ORDER_FROM;

        // 1. The order, to GSX.
        $internalHeaders = $headersBase . ($validCompanyEmail ? "\r\nReply-To: " . $companyEmail : '');
        $internalBody = '<b><u><i>Order Details</i></u></b> (order #' . $orderId . ', placed by '
            . gsx_h($customer['first_name'] . ' ' . $customer['last_name']) . ')<br><br>'
            . $table . '<br><b><u><i>Company information</i></u></b><br><br>' . $details;
        @mail(GSX_ORDER_NOTIFY_TO, 'New order details here', $internalBody, $internalHeaders);

        // 2. The confirmation, to the selected company's email.
        if ($validCompanyEmail) {
            $confirmHeaders = $headersBase . "\r\nReply-To: " . GSX_ORDER_NOTIFY_TO;
            $confirmBody = '<b><u><i>Order Details</i></u></b> (order #' . $orderId . ')<br><br>'
                . $table . '<br><b><u><i>Company information</i></u></b><br><br>' . $details;
            @mail($companyEmail, 'Your order confirmation details here', $confirmBody, $confirmHeaders);
        }
    } catch (Throwable $e) {
        error_log('[shop-order] email failed: ' . $e->getMessage());
    }
}
