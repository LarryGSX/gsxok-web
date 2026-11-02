# HostGator deployment checklist: ordering portal, admin approvals, two-tier pricing

For: **Chris**, who performs the deployment and the HostGator-side verification.
Applies to: branch `hostgator-static`, commit `8a16820` and any later commit that Braden has approved in writing.

This is a checklist. Do the steps in order and tick each one. If a step does not behave as described, **stop and tell Braden what you saw** (the exact message or screenshot). Do not improvise a fix on the server.

## Who does what

- **Chris** does all HostGator work: backups, phpMyAdmin, SQL, file upload, config checks, server logs, Apache checks, and the live admin, order and email verification.
- **Braden** coordinates the project and approves what goes into GitHub. Braden is not expected to use cPanel, phpMyAdmin, Apache, server logs, or do any manual production-server work.
- **GitHub (`LarryGSX/gsxok-web`, branch `hostgator-static`) is the source of truth.** Deployment files are generated from committed source. Do not edit PHP files on the server. If something must change, it changes in GitHub first and a new package is made.

## What this release does

- Customers log in at `/portal` and get the ordering portal: Products, Cart (saved on the server), My Orders, My Companies, and order submission to one of their own companies.
- Administrators log in at the same `/portal` page and get the administrator screen: Customers (Pending, Active, Suspended, Needs reset, All; Approve, Reject, Suspend, Reactivate) and Orders (Active orders, Completed orders, Mark Completed).
- **Pricing is chosen by the administrator**, per customer: Old / Grandfathered or New / Standard. It is chosen when approving an account and can be changed later. The server decides every price. An account with no pricing assigned cannot see prices or order.
- Nothing about the public pages changes (Home, Products, Find GSX, About, Contact, Learn).

Prices (chocolate bags, from Larry):

| | 250 mg | 500 mg | 1,000 mg |
|---|---|---|---|
| Old / Grandfathered | $5.00 | $6.50 | $8.00 |
| New / Standard | $6.00 | $7.50 | $9.00 |

The Hammer ($20) and Fruit Crunchers ($9) cost the same on both lists. Gummies are not part of this release.

## What is NOT in GitHub (supplied separately at deployment time)

These contain customer or secret information, so they are never committed:

