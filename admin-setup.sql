-- GSX Portal: staff (administrator) tables.
--
-- Run this ONCE in phpMyAdmin, in the same database the portal already
-- uses (SQL tab, paste, Go). It only ADDS two new tables and does not touch
-- the customer tables or any existing data.
--
-- The staff accounts themselves are added by a second, separate file
-- (admin-accounts.sql), which holds temporary passwords.

SET NAMES utf8mb4;

-- Administrators. They sign in on the regular Portal login page, and the site
-- shows them the administrator screen instead of the customer one. Passwords are stored hashed (never
-- readable). must_change_password = 1 forces a new password on first
-- sign-in, so the temporary one is only ever used once.
CREATE TABLE `admins` (
  `id`                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email`                 VARCHAR(255) NOT NULL,
  `first_name`            VARCHAR(255) NOT NULL,
  `password_hash`         VARCHAR(255) NOT NULL,
  `must_change_password`  TINYINT(1) NOT NULL DEFAULT 1,
  `status`                ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  `created_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A record of who did what (sign-ins, approvals, suspensions, password
-- changes), so with two staff accounts there's always a trail.
CREATE TABLE `admin_audit_log` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`        INT UNSIGNED NOT NULL,
  `action`          VARCHAR(50) NOT NULL,
  `target_user_id`  INT UNSIGNED NULL,
  `detail`          VARCHAR(255) NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_audit_admin_time` (`admin_id`, `created_at`),
  KEY `idx_audit_target` (`target_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
