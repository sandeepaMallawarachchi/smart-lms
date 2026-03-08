-- ============================================================
-- Integrity Monitoring Service — Schema DDL
-- Schema: integrity_schema
-- ============================================================

CREATE SCHEMA IF NOT EXISTS integrity_schema;

-- ── Full plagiarism checks ────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrity_schema.plagiarism_checks (
    id                  BIGSERIAL       PRIMARY KEY,
    submission_id       VARCHAR(100)    NOT NULL,
    version_id          VARCHAR(100),
    check_type          VARCHAR(30)     NOT NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    overall_score       DOUBLE PRECISION,
    sources_checked     INTEGER         DEFAULT 0,
    matches_found       INTEGER         DEFAULT 0,
    details             TEXT,
    review_status       VARCHAR(30),
    reviewed_by         VARCHAR(100),
    reviewed_at         TIMESTAMP,
    review_notes        TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plag_submission_id ON integrity_schema.plagiarism_checks (submission_id);
CREATE INDEX IF NOT EXISTS idx_plag_status        ON integrity_schema.plagiarism_checks (status);

-- ── Individual matches ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrity_schema.similarity_matches (
    id              BIGSERIAL       PRIMARY KEY,
    check_id        BIGINT          NOT NULL REFERENCES integrity_schema.plagiarism_checks(id) ON DELETE CASCADE,
    source          VARCHAR(1000),
    percentage      DOUBLE PRECISION,
    match_type      VARCHAR(100),
    url             VARCHAR(2000),
    description     TEXT
);

-- ── Realtime checks (live, not persisted long-term) ──────────
CREATE TABLE IF NOT EXISTS integrity_schema.realtime_checks (
    id                  BIGSERIAL       PRIMARY KEY,
    submission_id       VARCHAR(100)    NOT NULL,
    question_id         VARCHAR(200)    NOT NULL,
    student_id          VARCHAR(100),
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    similarity_score    DOUBLE PRECISION,
    severity            VARCHAR(10),
    flagged             BOOLEAN         DEFAULT FALSE,
    matched_text        TEXT,
    checked_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_checks_submission ON integrity_schema.realtime_checks (submission_id);
CREATE INDEX IF NOT EXISTS idx_rt_checks_question   ON integrity_schema.realtime_checks (question_id);
