-- XP Arena Sensitivity Tool - Seed Data
-- Games, Devices, and Sample Vault Codes

-- ============================================
-- SEED GAMES
-- ============================================
insert into public.games (name, slug, description, sensitivity_fields, sort_order) values
(
  'Free Fire',
  'free-fire',
  'Garena Free Fire - Battle Royale',
  '[
    {"key": "general", "label": "General Sensitivity", "min": 1, "max": 100, "default": 50},
    {"key": "redDot", "label": "Red Dot", "min": 1, "max": 100, "default": 50},
    {"key": "scope2x", "label": "2x Scope", "min": 1, "max": 100, "default": 45},
    {"key": "scope4x", "label": "4x Scope", "min": 1, "max": 100, "default": 40},
    {"key": "sniperScope", "label": "Sniper Scope", "min": 1, "max": 100, "default": 35},
    {"key": "freeLook", "label": "Free Look", "min": 1, "max": 100, "default": 55}
  ]'::jsonb,
  1
),
(
  'PUBG Mobile',
  'pubg-mobile',
  'PlayerUnknown''s Battlegrounds Mobile',
  '[
    {"key": "camera", "label": "Camera Sensitivity", "min": 1, "max": 400, "default": 100},
    {"key": "ads", "label": "ADS Sensitivity", "min": 1, "max": 400, "default": 100},
    {"key": "gyro", "label": "Gyroscope", "min": 1, "max": 400, "default": 100},
    {"key": "redDot", "label": "Red Dot/Holo", "min": 1, "max": 400, "default": 80},
    {"key": "scope2x", "label": "2x Scope", "min": 1, "max": 400, "default": 70},
    {"key": "scope3x", "label": "3x Scope", "min": 1, "max": 400, "default": 60},
    {"key": "scope4x", "label": "4x Scope", "min": 1, "max": 400, "default": 50},
    {"key": "scope6x", "label": "6x Scope", "min": 1, "max": 400, "default": 40},
    {"key": "scope8x", "label": "8x Scope", "min": 1, "max": 400, "default": 30}
  ]'::jsonb,
  2
),
(
  'COD Mobile',
  'cod-mobile',
  'Call of Duty Mobile',
  '[
    {"key": "standard", "label": "Standard Sensitivity", "min": 1, "max": 300, "default": 100},
    {"key": "ads", "label": "ADS Sensitivity", "min": 1, "max": 300, "default": 80},
    {"key": "tactical", "label": "Tactical Scope", "min": 1, "max": 300, "default": 70},
    {"key": "sniper", "label": "Sniper Scope", "min": 1, "max": 300, "default": 50},
    {"key": "gyro", "label": "Gyroscope", "min": 1, "max": 300, "default": 100}
  ]'::jsonb,
  3
),
(
  'Apex Legends Mobile',
  'apex-mobile',
  'Apex Legends Mobile',
  '[
    {"key": "look", "label": "Look Sensitivity", "min": 1, "max": 10, "default": 5},
    {"key": "ads", "label": "ADS Sensitivity", "min": 1, "max": 10, "default": 4},
    {"key": "perOptic", "label": "Per Optic ADS", "min": 1, "max": 10, "default": 4},
    {"key": "gyro", "label": "Gyroscope", "min": 1, "max": 10, "default": 3}
  ]'::jsonb,
  4
),
(
  'Farlight 84',
  'farlight-84',
  'Farlight 84 - Futuristic Battle Royale',
  '[
    {"key": "camera", "label": "Camera Sensitivity", "min": 1, "max": 200, "default": 100},
    {"key": "aim", "label": "Aim Sensitivity", "min": 1, "max": 200, "default": 80},
    {"key": "scope", "label": "Scope Sensitivity", "min": 1, "max": 200, "default": 60},
    {"key": "gyro", "label": "Gyroscope", "min": 1, "max": 200, "default": 80}
  ]'::jsonb,
  5
)
on conflict (slug) do nothing;

