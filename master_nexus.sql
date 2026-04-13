-- AXP NEURAL NEXUS - MASTER ARCHITECTURE (TiDB / MySQL)
-- Consolidated Master Schema v2.0
-- (C) 2026 XP-ARENA GLOBAL

CREATE DATABASE IF NOT EXISTS axp_neural_nexus;
USE axp_neural_nexus;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── CORE IDENTITY LAYER ─────────────────────────────────────

-- Organizations Table (Multi-tenant Root)
CREATE TABLE IF NOT EXISTS organizations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50) UNIQUE NOT NULL,
    org_name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);

-- Account Registry (Unified Admins & Vendors)
CREATE TABLE IF NOT EXISTS account_registry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50) NOT NULL,
    account_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'CREATOR-X', 'ADMIN-ROOT'
    display_name VARCHAR(100) NOT NULL,
    pass_hash VARCHAR(100) NOT NULL, -- bcrypt
    lookup_key VARCHAR(20) UNIQUE DEFAULT NULL, -- for vanity URLs or short IDs
    role ENUM('admin', 'vendor', 'support') DEFAULT 'vendor',
    tier ENUM('normal', 'gold', 'platinum', 'nexus') DEFAULT 'normal',
    status ENUM('active', 'suspended', 'pending', 'deleted') DEFAULT 'active',
    brand_config JSON DEFAULT NULL, -- UI customization
    permissions JSON DEFAULT NULL, -- Granular feature flags
    webhook_url VARCHAR(500) DEFAULT NULL,
    last_login DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id),
    INDEX (role),
    INDEX (status)
);

-- ─── SAAS & BILLING ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_tiers (
    tier_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price_monthly DECIMAL(10,2) DEFAULT 0.00,
    features JSON DEFAULT NULL, -- {"giveaways": true, "max_codes": 1000}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,
    tier_id VARCHAR(20) NOT NULL,
    active_until DATETIME NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES account_registry(account_id),
    FOREIGN KEY (tier_id) REFERENCES billing_tiers(tier_id)
);

-- ─── SENSITIVITY ENGINE DATA ──────────────────────────────────

CREATE TABLE IF NOT EXISTS sensitivity_keys (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entry_code VARCHAR(100) UNIQUE NOT NULL, -- bcrypt
    lookup_key VARCHAR(16) UNIQUE NOT NULL,
    account_id VARCHAR(50) NOT NULL,
    results_json JSON NOT NULL,
    creator_advice TEXT DEFAULT NULL,
    usage_limit INT DEFAULT NULL,
    current_usage INT DEFAULT 0,
    status ENUM('active', 'expired', 'revoked') DEFAULT 'active',
    expires_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES account_registry(account_id),
    INDEX (account_id),
    INDEX (lookup_key)
);

-- ─── GIVEAWAY ENGINE DATA ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS giveaways (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    game_id VARCHAR(50) DEFAULT 'FREEFIRE',
    prize_config JSON NOT NULL,
    entry_type ENUM('UID', 'PHONE', 'EMAIL') DEFAULT 'UID',
    win_condition ENUM('FIRST_FINGER', 'RANDOM_DRAW') DEFAULT 'RANDOM_DRAW',
    max_slots INT DEFAULT NULL,
    current_slots INT DEFAULT 0,
    status ENUM('pending', 'active', 'finished', 'cancelled') DEFAULT 'pending',
    start_at DATETIME,
    end_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES account_registry(account_id)
);

CREATE TABLE IF NOT EXISTS giveaway_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    giveaway_id BIGINT NOT NULL,
    user_identifier VARCHAR(255) NOT NULL,
    user_ign VARCHAR(100),
    user_ip VARCHAR(45),
    is_winner BOOLEAN DEFAULT FALSE,
    winner_rank INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE,
    INDEX (giveaway_id),
    INDEX (user_identifier)
);

-- ─── USER & ANALYTICS PERSISTENCE ─────────────────────────────

-- Unified User Registry (Roaming Profiles)
CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    universal_id VARCHAR(100) UNIQUE NOT NULL, -- Device ID or UUID
    ign VARCHAR(100),
    region VARCHAR(50),
    active_lab_id VARCHAR(16) DEFAULT NULL,
    xp_points INT DEFAULT 0,
    level INT DEFAULT 1,
    sync_data JSON DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);



CREATE TABLE IF NOT EXISTS activity_ledger (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50),
    account_id VARCHAR(50) NOT NULL,
    resource_type ENUM('credit', 'usage', 'slot', 'token') NOT NULL,
    delta INT NOT NULL, -- +100 or -1
    reason VARCHAR(255), -- 'SUBSCRIPTION_REFRESH', 'CODE_GENERATED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (account_id, created_at)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50),
    actor_type ENUM('admin', 'vendor', 'system') NOT NULL,
    actor_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (org_id, created_at)
);

-- ─── SYSTEM CONFIG & CACHE ────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transient_cache (
    cache_key VARCHAR(100) PRIMARY KEY,
    cache_value LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX (expires_at)
);

CREATE TABLE IF NOT EXISTS diagnostic_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    diagnostic_id VARCHAR(16) UNIQUE NOT NULL,
    avg_reaction_ms INT NOT NULL,
    precision_score INT NOT NULL,
    raw_data JSON DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (diagnostic_id)
);

SET FOREIGN_KEY_CHECKS = 1;

-- Seed Basic Operations
INSERT IGNORE INTO organizations (org_id, org_name) VALUES ('XP-CORE-ORG', 'XP ARENA GLOBAL');

INSERT IGNORE INTO billing_tiers (tier_id, name, price_monthly, features) VALUES 
('free', 'Initiate', 0.00, '{"max_codes": 5}'),
('pro', 'Pro Node', 29.99, '{"max_codes": 1000}'),
('nexus', 'Elite Nexus', 99.99, '{"max_codes": 99999, "whitelabel": true}');

INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES ('global_sensitivity_offset', '1.0');
