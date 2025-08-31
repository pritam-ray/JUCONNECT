-- Template for PostgreSQL Database Changes
-- File: database/change_template.sql
-- Date: YYYY-MM-DD
-- Description: [Describe what this change does]

-- Example usage:
-- .\database\apply_changes.ps1 -SqlFile "database\your_change_file.sql"

-- Begin transaction for safety
BEGIN;

-- Your SQL changes go here
-- Example:
-- ALTER TABLE your_table ADD COLUMN new_column TEXT;
-- UPDATE your_table SET new_column = 'default_value';
-- CREATE INDEX idx_new_column ON your_table(new_column);

-- Add your SQL statements here

-- Commit the transaction
COMMIT;

-- If you need to rollback during development, use:
-- ROLLBACK;
