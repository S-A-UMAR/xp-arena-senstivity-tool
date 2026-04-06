# AXP - Public API Documentation (V1)

The axptool API allows enterprise partners to integrate our proprietary Neural Sensitivity Engine into their own platforms.

## Authentication
All requests must include your `access_key` as the `api_key` in the request body.

## Base URL
`/api/vault/public`

## Endpoints

### 1. Calculate Sensitivity
`POST /calculate`

**Request Body:**
```json
{
  "api_key": "XP-VNDR-YOURKEY",
  "state": {
    "brand": "Apple",
    "series": "iPhone 15 Series",
    "model": "iPhone 15 Pro Max",
    "ram": 8,
    "speed": "fast",
    "claw": "4",
    "handSize": 18.2,
    "grip": "claw"
  }
}
```

**Response:**
```json
{
  "success": true,
  "provider": "YOUR_ID",
  "timestamp": "2026-03-16T..."
}
```
