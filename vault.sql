-- [UPGRADED] AXP NEURAL NEXUS MODULE: SENSITIVITY CORE
-- This schema is now a submodule of axp_neural_nexus.
-- See master_nexus.sql for unified identity, billing, and roaming profiles.

CREATE DATABASE IF NOT EXISTS axp_neural_nexus;
USE axp_neural_nexus;

-- Organizations Table (Multi-tenant Root)
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50) UNIQUE NOT NULL,
    org_name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50) DEFAULT 'XP-CORE-ORG',
    vendor_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'GUEST-CREATOR'
    access_key VARCHAR(100) UNIQUE NOT NULL, -- bcrypt hash
    lookup_key VARCHAR(20) UNIQUE DEFAULT NULL,
    active_until DATETIME DEFAULT NULL,
    webhook_url VARCHAR(500) DEFAULT NULL,
    brand_config JSON NOT NULL, -- { "logo": "...", "colors": { "primary": "..." }, "socials": { "yt": "...", "ig": "...", "dc": "..." } }
    usage_limit INT DEFAULT NULL,
    status ENUM('active', 'suspended') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE SET NULL
);

-- Sensitivity Keys Table: Stores user-specific results linked to codes
CREATE TABLE IF NOT EXISTS sensitivity_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_code VARCHAR(100) UNIQUE NOT NULL, -- bcrypt hash of 6-digit code
    lookup_key VARCHAR(16) UNIQUE NOT NULL,
    vendor_id VARCHAR(50),
    results_json JSON NOT NULL, -- Calculated sensitivity data
    creator_advice TEXT DEFAULT NULL,
    custom_results_json JSON DEFAULT NULL, -- Manual overrides by vendor/user
    usage_limit INT DEFAULT NULL, -- NULL = Unlimited
    current_usage INT DEFAULT 0,
    status ENUM('active', 'expired') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL
);

-- User Events Table (Analytics Upgrade)
CREATE TABLE IF NOT EXISTS user_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    org_id VARCHAR(50),
    vendor_id VARCHAR(50),
    user_session_id VARCHAR(100),
    device_tier VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_type VARCHAR(50),
    actor_id VARCHAR(100),
    action VARCHAR(100),
    details JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Code Activity Table: Tracks who used what code
CREATE TABLE IF NOT EXISTS code_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_code VARCHAR(20) NOT NULL, -- plaintext for reference
    lookup_key VARCHAR(16) NOT NULL,
    user_ign VARCHAR(100),
    user_region VARCHAR(50),
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    feedback_rating INT DEFAULT NULL,
    feedback_comment TEXT DEFAULT NULL,
    INDEX (entry_code),
    INDEX (lookup_key)
);

-- Security Logs Table: tracks verification failures and throttling
CREATE TABLE IF NOT EXISTS security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45),
    event_type VARCHAR(50),
    details JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (ip_address),
    INDEX (event_type)
);

-- Seed Data
INSERT IGNORE INTO organizations (org_id, org_name) VALUES ('XP-CORE-ORG', 'XP ARENA GLOBAL');

-- NOTE: XP-ADMIN seed should be provisioned from environment secret by migrate.js
-- (ADMIN_SECRET / SEED_VENDOR_KEY) to avoid hardcoded credentials in SQL.

-- Transient Cache for small performance optimizations
CREATE TABLE IF NOT EXISTS transient_cache (
    cache_key VARCHAR(100) PRIMARY KEY,
    cache_value LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX (expires_at)
);

-- Diagnostic Results: Stores user reaction/precision data linked to a short ID
CREATE TABLE IF NOT EXISTS diagnostic_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    diagnostic_id VARCHAR(16) UNIQUE NOT NULL, -- e.g. LAB-A83BK
    avg_reaction_ms INT NOT NULL,
    precision_score INT NOT NULL, -- 0-100
    raw_data JSON DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (diagnostic_id)
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES ('global_sensitivity_offset', '1.0');
