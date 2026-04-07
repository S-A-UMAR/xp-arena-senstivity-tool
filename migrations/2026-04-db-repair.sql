-- ############################################################################
-- # XP ARENA DATABASE AUDIT & REPAIR - SYNCING ALL MISSING ELITE TABLES
-- ############################################################################

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Ensure Verified Column in Vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 2. Create Giveaways Table (If missing)
CREATE TABLE IF NOT EXISTS giveaways (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    prize_description TEXT NOT NULL,
    type ENUM('cash', 'gifting', 'merch', 'other') DEFAULT 'cash',
    max_winners INT DEFAULT 1,
    status ENUM('active', 'drawn', 'cancelled') DEFAULT 'active',
    end_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (vendor_id),
    INDEX (status),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 3. Create Giveaway Entries Table (With Access Code tracking)
CREATE TABLE IF NOT EXISTS giveaway_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    giveaway_id INT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    input_data TEXT NOT NULL,
    access_code VARCHAR(50) DEFAULT NULL,
    fingerprint_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (giveaway_id, fingerprint_hash),
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 4. Update Tournament Registrations with Access Code
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS access_code VARCHAR(50) DEFAULT NULL;

-- 5. Arena Hype Table (Live Spectator Interaction)
CREATE TABLE IF NOT EXISTS arena_hype (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id VARCHAR(50) NOT NULL,
    hype_type VARCHAR(20) NOT NULL, -- 'fire', 'heart', 'clap', 'trophy'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 6. Winner ID Cards Table (Branded social proof)
CREATE TABLE IF NOT EXISTS winner_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM('giveaway', 'tournament') NOT NULL,
    event_id INT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    access_code VARCHAR(50) NOT NULL,
    card_hash VARCHAR(64) UNIQUE NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (card_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 7. Tournament Results Table (For Brackets & History)
CREATE TABLE IF NOT EXISTS tournament_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    `rank` INT NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_uid VARCHAR(50) NOT NULL,
    prize_awarded VARCHAR(100),
    proof_url VARCHAR(500), -- Screenshot or VOD link
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

SET FOREIGN_KEY_CHECKS = 1;
