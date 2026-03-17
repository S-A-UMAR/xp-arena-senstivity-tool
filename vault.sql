-- Database Initialization
CREATE DATABASE IF NOT EXISTS xp_sensitivity_tool;
USE xp_sensitivity_tool;

-- Migration: Gatekeeper Transformation Tables
-- Vendors Table: Manages multi-tenant configurations
CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'GUEST-CREATOR'
    access_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'XP-VNDR-KHAN'
    brand_config JSON NOT NULL, -- { "logo": "...", "colors": { "primary": "..." }, "socials": { "yt": "...", "ig": "...", "dc": "..." } }
    status ENUM('active', 'suspended') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sensitivity Keys Table: Stores user-specific results linked to codes
CREATE TABLE IF NOT EXISTS sensitivity_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_code VARCHAR(10) UNIQUE NOT NULL, -- 6-digit or custom slug
    vendor_id VARCHAR(50),
    results_json JSON NOT NULL, -- Calculated sensitivity data
    custom_results_json JSON DEFAULT NULL, -- Manual overrides by vendor
    usage_limit INT DEFAULT NULL, -- NULL = Unlimited
    current_usage INT DEFAULT 0,
    status ENUM('active', 'expired') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL
);

-- Code Activity Table: Tracks who used what code
CREATE TABLE IF NOT EXISTS code_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_code VARCHAR(10) NOT NULL,
    user_ign VARCHAR(100),
    user_region VARCHAR(50),
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (entry_code)
);

-- Seed Data (Primary Master Admin)
INSERT IGNORE INTO vendors (vendor_id, access_key, brand_config, status) VALUES 
('XP-ADMIN', 'XP-2008', '{"logo": "", "colors": {"primary": "#00f2fe"}, "socials": {}}', 'active');
