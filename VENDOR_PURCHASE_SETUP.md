# Vendor Key Purchase System - Setup Guide

## Overview
This document outlines the complete vendor key purchase system implementation. The system allows end users to purchase vendor access directly via a premium page with Paystack payment integration.

## What's Been Implemented

### 1. Database Schema (SQL Added)
- **vendor_packages** table: Stores 4 bundles (1-day, 3-day, 7-day, 30-day at ₦500, ₦1500, ₦3000, ₦9000)
- **vendor_purchases** table: Tracks all purchases, payment status, vendor activation, and expiration

Location: `FINAL_PRODUCTION_DB_SETUP.sql` (lines 117-167)

### 2. Frontend Pages
- **premium.html**: Full vendor package selection and purchase flow
  - Animated package cards (reveal animations)
  - Checkout form with buyer name
  - Paystack payment integration
  - Success screen with vendor card download
  - Location: `/public/premium.html`

### 3. API Endpoints (in routes/vaultRoutes.js)
- `GET /api/vault/public/packages`: Fetch available packages
- `POST /api/vault/purchase/create`: Create purchase record
- `POST /api/vault/purchase/verify`: Verify Paystack payment & activate vendor
- `GET /api/vault/purchase/card/:purchaseId`: Generate & download vendor card

### 4. Updated Homepage
- Replaced WhatsApp link with "Get Premium Access Now" button
- Links to `/premium.html`
- Location: `/public/index.html` (line ~634)

## What You Need to Do

### Step 1: Run Database Migration
Execute this SQL on your TiDB database to add the vendor purchase tables:

```sql
-- Run the SQL from FINAL_PRODUCTION_DB_SETUP.sql lines 117-167
-- Or copy the vendor_packages and vendor_purchases table creation scripts
```

**Quick SQL:**
```sql
CREATE TABLE IF NOT EXISTS vendor_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_type VARCHAR(50) UNIQUE NOT NULL,
    duration_days INT NOT NULL,
    price_naira INT NOT NULL,
    description VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Seed the vendor packages
INSERT IGNORE INTO vendor_packages (package_type, duration_days, price_naira, description) VALUES
('1day', 1, 500, '1-Day Vendor Access Pack'),
('3days', 3, 1500, '3-Day Vendor Access Pack'),
('7days', 7, 3000, '7-Day Vendor Access Pack'),
('30days', 30, 9000, '30-Day Vendor Access Pack');
```

### Step 2: Verify Environment Variables
The following environment variables should be set in your Vercel project:

- ✅ `PAYSTACK_PUBLIC_KEY`: pk_live_2734df5e5115659a8cc452acdcbd0aba42fd545c (already added)
- ✅ `PAYSTACK_SECRET_KEY`: Your secret key (already added)

### Step 3: Test the Flow
1. Navigate to `http://yoursite.com/premium.html`
2. Select a package
3. Enter your name
4. Click "Pay Now"
5. Complete Paystack payment
6. Receive vendor ID and download card

## Purchase Flow (User Perspective)

```
User visits /premium.html
    ↓
Selects package (1day/3day/7days/30days)
    ↓
Enters full name
    ↓
Clicks "Pay Now"
    ↓
Paystack payment modal opens
    ↓
User completes payment
    ↓
System verifies payment with Paystack
    ↓
Vendor account created automatically
    ↓
Vendor card displayed with download option
    ↓
Vendor can use their vendor_id and download card
```

## Purchase Flow (Backend/Database Perspective)

```
1. Create Purchase Record
   - Generated purchase_id: PUR-{random}
   - Generated vendor_id: VND-{NAME}-{TIMESTAMP}
   - Status: "pending"
   
2. Payment Verification
   - Paystack API verifies payment reference
   - Status changed to "success"
   
3. Vendor Activation
   - Create vendor in "vendors" table
   - Set expiration date (package duration from today)
   - Generate access_key and lookup_key
   - Status: "active"
   
4. Auto-Expiry
   - Vendors are checked for expiration on status endpoints
   - After expiry date, vendor becomes inactive automatically
```

## Vendor Card Features

The vendor card (HTML format) includes:
- Vendor Name (from buyer input)
- Vendor ID (unique identifier)
- Package Duration
- Expiration Date
- QR Code (links to `/verify?vendor={vendor_id}`)
- Print-friendly styling

Users can:
- Download as HTML file
- Print directly from browser
- Take screenshot

## Files Modified

1. **FINAL_PRODUCTION_DB_SETUP.sql** - Added vendor_packages and vendor_purchases tables
2. **routes/vaultRoutes.js** - Added 4 new API endpoints for purchases
3. **public/premium.html** - New premium purchase page with full UI
4. **public/index.html** - Updated WhatsApp link to premium page link

## Testing Checklist

- [ ] Database tables created and seeded
- [ ] Premium page loads (`/premium.html`)
- [ ] Packages API returns 4 bundles (`/api/vault/public/packages`)
- [ ] Can create purchase record (`POST /api/vault/purchase/create`)
- [ ] Can verify payment with Paystack (`POST /api/vault/purchase/verify`)
- [ ] Vendor created in database after payment
- [ ] Vendor card downloads (`GET /api/vault/purchase/card/{id}`)
- [ ] QR code displays correctly on card
- [ ] Expiration date calculated correctly
- [ ] Link in index.html redirects to premium page

## Troubleshooting

### Packages API returns error
- Check database connection
- Verify vendor_packages table exists and is seeded
- Check server logs for database errors

### Payment verification fails
- Verify Paystack keys are correct
- Check Paystack API response in console logs
- Ensure PAYSTACK_SECRET_KEY environment variable is set

### Vendor not created after payment
- Check vendor_purchases table for the purchase record
- Verify payment_status is "success"
- Check server logs for vendor creation errors
- Ensure vendors table schema is compatible

### Vendor ID not unique
- Check for duplicate vendor_id in database
- Generator uses timestamp microseconds - unlikely to duplicate

## Next Steps

1. Execute SQL migration on your TiDB database
2. Test with one purchase on sandbox/testing
3. Monitor vendor_purchases table for records
4. Track vendor table for new vendor entries
5. Test QR code verification page (optional)

---

**Questions?** Check the console logs for detailed error messages. The API returns structured errors with codes like `XP_INVALID_PACKAGE`, `XP_PAYSTACK_ERROR`, etc.
