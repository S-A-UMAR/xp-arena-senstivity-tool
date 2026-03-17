-- Database Initialization
CREATE DATABASE IF NOT EXISTS xp_sensitivity_tool;
USE xp_sensitivity_tool;

-- Organizations Table (Multi-tenant Root)
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50) UNIQUE NOT NULL,
    org_name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vendors Table: Manages multi-tenant configurations
CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50) DEFAULT 'XP-CORE-ORG',
    vendor_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'GUEST-CREATOR'
    access_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'XP-VNDR-KHAN'
    brand_config JSON NOT NULL, -- { "logo": "...", "colors": { "primary": "..." }, "socials": { "yt": "...", "ig": "...", "dc": "..." } }
    status ENUM('active', 'suspended') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE SET NULL
);

-- Sensitivity Keys Table: Stores user-specific results linked to codes
CREATE TABLE IF NOT EXISTS sensitivity_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_code VARCHAR(10) UNIQUE NOT NULL, -- 6-digit or custom slug
    vendor_id VARCHAR(50),
    results_json JSON NOT NULL, -- Calculated sensitivity data
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
    entry_code VARCHAR(10) NOT NULL,
    user_ign VARCHAR(100),
    user_region VARCHAR(50),
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    feedback_rating INT DEFAULT NULL,
    feedback_comment TEXT DEFAULT NULL,
    INDEX (entry_code)
);

-- Seed Data
INSERT IGNORE INTO organizations (org_id, org_name) VALUES ('XP-CORE-ORG', 'XP ARENA GLOBAL');

INSERT IGNORE INTO vendors (org_id, vendor_id, access_key, brand_config, status) VALUES 
('XP-CORE-ORG', 'XP-ADMIN', 'XP-2008', '{"logo": "", "colors": {"primary": "#00f2fe"}, "socials": {}}', 'active');
