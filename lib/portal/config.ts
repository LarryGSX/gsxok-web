// Portal settings. Server-side only.
//
// The numbers below are the same as the approved HostGator build's
// portal-config.php, so the two sites behave identically. The few that
// depend on where the site is deployed are read from environment variables
// (see .env.example), with the same defaults HostGator uses.

export const SESSION_COOKIE_NAME = 'gsx_session'
export const SESSION_LIFETIME_SECONDS = 60 * 60 * 8 // 8 hours
export const LOGIN_MAX_ATTEMPTS = 5 // failed attempts per email
export const LOGIN_MAX_ATTEMPTS_PER_IP = 20 // failed attempts per IP address (across all emails)
export const LOGIN_WINDOW_MINUTES = 15
export const RESET_TOKEN_LIFETIME_MINUTES = 60
export const ADMIN_IDLE_SECONDS = 60 * 60 // 1 hour
export const ADMIN_PASSWORD_MIN = 8
export const QTY_TECHNICAL_MAX = 100000
export const NEW_ACCOUNTS_REQUIRE_APPROVAL = true

export const NAME_MAX = 255
export const ADDRESS_MAX = 255
export const CITY_MAX = 255
export const STATE_LEN = 2
export const ZIP_MAX = 10
export const LICENSE_MAX = 255
export const EMAIL_MAX = 255
export const PHONE_MAX = 30
export const PASSWORD_MIN = 8

// Where a placed order is sent, and who it is sent from. A confirmation also
// goes to the email of the company the customer chose.
export const ORDER_NOTIFY_TO = process.env.ORDER_NOTIFICATION_EMAIL || 'sales@gsxok.com'
export const ORDER_FROM = process.env.ORDER_EMAIL_FROM || 'GSX Orders <sales@gsxok.com>'

// Password-reset email. Off by default, exactly like HostGator
// (GSX_PORTAL_MAIL_READY = false): the reset token is still created, but no
// email is sent until PORTAL_MAIL_READY=true is set.
export const PORTAL_MAIL_READY = process.env.PORTAL_MAIL_READY === 'true'
export const PORTAL_MAIL_FROM = process.env.PORTAL_EMAIL_FROM || 'GSX Portal <contact@gsxok.com>'
export const PORTAL_SITE_BASE_URL = process.env.PORTAL_SITE_BASE_URL || ''
