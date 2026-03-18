-- ############################################################################
-- # XP ARENA SENSITIVITY TOOL PRO - FINAL PRODUCTION DB SETUP (MYSQL/TIDB)
-- ############################################################################

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Organizations Table (Multi-tenant Root)
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50) UNIQUE NOT NULL,
    org_name VARCHAR(100) NOT NULL,
    admin_email VARCHAR(255) DEFAULT 'admin@xp-arena.pro',
    status ENUM('active', 'trial', 'suspended') DEFAULT 'active',
    plan_tier ENUM('basic', 'pro', 'enterprise') DEFAULT 'pro',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Vendors Table (Creators/Service Providers)
CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    org_id VARCHAR(50) DEFAULT 'XP-CORE-ORG',
    vendor_id VARCHAR(50) UNIQUE NOT NULL,
    access_key VARCHAR(100) UNIQUE NOT NULL, -- bcrypt hash
    lookup_key VARCHAR(20) UNIQUE DEFAULT NULL,
    active_until DATETIME DEFAULT NULL,
    brand_config JSON NOT NULL, 
    status ENUM('active', 'suspended') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Sensitivity Keys Table (Generated Access Codes)
CREATE TABLE IF NOT EXISTS sensitivity_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_code VARCHAR(100) UNIQUE NOT NULL, -- bcrypt hash
    lookup_key VARCHAR(16) UNIQUE NOT NULL,
    vendor_id VARCHAR(50),
    results_json JSON NOT NULL,
    custom_results_json JSON DEFAULT NULL,
    usage_limit INT DEFAULT NULL,
    current_usage INT DEFAULT 0,
    status ENUM('active', 'expired') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User Events Table (Conversion Tracking & Analytics)
CREATE TABLE IF NOT EXISTS user_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    org_id VARCHAR(50),
    vendor_id VARCHAR(50),
    user_session_id VARCHAR(100),
    device_tier VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (org_id),
    INDEX (vendor_id),
    INDEX (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Audit Logs Table (Admin Security Tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_type VARCHAR(50),
    actor_id VARCHAR(100),
    action VARCHAR(100),
    details JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Code Activity Table (Verification Tracking with Feedback)
CREATE TABLE IF NOT EXISTS code_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_code VARCHAR(20) NOT NULL, 
    lookup_key VARCHAR(16) NOT NULL,
    user_ign VARCHAR(100),
    user_region VARCHAR(50),
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    feedback_rating INT DEFAULT NULL,
    feedback_comment TEXT DEFAULT NULL,
    INDEX (entry_code),
    INDEX (lookup_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Security Logs Table (Fraud Detection)
CREATE TABLE IF NOT EXISTS security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45),
    event_type VARCHAR(50),
    details JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. System Settings Table (Global Config)
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ############################################################################
-- # SEED INITIAL SYSTEM DATA
-- ############################################################################

INSERT IGNORE INTO organizations (org_id, org_name, plan_tier) VALUES ('XP-CORE-ORG', 'XP ARENA GLOBAL', 'enterprise');

-- NOTE: Hashed Access Key for 'XP-2008' is $2b$10$8bg2W.b7yxuHVFNyj98qzuGpPSjXwFp.YVX9MahbBVqj1t5S/VtNi
-- For manual SQL, we provide the correct hash for XP-2008:
INSERT IGNORE INTO vendors (org_id, vendor_id, access_key, lookup_key, brand_config, status) VALUES 
('XP-CORE-ORG', 'XP-ADMIN', '$2b$10$8bg2W.b7yxuHVFNyj98qzuGpPSjXwFp.YVX9MahbBVqj1t5S/VtNi', '17a6f27ba4', '{"logo": "", "colors": {"primary": "#00f0ff"}, "socials": {}}', 'active');

INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES ('global_sensitivity_offset', '1.0');

SET FOREIGN_KEY_CHECKS = 1;
