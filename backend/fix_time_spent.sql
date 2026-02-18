-- Run this in your PostgreSQL database to fix the missing column
ALTER TABLE issues ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;
