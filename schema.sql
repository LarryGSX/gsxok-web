-- GSX Portal — MySQL schema for the HostGator-based account system.
--
-- Replaces the Vercel version's Prisma/Postgres schema (prisma/schema.prisma
-- on the control branch) with a HostGator-compatible MySQL equivalent.
-- Scope is deliberately limited to what the current Portal UI actually
-- collects (login, forgot-password, create-account) — no orders/dashboard
-- tables are included here, since we have no confirmed evidence of what
-- the legacy post-login experience looked like. Those can be added later
-- once that's known, without touching what's built here.
--
-- Field-for-field, `users` matches the Portal registration form exactly:
-- First Name, Last Name, Address, City, State, ZIP Code, OMMA License
-- Number, Email, Phone, Password — nothing added, nothing removed.
--
-- Run this once, by hand, in phpMyAdmin (or the mysql CLI) to create the
-- database structure — this file does not insert any data.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────────────────────
-- users
-- One row per Portal account. Mirrors the legacy `accounts` table's
-- real-world fields (see okgatesc_gsxdb.sql), but with a modern password
-- column and account-status values instead of the legacy free-text ones.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `users` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name`      VARCHAR(255) NOT NULL,
  `last_name`       VARCHAR(255) NOT NULL,
  `address`         VARCHAR(255) NOT NULL,
  `city`            VARCHAR(255) NOT NULL,
  `state`           VARCHAR(2)   NOT NULL,
  `zip`             VARCHAR(10)  NOT NULL,
  `omma_license`    VARCHAR(255) NOT NULL,
  `email`           VARCHAR(255) NOT NULL,
  `phone`           VARCHAR(30)  NOT NULL,

  -- Argon2id (or bcrypt, if Argon2 isn't available on the account's PHP
  -- build) via PHP's own password_hash() — never anything hand-rolled.
  -- NULL only for migrated accounts that haven't completed their forced
  -- password reset yet (see account_status below).
  `password_hash`   VARCHAR(255) NULL,

  -- pending: new signup, awaiting admin approval (matches the legacy
  --   'Pending' status — real spam-bot signups in the old data prove this
  --   gate is needed, not just theoretical).
  -- active: normal, usable account (matches legacy 'Verified').
  -- suspended: disabled by an admin.
  -- password_reset_required: a migrated legacy account — must set a new
  --   password before they can log in. Never carries the old MD5 hash
  --   forward as a usable credential.
  `account_status`  ENUM('pending', 'active', 'suspended', 'password_reset_required')
                    NOT NULL DEFAULT 'pending',

  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Points back to the original accounts.id from okgatesc_gsxdb.sql —
  -- NULL for anyone who signs up fresh through the new system. This is
  -- what makes migration traceable/reversible: every imported row can
  -- always be matched back to its source record.
  `legacy_id`       INT UNSIGNED NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_email` (`email`),
  UNIQUE KEY `uniq_users_legacy_id` (`legacy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────
-- companies
-- The current registration form has no "company name" field, so new
-- signups never create a row here directly — this table exists so
-- migrated legacy data has somewhere faithful to land. The real dump
-- shows a single account can legitimately have more than one company
-- attached (see the completion report — Chris Shell's account owns both
-- "Green Science Extracts" and "Second Company"), so this is a proper
-- one-to-many relationship, not one-to-one.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `companies` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         INT UNSIGNED NOT NULL,
  `name`            VARCHAR(255) NOT NULL,
  `address`         VARCHAR(255) NOT NULL,
  `city`            VARCHAR(255) NOT NULL,
  `state`           VARCHAR(2)   NOT NULL,
  `zip`             VARCHAR(10)  NOT NULL,
  `omma_license`    VARCHAR(255) NOT NULL,
  `email`           VARCHAR(255) NOT NULL,
  `phone`           VARCHAR(30)  NOT NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Points back to the original company.id from okgatesc_gsxdb.sql.
  `legacy_id`       INT UNSIGNED NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_companies_legacy_id` (`legacy_id`),
  KEY `idx_companies_user_id` (`user_id`),
  CONSTRAINT `fk_companies_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────
-- password_reset_tokens
-- Powers both "Forgot password?" and the forced reset for migrated
-- accounts (account_status = 'password_reset_required'). The raw token
-- is only ever emailed to the user — this table stores just its SHA-256
-- hash, so a database leak alone can't be used to reset anyone's password.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `password_reset_tokens` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED NOT NULL,
  `token_hash`  CHAR(64) NOT NULL COMMENT 'SHA-256 hex digest of the raw token',
  `expires_at`  TIMESTAMP NOT NULL,
  `used_at`     TIMESTAMP NULL DEFAULT NULL COMMENT 'Set once consumed, so a link can never be replayed',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_reset_token_hash` (`token_hash`),
  KEY `idx_reset_user_id` (`user_id`),
  CONSTRAINT `fk_reset_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────
-- login_attempts
-- A plain append-only log, checked before every login to enforce rate
-- limiting/lockout (e.g. "5 failed attempts for this email in the last 15
-- minutes → reject, even with the right password, for a short cool-down").
-- Keyed by both the submitted email and the requester's IP, so a lockout
-- can't be triggered purely by someone else mistyping a shared email
-- address, and a single IP hammering many different emails is still
-- visible. Old rows are pruned periodically (see cleanup notes in the
-- backend code) rather than kept forever.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `login_attempts` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email`          VARCHAR(255) NOT NULL,
  `ip_address`     VARCHAR(45) NOT NULL COMMENT 'IPv4 or IPv6',
  `succeeded`      TINYINT(1) NOT NULL DEFAULT 0,
  `attempted_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_attempts_email_time` (`email`, `attempted_at`),
  KEY `idx_attempts_ip_time` (`ip_address`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
