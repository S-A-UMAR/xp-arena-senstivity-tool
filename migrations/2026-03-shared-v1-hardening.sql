CREATE TABLE IF NOT EXISTS share_tokens (
    share_id VARCHAR(32) PRIMARY KEY,
    lookup_key VARCHAR(16) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME DEFAULT NULL,
    access_count INT DEFAULT 0,
    last_accessed_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_share_lookup_key (lookup_key),
    INDEX idx_share_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

ALTER TABLE code_activity ADD COLUMN IF NOT EXISTS feedback_tag VARCHAR(64) NULL;
ALTER TABLE code_activity ADD COLUMN IF NOT EXISTS feedback_source VARCHAR(32) NULL;
ALTER TABLE code_activity ADD COLUMN IF NOT EXISTS feedback_fingerprint VARCHAR(64) NULL;
ALTER TABLE code_activity ADD INDEX IF NOT EXISTS idx_feedback_fingerprint (feedback_fingerprint);