- The **fresh export of `okgatesc_gsxdb`** (the old site's database). You supply this.
- The **generated import files** made from that export (`products-import.sql`, `companies-import.sql`). They are created from the fresh export and handed to you privately with the deployment package.
- The server-only secret files `portal-secrets.php` and `contact-secrets.php`. They already exist on the server and stay there.

This document contains no passwords, database or SMTP credentials, keys, or customer data, and you should never add any to it.

---

## Checklist

### 1. Back up first
- [ ] Download a copy of the **entire current website folder** from HostGator (cPanel File Manager: select everything in the site's document root, Compress, download the ZIP). Keep it somewhere safe; it is your rollback.
- [ ] In phpMyAdmin, export the **portal database** (the one `portal-secrets.php` points to; it holds the `users` and `admins` tables): Export, Quick, SQL. Keep the file safe.
- [ ] Write down the date, time, and the commit hash you are deploying.

### 2. Preserve the server-only secret files
- [ ] Confirm `portal-secrets.php` and `contact-secrets.php` exist on the server. **Never overwrite, rename or delete them.** The deployment package does not contain them.
- [ ] When uploading later, overwrite files with the same name but **do not delete files that are not in the package**.

### 3. Prepare the portal database (BEFORE uploading any new PHP)
The admin customer list now reads a new table. If the new PHP is uploaded before this step, the admin customer list stops working.

- [ ] In phpMyAdmin, select the **portal database**, open the SQL tab, paste the contents of **`ordering-setup.sql`** from the repository, and click Go. Run it **once**.
- [ ] Confirm these five tables now exist: `products`, `customer_pricing`, `cart_items`, `orders`, `order_items`. This script only adds tables. It changes nothing in `users`, `admins`, `companies` or any existing data.
- [ ] If it reports that a table already exists, **stop and tell Braden**. Do not run it a second time.

### 4. Get a fresh export of the old database
- [ ] In phpMyAdmin, select the **old** database `okgatesc_gsxdb`: Export, Quick, SQL.
- [ ] Use a **fresh export taken now**. Do **not** use the August export or any older copy; it is stale (it is missing recent accounts and orders).
- [ ] Hand the file to Braden privately (not by public link, not committed to GitHub), so the import files can be generated in step 5.

### 5. Generate the current product and company import files
These are made from the fresh export, using the tools in the repository (`tools/`, see `tools/README.md`). They need Node.js. They are run on the development side (not on HostGator) and the results are delivered to you privately. If you prefer to run them yourself, from a copy of the repository at the approved commit:

```bash
node tools/import-legacy-products.cjs path/to/okgatesc_gsxdb.sql > products-import.sql
node tools/import-legacy-companies.cjs path/to/okgatesc_gsxdb.sql --link 1:17 --link 2:20 --link 3:28 > companies-import.sql
```

- Both tools only read the export and write a file. They do not touch any database.
- **If the products tool prints any line starting with `WARNING`, stop and tell Braden.** It means a product photo is not mapped.
- The generated files hold customer details. Never commit them, post them, or leave them in a shared folder. They are ignored by Git on purpose.

### 6. Use only the three verified legacy mappings

| Portal user id | Old-site account id |
|---|---|
| 1 | 17 |
| 2 | 20 |
| 3 | 28 |

These are the only verified mappings. **Do not add any other.**

- [ ] Before importing, run this read-only check in phpMyAdmin on the portal database:
  ```sql
  SELECT id, legacy_id FROM users WHERE id IN (1, 2, 3, 4) ORDER BY id;
  ```
  Expected: id 1 has legacy_id 17, id 2 has 20, id 3 has 28, and id 4 has `NULL`.
- [ ] If any row differs from that, **stop and tell Braden**. Do not "fix" it with an `UPDATE`. The legacy links were already set earlier and must not be repeated or changed.

### 7. Portal user 4 stays unmapped
- [ ] Portal user 4 intentionally has **no** verified legacy association. Leave `legacy_id` empty for that account.
- [ ] Do not associate user 4 with any company from the old database, and do not pass a `--link` for user 4. If a link is ever wanted, it must be separately verified first and added in writing.

### 8. Import the current products and companies
Run these in the **portal database** (SQL tab), after step 3, in this order:

- [ ] Run **`products-import.sql`** once. Check the row count: `SELECT COUNT(*) FROM products;` must equal the number the products tool reported ("N products converted"). If this file errors, **do not re-run it blindly**; stop and tell Braden.
- [ ] Spot-check the chocolate prices:
  ```sql
  SELECT title, price, legacy_price FROM products WHERE title LIKE '%Chocolate Bites' ORDER BY title;
  ```
  Expected: the 250 mg bags have `price` 6.00 and `legacy_price` 5.00; the 500 mg bags 7.50 and 6.50; the 1,000 mg bags 9.00 and 8.00. (`price` is New / Standard, `legacy_price` is Old / Grandfathered.)
- [ ] Run **`companies-import.sql`**. It is safe to run again (it skips companies already imported). The companies tool printed how many companies it found for each of the three accounts; they should match what the import adds. Duplicate company rows in the old data are brought across as they are on purpose.

### 9. Upload the deployment package
- [ ] Use only the package built **from the committed GitHub source** at the approved commit. Do not use any older ZIP (for example the earlier "GSX Ordering Update" ZIP), and do not use files that did not come from GitHub.
- [ ] Upload and extract it into the site's document root, overwriting same-named files. Do not delete anything else.
- [ ] The package contains the built website, all the portal and admin PHP files, `.htaccess`, and the product photos. It does **not** contain any secrets file or any import SQL.

### 10. Use the repository's `portal-config.php`; keep the server-only secrets
- [ ] The package includes the repository's current **`portal-config.php`**. Let it replace the one on the server. The new ordering code needs three settings an older config does not have (`GSX_ORDER_FROM`, `GSX_ORDER_NOTIFY_TO`, `GSX_QTY_TECHNICAL_MAX`).
- [ ] `portal-config.php` holds no passwords. Database and mail credentials live in `portal-secrets.php` and `contact-secrets.php`, which you are not replacing. Confirm both are still there afterwards.
- [ ] Do not hand-edit `portal-config.php` on the server. If a value must change, tell Braden so it is changed in GitHub.

### 11. Remove the two diagnostic files from production
- [ ] Delete these from the document root if they exist: `gsx-ordering-check.php` and `gsx-portal-workspace.php`.
- [ ] (`.htaccess` also blocks them. Deleting is still required.)

### 12. Leave the old `/admin/` and `/dashboard/` folders alone
- [ ] Do **not** delete, rename or block the old `/admin/` and `/dashboard/` folders. They are kept for rollback and for the old order history. They will be retired in a later, separately approved step.

### 13. Verify the administrator login
- [ ] Open `https://gsxok.com/portal` and sign in with **`chris@gsxok.com`**, the administrator account. **Do not use his separate customer account** (a different email address): it correctly shows the customer view ("Welcome back, Chris.") with no admin controls.
- [ ] Expected: the page shows **"Signed in as Chris (administrator)"** with **Customers** and **Orders** buttons. (If the account is still on a temporary password, you first see a "set a new password" form; passwords must be at least 8 characters. Do not change Chris's password for testing.)
- [ ] Customers tab: the Pending / Active / Suspended / Needs reset / All buttons are present and the accounts list loads.
- [ ] Orders tab: Active orders and Completed orders are present.
- [ ] Sign out. Sign in as an ordinary customer and confirm no administrator controls are visible.

### 14. Only if the administrator screen still does not appear
Do this **only** if step 13 failed. If step 13 worked, skip this step.

1. Re-check that you signed in with `chris@gsxok.com`.
2. Right after signing in, open `https://gsxok.com/session-check.php` in the same browser. A working admin shows `"loggedIn":true` and `"role":"admin"`.
   - `"loggedIn":false` means the server did not recognise the admin session; run the database query below.
   - An error page or a blank page means a PHP error; read the HostGator log below.
   - `"role":"customer"` means a customer account was used.
3. HostGator log: in cPanel open **Errors** (or the `error_log` file in the site's document root) and look for `Undefined constant` or `[admin-security] admin lookup failed`.
4. Database query, in phpMyAdmin on the portal database:
   ```sql
   SELECT id, email, first_name, must_change_password, status FROM admins;
   ```
   Report either the exact "Unknown column" error text, or confirm that a row for `chris@gsxok.com` exists with `status` = `active`.
5. Send the findings to Braden. Do not edit PHP on the server.

### 15. Assign pricing to every existing approved customer (before they may order)
Existing accounts are **never** assigned a price list automatically. The legacy links in step 6 are **not** a pricing rule. Until pricing is assigned, an account cannot see prices or place an order (it sees a message to contact sales@gsxok.com).

- [ ] Sign in as the administrator. Open **Customers**, then **Active**.
- [ ] For each existing approved customer, choose **Old / Grandfathered** or **New / Standard** in its Pricing row and click **Save pricing**, per Larry's decision for that customer. Do the same for accounts under **Suspended** or **Needs reset** that will return.
- [ ] Confirm no account in use still says "Pricing: not set".
- [ ] From now on, a pending account cannot be approved until a pricing choice is made on it.

### 16. Test one real customer order
- [ ] Sign in as a real customer account that has a company (for example Chris's customer account). **Products** should show that customer's prices.
- [ ] Add a product, open **Cart**, choose a company, and place the order.
- [ ] Sign in as the administrator: the order appears under **Orders, Active orders**. Click **Mark Completed** and confirm it moves to Completed orders.
- [ ] Tell Larry it was a test order so it is not shipped.

### 17. Verify both order emails
The new code sends mail with PHP `mail()`; the old site used authenticated SMTP. Real delivery has not been tested, so this step matters.

- [ ] The internal email arrives at **sales@gsxok.com** with the subject **"New order details here"**.
- [ ] The confirmation arrives at the **selected company's email** with the subject **"Your order confirmation details here"**. The account email does not get a separate copy.
- [ ] Check spam and junk folders too. If an email does not arrive, tell Braden; do not change the code on the server.

### 18. Verify clean URLs and diagnostic-file blocking
- [ ] These load normally: `/`, `/products`, `/find-gsx`, `/about`, `/contact`, `/learn`, `/portal`.
- [ ] `https://gsxok.com/gsx-ordering-check.php` and `https://gsxok.com/gsx-portal-workspace.php` return 403 or 404.
- [ ] `https://gsxok.com/portal-config.php` and `https://gsxok.com/portal-secrets.php` return 403.
- [ ] Spot-check that the public pages look the same as before (header, footer, images).

### 19. Rollback procedure
Use this if the new version causes a problem and cannot be fixed quickly.

1. Restore the website files from the ZIP you made in step 1: upload it over the document root so the old files replace the new ones.
2. Do **not** touch `portal-secrets.php` or `contact-secrets.php`.
3. Leave the new database tables in place. They are additions, and the old files simply ignore them. Do not drop tables unless Braden says to.
4. Only if Braden asks for a full database rollback, restore the portal database export from step 1. This also removes any registrations or changes made since that backup, so avoid it if possible.
5. Re-check `https://gsxok.com/portal` and the public pages, and tell Braden what happened.

---

## Notes

- The old `/admin/` and `/dashboard/` folders, and the old database `okgatesc_gsxdb`, remain in place for history and rollback for now. Importing the old order history and rotating the old database and mailbox passwords are separate, later steps and are not part of this checklist.
- Passwords are never to be written into this repository, in this document, in the import files, or in commit messages.
