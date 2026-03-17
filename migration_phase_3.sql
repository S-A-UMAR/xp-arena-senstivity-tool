-- Phase 3 Migration: Enterprise SaaS Infrastructure
USE xp_sensitivity_tool;

-- 1. Organizations Table: Parent entities for multi-level tenancy
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'XP-AGENCY-DELTA'
    org_name VARCHAR(100) NOT NULL,
    admin_email VARCHAR(255) UNIQUE NOT NULL,
    status ENUM('active', 'trial', 'suspended') DEFAULT 'trial',
    plan_tier ENUM('basic', 'pro', 'enterprise') DEFAULT 'basic',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Link Vendors (Creators) to Organizations
ALTER TABLE vendors ADD COLUMN org_id VARCHAR(50) AFTER id;
ALTER TABLE vendors ADD CONSTRAINT fk_vendor_org FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE SET NULL;

-- 3. Advanced Conversion Tracking: Funnel Analytics
CREATE TABLE IF NOT EXISTS user_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM('landing_view', 'calculation_start', 'encryption_complete', 'result_view', 'card_download') NOT NULL,
    org_id VARCHAR(50),
    vendor_id VARCHAR(50),
    user_session_id VARCHAR(100), -- Unique per-browser session
    device_tier VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (org_id),
    INDEX (vendor_id),
    INDEX (event_type)
);

-- 4. Admin Audit Logging
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_type ENUM('admin', 'org_admin', 'system') NOT NULL,
    actor_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Seed Initial Organization
INSERT IGNORE INTO organizations (org_id, org_name, admin_email, status, plan_tier)
VALUES ('XP-CORE-ORG', 'XP ARENA GLOBAL', 'admin@xp-arena.pro', 'active', 'enterprise');

-- Update existing vendors to belong to the core org
UPDATE vendors SET org_id = 'XP-CORE-ORG' WHERE org_id IS NULL;
