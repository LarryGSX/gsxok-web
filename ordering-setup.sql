-- GSX Portal: ordering (products, saved carts, placed orders).
--
-- Run this ONCE in phpMyAdmin, in the same database as the portal (SQL tab,
-- paste, Go). It only ADDS new tables. It changes nothing in `users`, does
-- not touch any account, password, or existing data, and contains no product
-- or customer data.
--
-- The products and each customer's old companies are loaded separately, from
-- an export of the production old-site database, with the scripts in tools/
-- (see tools/README.md). Nothing here is seeded from old or sample data.
--
-- This replaces the old ordering tables from the previous website
-- (okgatesc_gsxdb) with a version inside the portal database, so the new
-- site no longer depends on the old database.

SET NAMES utf8mb4;

-- ─────────────────────────────────────────────────────────────
-- products
-- `price` is the standard (current) price. `legacy_price` is the grandfathered
-- (original) price; NULL means "same as standard". Which one a customer is
-- charged is that customer's `customer_pricing` row (below), chosen by an
-- administrator, and read in one place: gsx_price_list_for_customer() in
-- shop-lib.php. Images are files in /images/products/.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE `products` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `legacy_id`     INT UNSIGNED NULL,
  `sku`           VARCHAR(50) NULL,
  `title`         VARCHAR(255) NOT NULL,
  `description`   TEXT NOT NULL,
  `image`         VARCHAR(255) NOT NULL,
  `price`         DECIMAL(10,2) NOT NULL,
  `legacy_price`  DECIMAL(10,2) NULL,
  `in_stock`      TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order`    INT NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_products_legacy_id` (`legacy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────
-- customer_pricing: which of the two price lists a customer is charged from.
-- 'old' = Old / Grandfathered, 'new' = New / Standard. An administrator
-- chooses it when approving an account and can change it later. A customer
-- with NO row here has no pricing assigned yet and cannot see prices or order
-- until an administrator assigns one; nothing is ever assigned automatically.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE `customer_pricing` (
  `user_id`     INT UNSIGNED NOT NULL,
  `tier`        ENUM('old', 'new') NOT NULL,
  `set_by`      INT UNSIGNED NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_pricing_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────
-- cart_items: each customer's saved cart (like the old site, where the cart
-- was stored on the server). One row per product per account, so the cart
-- follows the customer between sessions and devices.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE `cart_items` (
  `user_id`     INT UNSIGNED NOT NULL,
  `product_id`  INT UNSIGNED NOT NULL,
  `qty`         INT UNSIGNED NOT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`user_id`, `product_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────
-- orders: one row per placed order. The company's details are copied onto
-- the order, so later edits to a company never change past orders. Status is
-- 'in_progress' (placed) or 'completed', the same as the old site.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE `orders` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        INT UNSIGNED NOT NULL,
  `company_id`     INT UNSIGNED NULL,
  `status`         ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
  `company_name`   VARCHAR(255) NOT NULL,
  `ship_address`   VARCHAR(255) NOT NULL,
  `ship_city`      VARCHAR(255) NOT NULL,
  `ship_state`     VARCHAR(2) NOT NULL,
  `ship_zip`       VARCHAR(10) NOT NULL,
  `license`        VARCHAR(255) NOT NULL,
  `contact_email`  VARCHAR(255) NOT NULL,
  `contact_phone`  VARCHAR(30) NOT NULL,
  `subtotal`       DECIMAL(10,2) NOT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_orders_user` (`user_id`, `created_at`),
  KEY `idx_orders_status` (`status`, `created_at`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The products on each order, with the price actually charged at the time.
CREATE TABLE `order_items` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`    INT UNSIGNED NOT NULL,
  `product_id`  INT UNSIGNED NULL,
  `title`       VARCHAR(255) NOT NULL,
  `image`       VARCHAR(255) NOT NULL,
  `unit_price`  DECIMAL(10,2) NOT NULL,
  `qty`         INT UNSIGNED NOT NULL,
  `line_total`  DECIMAL(10,2) NOT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_items_order` (`order_id`),
  CONSTRAINT `fk_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
