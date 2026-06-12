-- ============================================================================
-- VENDOR PURCHASE SYSTEM - MIGRATION SQL
-- Run this on your TiDB database to add vendor purchase functionality
-- ============================================================================

-- Create Vendor Packages Table
CREATE TABLE IF NOT EXISTS vendor_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_type VARCHAR(50) UNIQUE NOT NULL,
    duration_days INT NOT NULL,
    price_naira INT NOT NULL,
    description VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Vendor Purchases Table
CREATE TABLE IF NOT EXISTS vendor_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id VARCHAR(100) UNIQUE NOT NULL,
    vendor_id VARCHAR(50) UNIQUE NOT NULL,
    buyer_name VARCHAR(100) NOT NULL,
    package_type VARCHAR(50) NOT NULL,
    price_naira INT NOT NULL,
    paystack_reference VARCHAR(200),
    payment_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    activated BOOLEAN DEFAULT FALSE,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (package_type) REFERENCES vendor_packages(package_type) ON DELETE RESTRICT,
    INDEX (vendor_id),
    INDEX (purchase_id),
    INDEX (paystack_reference),
    INDEX (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Vendor Package Bundles
INSERT IGNORE INTO vendor_packages (package_type, duration_days, price_naira, description) VALUES
('1day', 1, 500, '1-Day Vendor Access Pack'),
('3days', 3, 1500, '3-Day Vendor Access Pack'),
('7days', 7, 3000, '7-Day Vendor Access Pack'),
('30days', 30, 9000, '30-Day Vendor Access Pack');

-- Verify the data was inserted
SELECT * FROM vendor_packages;
