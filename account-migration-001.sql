-- Review-only additive migration. Apply once to a backed-up portal database.
-- MySQL 5.7+/MariaDB; DDL is not transactionally reversible. Never rerun blindly.
-- Does not replace credentials, IDs, legacy mappings, companies or pricing.
ALTER TABLE users
  ADD COLUMN account_access ENUM('pending','approved','suspended') NOT NULL DEFAULT 'pending',
  ADD COLUMN email_verified_at DATETIME NULL,
  ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 1;
-- Preserve prior approval, but do not claim ownership of any existing email.
UPDATE users SET account_access = 'approved', updated_at = updated_at WHERE account_status IN ('active','password_reset_required');
ALTER TABLE admins ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 1;
CREATE TABLE account_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  purpose ENUM('verify','reset') NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX token_user (user_id, purpose),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE account_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(20) NOT NULL,
  email_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX request_time (created_at), INDEX request_email (email_hash, created_at),
  INDEX request_ip (ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE account_mail_queue (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  purpose ENUM('verify','reset') NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL,
  sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX mail_pending(sent_at,next_attempt_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE account_audit (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED NULL,
  actor_admin_id INT UNSIGNED NULL,
  target_user_id INT UNSIGNED NOT NULL,
  action VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Profile edits are claims, never changes to authoritative/legacy company rows.
CREATE TABLE account_profile_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  company_id INT UNSIGNED NOT NULL,
  profile_json TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
