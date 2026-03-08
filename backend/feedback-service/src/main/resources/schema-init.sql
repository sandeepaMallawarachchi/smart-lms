-- ============================================================
-- Feedback Service — Schema DDL
-- Schema: feedback_schema
-- ============================================================

CREATE SCHEMA IF NOT EXISTS feedback_schema;

-- ── Rubrics ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback_schema.rubrics (
    id              BIGSERIAL       PRIMARY KEY,
    assignment_id   VARCHAR(200)    NOT NULL,
    name            VARCHAR(200)    NOT NULL,
    description     VARCHAR(1000),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ── Rubric criteria ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback_schema.rubric_criteria (
    id              BIGSERIAL       PRIMARY KEY,
    rubric_id       BIGINT          NOT NULL REFERENCES feedback_schema.rubrics(id) ON DELETE CASCADE,
    name            VARCHAR(200)    NOT NULL,
    description     VARCHAR(1000),
    max_score       DOUBLE PRECISION NOT NULL DEFAULT 10,
    weight          DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    display_order   INTEGER         NOT NULL DEFAULT 0
);

-- ── AI feedback records ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback_schema.feedbacks (
    id                  BIGSERIAL       PRIMARY KEY,
    submission_id       VARCHAR(100)    NOT NULL,
    version_id          VARCHAR(100),
    rubric_id           BIGINT          REFERENCES feedback_schema.rubrics(id),
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    overall_assessment  TEXT,
    strengths           TEXT,
    improvements        TEXT,
    recommendations     TEXT,
    scores              TEXT,
    raw_feedback        TEXT,
    processing_error    TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_submission_id ON feedback_schema.feedbacks (submission_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status        ON feedback_schema.feedbacks (status);

-- ── Criterion feedback (per-question breakdown) ───────────────
CREATE TABLE IF NOT EXISTS feedback_schema.criterion_feedbacks (
    id              BIGSERIAL       PRIMARY KEY,
    feedback_id     BIGINT          NOT NULL REFERENCES feedback_schema.feedbacks(id) ON DELETE CASCADE,
    criterion_id    BIGINT          REFERENCES feedback_schema.rubric_criteria(id),
    score           DOUBLE PRECISION,
    feedback_text   TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
