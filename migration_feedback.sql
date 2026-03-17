-- Add feedback columns to code_activity
ALTER TABLE code_activity ADD COLUMN feedback_rating INT DEFAULT NULL;
ALTER TABLE code_activity ADD COLUMN feedback_comment TEXT DEFAULT NULL;
