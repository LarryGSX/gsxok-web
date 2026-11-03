-- Apply once AFTER 001, only in an approved isolated/backup-protected database.
-- Additive account metadata only; no customer-master, credential or legacy edits.
ALTER TABLE account_audit ADD COLUMN detail_json TEXT NULL;
ALTER TABLE account_profile_requests ADD COLUMN base_revision BIGINT UNSIGNED NOT NULL DEFAULT 0;
CREATE TABLE account_profile_decisions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id BIGINT UNSIGNED NOT NULL UNIQUE,
  company_id INT UNSIGNED NOT NULL,
  decision ENUM('approved','rejected') NOT NULL,
  reviewer_id INT UNSIGNED NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES account_profile_requests(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX profile_current(company_id,decision,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE account_company_identity (
  company_id INT UNSIGNED PRIMARY KEY,
  customer_uuid CHAR(36) NULL UNIQUE,
  version INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE account_link_receipts (
  receipt_uuid CHAR(36) PRIMARY KEY,
  payload_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE account_link_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED NOT NULL,
  version INT UNSIGNED NOT NULL,
  previous_uuid CHAR(36) NULL,
  customer_uuid CHAR(36) NULL,
  reviewer_id INT UNSIGNED NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  source_hash CHAR(64) NULL,
  legacy_user_id INT UNSIGNED NULL,
  legacy_company_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY link_version(company_id,version),
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Single-statement triggers work in PDO and phpMyAdmin without DELIMITER syntax.
CREATE TRIGGER account_audit_no_update BEFORE UPDATE ON account_audit FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account audit is append only';
CREATE TRIGGER account_audit_no_delete BEFORE DELETE ON account_audit FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account audit is append only';
CREATE TRIGGER account_profile_no_update BEFORE UPDATE ON account_profile_requests FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Profile claims are append only';
CREATE TRIGGER account_profile_no_delete BEFORE DELETE ON account_profile_requests FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Profile claims are append only';
CREATE TRIGGER account_decision_no_update BEFORE UPDATE ON account_profile_decisions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Profile decisions are append only';
CREATE TRIGGER account_decision_no_delete BEFORE DELETE ON account_profile_decisions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Profile decisions are append only';
CREATE TRIGGER account_link_no_update BEFORE UPDATE ON account_link_history FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Link history is append only';
CREATE TRIGGER account_link_no_delete BEFORE DELETE ON account_link_history FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Link history is append only';
