-- ############################################################################
-- # XP ARENA ELITE FEATURES MIGRATION (V1)
-- ############################################################################

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Giveaways Table
CREATE TABLE IF NOT EXISTS giveaways (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id VARCHAR(50) NOT NULL,
    type ENUM('redeem_code', 'cash_prize', 'gifting', 'custom') NOT NULL,
    title VARCHAR(100) NOT NULL,
    prize_description TEXT NOT NULL,
    end_at DATETIME NOT NULL,
    max_winners INT DEFAULT 1,
    status ENUM('active', 'drawn', 'cancelled') DEFAULT 'active',
    proof_hash VARCHAR(64) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (vendor_id),
    INDEX (status),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 2. Giveaway Entries Table
CREATE TABLE IF NOT EXISTS giveaway_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    giveaway_id INT NOT NULL,
    user_id VARCHAR(100) NOT NULL, -- Session ID or Fingerprint
    input_data TEXT NOT NULL,
    fingerprint_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (giveaway_id, fingerprint_hash), -- One entry per person/device
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 3. Tournaments Table
CREATE TABLE IF NOT EXISTS tournaments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id VARCHAR(50) NOT NULL,
    type ENUM('prize_pool', 'battle_royale') NOT NULL,
    map_name VARCHAR(50) DEFAULT NULL,
    total_slots INT NOT NULL,
    filled_slots INT DEFAULT 0,
    prize_pool VARCHAR(100) NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    comm_link VARCHAR(500) DEFAULT NULL,
    status ENUM('open', 'full', 'completed', 'cancelled') DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (vendor_id),
    INDEX (status),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 4. Tournament Registrations Table
CREATE TABLE IF NOT EXISTS tournament_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_uid VARCHAR(50) NOT NULL,
    entry_key VARCHAR(32) UNIQUE NOT NULL, -- Re-entry key
    fingerprint_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (tournament_id, fingerprint_hash), -- One registration per person/device
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 5. User Profiles Table (XP & Levels)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR(100) PRIMARY KEY, -- Fingerprint hash
    xp_points INT DEFAULT 0,
    level INT DEFAULT 1,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 6. Audit & History Logs Table (Expanded)
CREATE TABLE IF NOT EXISTS history_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_id VARCHAR(100) NOT NULL,
    actor_type ENUM('vendor', 'user', 'admin') NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'giveaway_entry', 'tournament_join', 'xp_gain', etc.
    details JSON DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (actor_id),
    INDEX (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

SET FOREIGN_KEY_CHECKS = 1;
