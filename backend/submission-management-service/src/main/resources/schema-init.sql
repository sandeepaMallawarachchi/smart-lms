-- ============================================================
-- Submission Management Service — Schema Init
-- ============================================================
-- This file is intentionally minimal.
-- It ONLY creates the PostgreSQL schema so Hibernate can
-- create/alter tables inside it via ddl-auto=update.
--
-- Do NOT add CREATE TABLE or CREATE INDEX statements here —
-- Hibernate owns the table DDL to avoid column-name conflicts
-- when the schema evolves across restarts.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS submission_schema;
