-- ============================================================
-- Version Control Service — Schema DDL
-- Schema: version_schema
-- ============================================================

CREATE SCHEMA IF NOT EXISTS version_schema;

-- ── File blobs (content-addressed deduplication) ─────────────
CREATE TABLE IF NOT EXISTS version_schema.file_blobs (
    id              BIGSERIAL       PRIMARY KEY,
    content_hash    VARCHAR(64)     NOT NULL UNIQUE,
    content         BYTEA,
    file_path       VARCHAR(1000),
    storage_type    VARCHAR(20)     NOT NULL DEFAULT 'DATABASE',
    file_size_bytes BIGINT,
    reference_count INTEGER         NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blobs_hash ON version_schema.file_blobs (content_hash);

-- ── Submission versions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS version_schema.submission_versions (
    id                  BIGSERIAL       PRIMARY KEY,
    submission_id       BIGINT          NOT NULL,
    version_number      INTEGER         NOT NULL,
    parent_version_id   BIGINT          REFERENCES version_schema.submission_versions(id),
    commit_hash         VARCHAR(64),
    commit_message      VARCHAR(500),
    trigger_type        VARCHAR(30),
    created_by          VARCHAR(100),
    total_size_bytes    BIGINT          DEFAULT 0,
    is_snapshot         BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata            TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (submission_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_submission_id ON version_schema.submission_versions (submission_id);
CREATE INDEX IF NOT EXISTS idx_versions_created_at    ON version_schema.submission_versions (created_at);

-- ── Version files (one row per file in a version) ────────────
CREATE TABLE IF NOT EXISTS version_schema.version_files (
    id              BIGSERIAL       PRIMARY KEY,
    version_id      BIGINT          NOT NULL REFERENCES version_schema.submission_versions(id) ON DELETE CASCADE,
    blob_id         BIGINT          REFERENCES version_schema.file_blobs(id),
    file_path       VARCHAR(1000)   NOT NULL,
    file_name       VARCHAR(500)    NOT NULL,
    file_size_bytes BIGINT,
    content_type    VARCHAR(200),
    file_extension  VARCHAR(20),
    change_type     VARCHAR(20),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ver_files_version_id ON version_schema.version_files (version_id);
