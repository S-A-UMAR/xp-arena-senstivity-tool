-- 🧹 MASTER NEXUS: SINGLE-PURPOSE CLEANUP SCRIPT
-- RUN THIS IN YOUR TIDB/MYSQL CONSOLE TO PURGE TOURNAMENT & GIVEAWAY DATA
-- WARNING: THIS ACTION IS IRREVERSIBLE. ENSURE YOU HAVE BACKED UP DATA IF NEEDED.

-- Remove Tournament Infrastructure
DROP TABLE IF EXISTS tournament_registrations;
DROP TABLE IF EXISTS tournaments;

-- Remove Giveaway Infrastructure
DROP TABLE IF EXISTS giveaway_entries;
DROP TABLE IF EXISTS giveaways;

-- Clean Audit Logs of Giveaway/Tournament events (Optional but recommended for a pure tool)
DELETE FROM security_logs WHERE details LIKE '%giveaway%' OR details LIKE '%tournament%';

-- Verify Core Tool Tables remain intact
SHOW TABLES LIKE 'account_registry';
SHOW TABLES LIKE 'sensitivity_keys';
SHOW TABLES LIKE 'code_activity';

-- ✅ CLEANUP COMPLETE: PLATFORM IS NOW FOCUSED EXCLUSIVELY ON NEURAL SENSITIVITY TOOLING.