-- ============================================
-- SEED DEVICES
-- ============================================
insert into public.devices (brand, model, display_name, screen_size, refresh_rate, touch_sampling_rate, processor, ram_options, is_tablet, popularity_score) values
-- iPhones
('Apple', 'iphone-15-pro-max', 'iPhone 15 Pro Max', 6.7, 120, 240, 'A17 Pro', '[6, 8]'::jsonb, false, 100),
('Apple', 'iphone-15-pro', 'iPhone 15 Pro', 6.1, 120, 240, 'A17 Pro', '[6, 8]'::jsonb, false, 95),
('Apple', 'iphone-15', 'iPhone 15', 6.1, 60, 120, 'A16 Bionic', '[6]'::jsonb, false, 85),
('Apple', 'iphone-14-pro-max', 'iPhone 14 Pro Max', 6.7, 120, 240, 'A16 Bionic', '[6]'::jsonb, false, 90),
('Apple', 'iphone-13', 'iPhone 13', 6.1, 60, 120, 'A15 Bionic', '[4]'::jsonb, false, 75),
('Apple', 'iphone-12', 'iPhone 12', 6.1, 60, 120, 'A14 Bionic', '[4]'::jsonb, false, 70),
('Apple', 'iphone-11', 'iPhone 11', 6.1, 60, 120, 'A13 Bionic', '[4]'::jsonb, false, 65),

-- iPads
('Apple', 'ipad-pro-12.9', 'iPad Pro 12.9"', 12.9, 120, 240, 'M2', '[8, 16]'::jsonb, true, 98),
('Apple', 'ipad-pro-11', 'iPad Pro 11"', 11.0, 120, 240, 'M2', '[8, 16]'::jsonb, true, 96),
('Apple', 'ipad-air', 'iPad Air', 10.9, 60, 120, 'M1', '[8]'::jsonb, true, 85),
('Apple', 'ipad-mini', 'iPad Mini', 8.3, 60, 120, 'A15 Bionic', '[4]'::jsonb, true, 80),

-- Samsung
('Samsung', 'galaxy-s24-ultra', 'Galaxy S24 Ultra', 6.8, 120, 240, 'Snapdragon 8 Gen 3', '[12]'::jsonb, false, 95),
('Samsung', 'galaxy-s24-plus', 'Galaxy S24+', 6.7, 120, 240, 'Snapdragon 8 Gen 3', '[12]'::jsonb, false, 90),
('Samsung', 'galaxy-s24', 'Galaxy S24', 6.2, 120, 240, 'Snapdragon 8 Gen 3', '[8]'::jsonb, false, 85),
('Samsung', 'galaxy-s23-ultra', 'Galaxy S23 Ultra', 6.8, 120, 240, 'Snapdragon 8 Gen 2', '[8, 12]'::jsonb, false, 88),
('Samsung', 'galaxy-a54', 'Galaxy A54', 6.4, 120, 120, 'Exynos 1380', '[6, 8]'::jsonb, false, 70),
('Samsung', 'galaxy-a34', 'Galaxy A34', 6.6, 120, 120, 'Dimensity 1080', '[6, 8]'::jsonb, false, 65),
('Samsung', 'galaxy-tab-s9', 'Galaxy Tab S9 Ultra', 14.6, 120, 240, 'Snapdragon 8 Gen 2', '[12, 16]'::jsonb, true, 92),

-- OnePlus
('OnePlus', 'oneplus-12', 'OnePlus 12', 6.8, 120, 240, 'Snapdragon 8 Gen 3', '[12, 16]'::jsonb, false, 88),
('OnePlus', 'oneplus-11', 'OnePlus 11', 6.7, 120, 240, 'Snapdragon 8 Gen 2', '[8, 16]'::jsonb, false, 82),
('OnePlus', 'oneplus-nord-3', 'OnePlus Nord 3', 6.74, 120, 240, 'Dimensity 9000', '[8, 16]'::jsonb, false, 75),

-- Xiaomi / Redmi / POCO
('Xiaomi', 'xiaomi-14-ultra', 'Xiaomi 14 Ultra', 6.73, 120, 240, 'Snapdragon 8 Gen 3', '[12, 16]'::jsonb, false, 90),
('Xiaomi', 'xiaomi-13', 'Xiaomi 13', 6.36, 120, 240, 'Snapdragon 8 Gen 2', '[8, 12]'::jsonb, false, 82),
('Redmi', 'redmi-note-13-pro', 'Redmi Note 13 Pro+', 6.67, 120, 240, 'Dimensity 7200', '[8, 12]'::jsonb, false, 78),
('Redmi', 'redmi-note-12', 'Redmi Note 12', 6.67, 120, 120, 'Snapdragon 685', '[4, 6, 8]'::jsonb, false, 70),
('POCO', 'poco-x6-pro', 'POCO X6 Pro', 6.67, 120, 480, 'Dimensity 8300', '[8, 12]'::jsonb, false, 80),
('POCO', 'poco-f5', 'POCO F5', 6.67, 120, 240, 'Snapdragon 7+ Gen 2', '[8, 12]'::jsonb, false, 78),

