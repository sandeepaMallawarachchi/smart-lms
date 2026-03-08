-- ============================================================
-- Integrity Monitoring Service — Schema Init
-- ============================================================
-- This file is intentionally minimal.
-- It ONLY creates the PostgreSQL schema so Hibernate can
-- create/alter tables inside it via ddl-auto=update.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS integrity_schema;
