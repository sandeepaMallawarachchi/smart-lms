-- ============================================================
-- Submission Management Service — Schema DDL
-- Schema: submission_schema
-- ============================================================

CREATE SCHEMA IF NOT EXISTS submission_schema;

-- ── Submissions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submission_schema.submissions (
    id                      BIGSERIAL       PRIMARY KEY,
    title                   VARCHAR(500)    NOT NULL,
    description             VARCHAR(2000),
    student_id              VARCHAR(100)    NOT NULL,
    student_name            VARCHAR(200)    NOT NULL,
    student_email           VARCHAR(200),
    student_registration_id VARCHAR(100),
    assignment_id           VARCHAR(200),
    assignment_title        VARCHAR(500),
    module_code             VARCHAR(50),
    module_name             VARCHAR(200),
    status                  VARCHAR(30)     NOT NULL DEFAULT 'DRAFT',
    submission_type         VARCHAR(50)     NOT NULL,
    due_date                TIMESTAMP,
    submitted_at            TIMESTAMP,
    grade                   DOUBLE PRECISION,
    max_grade               DOUBLE PRECISION,
    feedback_text           VARCHAR(5000),
    is_late                 BOOLEAN         NOT NULL DEFAULT FALSE,
    version_number          INTEGER         NOT NULL DEFAULT 1,
    total_versions          INTEGER         NOT NULL DEFAULT 0,
    ai_score                DOUBLE PRECISION,
    plagiarism_score        DOUBLE PRECISION,
    total_word_count        INTEGER,
    question_marks_json     TEXT,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_student_id     ON submission_schema.submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id  ON submission_schema.submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status         ON submission_schema.submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_stud_assign    ON submission_schema.submissions (student_id, assignment_id);

-- ── Submission files ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submission_schema.submission_files (
    id                  BIGSERIAL       PRIMARY KEY,
    submission_id       BIGINT          NOT NULL REFERENCES submission_schema.submissions(id) ON DELETE CASCADE,
    original_filename   VARCHAR(500)    NOT NULL,
    stored_filename     VARCHAR(500)    NOT NULL,
    file_size           BIGINT,
    content_type        VARCHAR(200),
    file_extension      VARCHAR(20),
    uploaded_at         TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_files_sub_id ON submission_schema.submission_files (submission_id);

-- ── Text answers (upserted on every auto-save) ───────────────
CREATE TABLE IF NOT EXISTS submission_schema.answers (
    id                      BIGSERIAL       PRIMARY KEY,
    submission_id           VARCHAR(100)    NOT NULL,
    student_id              VARCHAR(100),
    question_id             VARCHAR(200)    NOT NULL,
    question_text           VARCHAR(2000),
    answer_text             TEXT,
    word_count              INTEGER,
    character_count         INTEGER,
    last_modified           TIMESTAMP       NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    grammar_score           DOUBLE PRECISION,
    clarity_score           DOUBLE PRECISION,
    completeness_score      DOUBLE PRECISION,
    relevance_score         DOUBLE PRECISION,
    ai_strengths            TEXT,
    ai_improvements         TEXT,
    ai_suggestions          TEXT,
    feedback_saved_at       TIMESTAMP,
    similarity_score        DOUBLE PRECISION,
    plagiarism_severity     VARCHAR(10),
    plagiarism_flagged      BOOLEAN,
    plagiarism_checked_at   TIMESTAMP,
    lecturer_mark           DOUBLE PRECISION,
    lecturer_feedback_text  TEXT,
    UNIQUE (submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_sub_id  ON submission_schema.answers (submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_q_id    ON submission_schema.answers (question_id);
CREATE INDEX IF NOT EXISTS idx_answers_stud_id ON submission_schema.answers (student_id);
