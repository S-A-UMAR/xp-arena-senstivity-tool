-- ############################################################################
-- # XP ARENA VENDOR SYSTEM SYNC MIGRATION
-- ############################################################################

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Update Vendors Table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS tier ENUM('normal', 'pro', 'elite') DEFAULT 'normal' AFTER status,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE AFTER tier,
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) DEFAULT NULL AFTER vendor_id;

-- 2. Update Sensitivity Keys Table
ALTER TABLE sensitivity_keys
ADD COLUMN IF NOT EXISTS tier ENUM('normal', 'pro', 'elite') DEFAULT 'normal' AFTER status;

-- 3. Update Tournament Registrations
ALTER TABLE tournament_registrations
ADD COLUMN IF NOT EXISTS access_code VARCHAR(50) NOT NULL AFTER user_uid;

-- 4. Update Giveaway Entries
ALTER TABLE giveaway_entries
ADD COLUMN IF NOT EXISTS access_code VARCHAR(50) NOT NULL AFTER user_id;

-- 5. Ensure Migrations Table reflects this change
INSERT IGNORE INTO schema_migrations (version, description) 
VALUES ('2026-04-vendor-system-sync', 'Align DB schema with vendor frontend logic and tier features');

SET FOREIGN_KEY_CHECKS = 1;