-- Realme
('Realme', 'realme-gt5-pro', 'Realme GT5 Pro', 6.78, 144, 240, 'Snapdragon 8 Gen 3', '[12, 16]'::jsonb, false, 85),
('Realme', 'realme-12-pro', 'Realme 12 Pro+', 6.7, 120, 240, 'Snapdragon 7s Gen 2', '[8, 12]'::jsonb, false, 75),
('Realme', 'realme-narzo-60', 'Realme Narzo 60', 6.43, 90, 180, 'Dimensity 6020', '[6, 8]'::jsonb, false, 65),

-- iQOO
('iQOO', 'iqoo-12', 'iQOO 12', 6.78, 144, 240, 'Snapdragon 8 Gen 3', '[12, 16]'::jsonb, false, 88),
('iQOO', 'iqoo-neo-9-pro', 'iQOO Neo 9 Pro', 6.78, 144, 240, 'Snapdragon 8 Gen 2', '[8, 12]'::jsonb, false, 82),

-- ASUS ROG
('ASUS', 'rog-phone-8-pro', 'ROG Phone 8 Pro', 6.78, 165, 720, 'Snapdragon 8 Gen 3', '[16, 24]'::jsonb, false, 98),
('ASUS', 'rog-phone-7', 'ROG Phone 7 Ultimate', 6.78, 165, 720, 'Snapdragon 8 Gen 2', '[16]'::jsonb, false, 95),

-- Infinix / Tecno
('Infinix', 'infinix-gt-20-pro', 'Infinix GT 20 Pro', 6.78, 144, 240, 'Dimensity 8200', '[8, 12]'::jsonb, false, 72),
('Tecno', 'tecno-pova-6-pro', 'Tecno Pova 6 Pro', 6.78, 120, 240, 'Dimensity 6080', '[8, 12]'::jsonb, false, 68),

-- Budget Options
('Samsung', 'galaxy-a14', 'Galaxy A14', 6.6, 90, 90, 'Exynos 1330', '[4, 6]'::jsonb, false, 55),
('Redmi', 'redmi-12', 'Redmi 12', 6.79, 90, 90, 'Helio G88', '[4, 8]'::jsonb, false, 50),
('Realme', 'realme-c55', 'Realme C55', 6.72, 90, 90, 'Helio G88', '[4, 6, 8]'::jsonb, false, 48)
on conflict (brand, model) do nothing;

-- ============================================
-- SEED DEFAULT VAULT CODES
-- ============================================
insert into public.vault_codes (code, code_type, max_uses, metadata) values
('XPARENA2024', 'user', null, '{"welcome": true}'::jsonb),
('FREECALIB', 'user', null, '{"promo": "launch"}'::jsonb),
('PROPLAYER', 'user', 1000, '{"tier": "premium"}'::jsonb)
on conflict (code) do nothing;

-- ============================================
-- SEED TUTORIALS
-- ============================================
insert into public.tutorials (game_id, title, description, video_url, thumbnail_url, duration_seconds, difficulty, category, is_featured, sort_order)
select 
  g.id,
  'Sensitivity Basics for ' || g.name,
  'Learn the fundamentals of sensitivity settings and how they affect your gameplay in ' || g.name,
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  null,
  600,
  'beginner',
  'sensitivity',
  true,
  1
from public.games g
on conflict do nothing;

insert into public.tutorials (game_id, title, description, video_url, thumbnail_url, duration_seconds, difficulty, category, sort_order)
select 
  g.id,
  'Advanced Aim Training - ' || g.name,
  'Master your aim with these advanced techniques and drills',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  null,
  900,
  'advanced',
  'aim',
  2
from public.games g
on conflict do nothing;

insert into public.tutorials (game_id, title, description, video_url, thumbnail_url, duration_seconds, difficulty, category, sort_order)
select 
  g.id,
  'Movement & Positioning Guide',
  'Improve your movement mechanics and game sense',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  null,
  750,
  'intermediate',
  'movement',
  3
from public.games g
on conflict do nothing;
