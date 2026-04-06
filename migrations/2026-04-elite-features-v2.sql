-- ############################################################################
-- # XP ARENA ELITE FEATURES MIGRATION (V2) - ENHANCED CONNECTED INTELLIGENCE
-- ############################################################################

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Add Verification to Vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 2. Add Access Code Tracking to Arena Entries (Audit Trail)
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS access_code VARCHAR(50) DEFAULT NULL;
ALTER TABLE giveaway_entries ADD COLUMN IF NOT EXISTS access_code VARCHAR(50) DEFAULT NULL;

-- 3. Enhanced Conversion Tracking
ALTER TABLE user_events ADD COLUMN IF NOT EXISTS event_details JSON DEFAULT NULL;
ALTER TABLE user_events MODIFY COLUMN event_type VARCHAR(100);

-- 4. Winner ID Cards Table
CREATE TABLE IF NOT EXISTS winner_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM('giveaway', 'tournament') NOT NULL,
    event_id INT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    access_code VARCHAR(50) NOT NULL,
    card_hash VARCHAR(64) UNIQUE NOT NULL, -- Unique hash for sharing
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (card_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 5. Arena Hype Pulses (Live Interaction)
CREATE TABLE IF NOT EXISTS arena_hype (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id VARCHAR(50) NOT NULL,
    hype_type VARCHAR(20) NOT NULL, -- 'fire', 'heart', 'clap', etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

SET FOREIGN_KEY_CHECKS = 1;
