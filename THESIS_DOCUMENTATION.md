# Undergraduate Individual Thesis Documentation
## Component: Submission System with Version Control & AI-Enhanced Feedback Support
**Project ID:** 25-26J-468 | **Student:** Koralage K. S. D. | **Index:** IT22586766
**Supervisor:** [Supervisor Name] | **Date:** April 2026

---

# PART I — TECHNICAL REFERENCE (Tasks 1–8)

---

## TASK 1 — PROJECT STRUCTURE

### 1.1 Full Directory Tree

The component spans three backend microservices and a shared Next.js frontend, all residing within the larger Smart LMS monorepo at `c:\RP\smart-lms\`.

```
smart-lms/
│
├── backend/
│   │
│   ├── submission-management-service/          [Port 8081]
│   │   ├── pom.xml
│   │   ├── Dockerfile
│   │   └── src/main/java/com/smartlms/submission_management_service/
│   │       ├── SubmissionManagementServiceApplication.java
│   │       ├── config/
│   │       │   ├── FileStorageProperties.java
│   │       │   └── WebConfig.java
│   │       ├── controller/
│   │       │   ├── SubmissionController.java
│   │       │   ├── AnswerController.java
│   │       │   ├── VersionController.java
│   │       │   └── AnswerSearchController.java
│   │       ├── model/
│   │       │   ├── Submission.java
│   │       │   ├── Answer.java
│   │       │   ├── SubmissionVersion.java
│   │       │   ├── VersionAnswer.java
│   │       │   ├── VersionPlagiarismSource.java
│   │       │   ├── SubmissionFile.java
│   │       │   ├── SubmissionStatus.java        [DRAFT/SUBMITTED/LATE/GRADED]
│   │       │   └── SubmissionType.java          [TEXT_ANSWER/FILE]
│   │       ├── service/
│   │       │   ├── SubmissionService.java
│   │       │   ├── AnswerService.java
│   │       │   ├── VersionService.java
│   │       │   └── FileStorageService.java
│   │       ├── repository/
│   │       │   ├── SubmissionRepository.java
│   │       │   ├── AnswerRepository.java
│   │       │   ├── SubmissionVersionRepository.java
│   │       │   ├── VersionAnswerRepository.java
│   │       │   ├── VersionPlagiarismSourceRepository.java
│   │       │   └── SubmissionFileRepository.java
│   │       ├── dto/
│   │       │   ├── request/   (SubmissionRequest, SaveAnswerRequest,
│   │       │   │              SaveAnswerAnalysisRequest, GradeRequest,
│   │       │   │              SavePlagiarismSourcesRequest)
│   │       │   └── response/  (SubmissionResponse, AnswerResponse,
│   │       │                   VersionResponse, VersionAnswerResponse,
│   │       │                   VersionPlagiarismSourceResponse, ApiResponse)
│   │       ├── exception/
│   │       │   ├── GlobalExceptionHandler.java
│   │       │   ├── ResourceNotFoundException.java
│   │       │   ├── AccessDeniedException.java
│   │       │   └── DeadlineNotPassedException.java
│   │       └── util/
│   │           ├── JwtUtils.java
│   │           └── AnswerScoreUtils.java
│   │
│   ├── feedback-service/                       [Port 8083]
│   │   ├── pom.xml
│   │   ├── Dockerfile
│   │   └── src/main/java/com/smartlms/feedback_service/
│   │       ├── FeedbackServiceApplication.java
│   │       ├── config/
│   │       │   ├── AsyncConfig.java
│   │       │   ├── CorsConfig.java
│   │       │   └── RedisConfig.java
│   │       ├── controller/
│   │       │   ├── FeedbackController.java
│   │       │   ├── RubricController.java
│   │       │   └── HealthController.java
│   │       ├── model/
│   │       │   ├── Feedback.java
│   │       │   ├── CriterionFeedback.java
│   │       │   ├── Rubric.java
│   │       │   ├── RubricCriterion.java
│   │       │   └── FeedbackStatus.java
│   │       ├── service/
│   │       │   ├── FeedbackService.java
│   │       │   ├── LiveFeedbackService.java
│   │       │   ├── HuggingFaceService.java
│   │       │   ├── FeedbackCacheService.java
│   │       │   └── RubricService.java
│   │       └── repository/
│   │           ├── FeedbackRepository.java
│   │           └── RubricRepository.java
│   │
│   └── integrity-monitoring-service/           [Port 8084]
│       ├── pom.xml
│       ├── Dockerfile
│       └── src/main/java/com/example/integrity_monitoring_service/
│           ├── IntegrityMonitoringServiceApplication.java
│           ├── config/
│           │   ├── WebSocketConfig.java
│           │   ├── AsyncConfig.java
│           │   ├── CacheConfig.java
│           │   ├── RestTemplateConfig.java
│           │   ├── SchedulingConfig.java
│           │   └── CorsConfig.java
│           ├── contoller/  [note: original spelling in codebase]
│           │   ├── IntegrityCheckController.java
│           │   ├── RealtimeCheckController.java
│           │   ├── ReportController.java
│           │   └── HealthController.java
│           ├── model/
│           │   ├── PlagiarismCheck.java
│           │   ├── RealtimeCheck.java
│           │   ├── SimilarityMatch.java
│           │   ├── InternetMatch.java
│           │   ├── CheckStatus.java
│           │   ├── CheckType.java
│           │   └── QuestionType.java
│           ├── service/
│           │   ├── IntegrityCheckService.java
│           │   ├── RealtimeCheckService.java
│           │   ├── TextSimilarityService.java
│           │   ├── JPlagService.java
│           │   ├── GoogleSearchService.java
│           │   ├── SubmissionFetchService.java
│           │   ├── QuestionAnalyzerService.java
│           │   ├── AdvancedSimilarityService.java
│           │   ├── CitationDetectorService.java
│           │   ├── PlagiarismReportDataService.java
│           │   └── PdfReportGeneratorService.java
│           └── repository/
│               ├── PlagiarismCheckRepository.java
│               └── RealtimeCheckRepository.java
│
├── frontend/
│   ├── app/submissions/
│   │   ├── student/
│   │   │   ├── answer/[assignmentId]/page.tsx   # Main text-answer editor
│   │   │   ├── submit/[assignmentId]/page.tsx   # File submission
│   │   │   ├── my-submissions/page.tsx
│   │   │   ├── feedback/[id]/page.tsx
│   │   │   ├── versions/[submissionId]/page.tsx
│   │   │   ├── plagiarism/page.tsx
│   │   │   └── analytics/page.tsx
│   │   └── lecturer/
│   │       ├── grading/[submissionId]/page.tsx
│   │       ├── plagiarism/page.tsx
│   │       ├── submissions/[id]/page.tsx
│   │       └── assignments/page.tsx
│   ├── components/submissions/
│   │   ├── LiveFeedbackPanel.tsx
│   │   ├── PlagiarismWarning.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── RichTextEditor.tsx
│   │   ├── VersionTimeline.tsx
│   │   └── DiffViewer.tsx
│   ├── hooks/
│   │   ├── useAnswerEditor.ts
│   │   ├── useSubmissions.ts
│   │   ├── usePlagiarism.ts
│   │   ├── useFeedback.ts
│   │   └── useVersions.ts
│   ├── types/submission.types.ts
│   └── lib/api/submission-services.ts
│
└── docker-compose.yml
```

### 1.2 Microservices and Ports

| Service | Port | Spring Boot Version | Java | Package Base |
|---|---|---|---|---|
| Submission Management | 8081 | 3.4.1 | 21 | `com.smartlms.submission_management_service` |
| Feedback Service | 8083 | 3.2.0 | 21 | `com.smartlms.feedback_service` |
| Integrity Monitoring | 8084 | 4.0.0 | 21 | `com.example.integrity_monitoring_service` |
| Next.js Frontend | 3000 | — | — | — |
| PostgreSQL | 5432 | — | — | Database: `lms_db` |
| Redis | 6379 | — | — | Cache/session store |

### 1.3 Maven Dependencies by Service

#### Submission Management Service (`pom.xml`)

| Dependency | Version | Purpose |
|---|---|---|
| spring-boot-starter-web | 3.4.1 | REST controllers, embedded Tomcat |
| spring-boot-starter-data-jpa | 3.4.1 | ORM, Hibernate, entity management |
| spring-boot-starter-validation | 3.4.1 | Bean Validation (@Valid, @NotNull) |
| postgresql | 42.7.7 | JDBC driver |
| lombok | managed | Boilerplate reduction (@Data, @Builder) |
| commons-io | 2.16.1 | File I/O utilities |
| spring-boot-devtools | managed | Hot reload in development |
| spring-boot-starter-test | managed | JUnit 5, Mockito |

#### Feedback Service (`pom.xml`)

| Dependency | Version | Purpose |
|---|---|---|
| spring-boot-starter-web | 3.2.0 | REST controllers |
| spring-boot-starter-data-jpa | 3.2.0 | ORM, rubric and feedback storage |
| spring-boot-starter-data-redis | 3.2.0 | Redis-backed caching (FeedbackCacheService) |
| spring-boot-starter-validation | 3.2.0 | Request validation |
| postgresql | managed | JDBC driver |
| okhttp | 4.12.0 | HTTP client for HuggingFace API calls |
| jackson-databind | managed | JSON parsing of LLM responses |
| commons-codec | 1.17.0 | Base64 encoding utilities |
| lombok | managed | Boilerplate reduction |
| h2 | test scope | In-memory DB for tests |

#### Integrity Monitoring Service (`pom.xml`)

| Dependency | Version | Purpose |
|---|---|---|
| spring-boot-starter-web | 4.0.0 | REST controllers |
| spring-boot-starter-data-jpa | 4.0.0 | Plagiarism check persistence |
| spring-boot-starter-websocket | 4.0.0 | Real-time WebSocket (STOMP) |
| spring-boot-starter-cache | 4.0.0 | Caching abstraction |
| spring-boot-starter-actuator | 4.0.0 | Health endpoints |
| jplag (core + 14 language modules) | 5.1.0 | Code plagiarism detection |
| commons-math3 | 3.6.1 | `ArrayRealVector` for TF-IDF cosine similarity |
| commons-text | 1.12.0 | Text utilities |
| commons-io | 2.16.0 | I/O utilities |
| caffeine | managed | In-process LRU cache for search results |
| tika-core + tika-parsers | 3.x | Document text extraction (PDF, DOCX) |
| okhttp | 4.12.0 | HTTP client for SerpAPI |
| pdfbox | 3.0.2 | PDF report generation |
| lombok | managed | Boilerplate reduction |
| postgresql | managed | JDBC driver |

### 1.4 Main Application Entry Classes

**`SubmissionManagementServiceApplication.java`**
```java
@SpringBootApplication
@EnableConfigurationProperties(FileStorageProperties.class)
public class SubmissionManagementServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(SubmissionManagementServiceApplication.class, args);
    }
}
```
*File:* `backend/submission-management-service/src/main/java/.../SubmissionManagementServiceApplication.java`

**`FeedbackServiceApplication.java`**
```java
@SpringBootApplication
@EnableCaching
@EnableAsync
public class FeedbackServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FeedbackServiceApplication.class, args);
    }
}
```
*File:* `backend/feedback-service/src/main/java/.../FeedbackServiceApplication.java`

**`IntegrityMonitoringServiceApplication.java`**
```java
@SpringBootApplication
@EnableCaching
@EnableScheduling
public class IntegrityMonitoringServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(IntegrityMonitoringServiceApplication.class, args);
    }
}
```
*File:* `backend/integrity-monitoring-service/src/main/java/.../IntegrityMonitoringServiceApplication.java`

---

## TASK 2 — DATABASE SCHEMA EXTRACTION

### 2.1 JPA @Entity Classes

#### Entity: `Submission`
*File:* `backend/submission-management-service/src/main/java/.../model/Submission.java`

```
@Table(name = "submissions", schema = "submission_schema")
```

| Field | Java Type | Column | Constraints | Description |
|---|---|---|---|---|
| id | Long | id | PK, IDENTITY | Auto-generated identifier |
| title | String | title | NOT NULL | Submission title |
| description | String | description | length=2000 | Optional description |
| studentId | String | student_id | NOT NULL | JWT-extracted student ID |
| studentName | String | student_name | NOT NULL | Display name |
| studentEmail | String | student_email | length=200 | Email address |
| studentRegistrationId | String | student_registration_id | length=100 | University registration number |
| assignmentId | String | assignment_id | | Foreign key to assignment service |
| assignmentTitle | String | assignment_title | | Snapshot of assignment title |
| moduleCode | String | module_code | length=50 | Module code |
| moduleName | String | module_name | length=200 | Module name |
| status | SubmissionStatus | status | NOT NULL, ENUM | DRAFT/SUBMITTED/LATE/GRADED |
| submissionType | SubmissionType | submission_type | NOT NULL, ENUM | TEXT_ANSWER/FILE |
| dueDate | LocalDateTime | due_date | | Assignment deadline |
| submittedAt | LocalDateTime | submitted_at | | Formal submission timestamp |
| grade | Double | grade | | AI-computed grade at submit time |
| maxGrade | Double | max_grade | | Maximum possible grade |
| feedbackText | String | feedback_text | TEXT | Overall feedback from lecturer |
| isLate | Boolean | is_late | default=false | True when submittedAt > dueDate |
| versionNumber | Integer | version_number | default=0 | Incremented on each submit |
| totalVersions | Integer | total_versions | default=0 | Total snapshot count |
| aiScore | Double | ai_score | | Weighted avg AI quality score 0–100 |
| plagiarismScore | Double | plagiarism_score | | Max similarity score across answers |
| totalWordCount | Integer | total_word_count | | Sum of answer word counts |
| questionMarksJson | String | question_marks_json | TEXT | JSON map of per-question marks |
| lecturerGrade | Double | lecturer_grade | | Post-deadline lecturer override |
| lecturerOverriddenAt | LocalDateTime | lecturer_overridden_at | | When lecturer graded |
| lecturerOverriddenBy | String | lecturer_overridden_by | length=100 | Lecturer ID |
| createdAt | LocalDateTime | created_at | NOT NULL, immutable | @CreationTimestamp |
| updatedAt | LocalDateTime | updated_at | NOT NULL | @UpdateTimestamp |

**Key method on entity:**
```java
public void submit() {
    this.versionNumber = (this.versionNumber != null ? this.versionNumber : 0) + 1;
    this.status = SubmissionStatus.SUBMITTED;
    this.submittedAt = LocalDateTime.now();
    if (this.dueDate != null && this.submittedAt.isAfter(this.dueDate)) {
        this.isLate = true;
        this.status = SubmissionStatus.LATE;
    }
}
```

---

#### Entity: `Answer`
*File:* `backend/submission-management-service/src/main/java/.../model/Answer.java`

```
@Table(name = "answers", schema = "submission_schema")
Indexes:
  idx_answers_submission_id_question_id  ON (submission_id, question_id)
  idx_answers_question_id_last_modified  ON (question_id, last_modified)
```

| Field | Java Type | Column | Constraints | Description |
|---|---|---|---|---|
| id | Long | id | PK, IDENTITY | Auto-generated |
| submissionId | Long | submission_id | NOT NULL | FK to submissions.id |
| studentId | String | student_id | | For peer-comparison exclusion |
| questionId | String | question_id | NOT NULL | FK to question service |
| questionText | String | question_text | length=2000 | Snapshot at save time |
| answerText | String | answer_text | TEXT | Full answer content |
| wordCount | Integer | word_count | | Recomputed server-side |
| characterCount | Integer | character_count | | Character count |
| lastModified | LocalDateTime | last_modified | NOT NULL | @UpdateTimestamp |
| createdAt | LocalDateTime | created_at | nullable | @CreationTimestamp (nullable for DDL migration) |
| grammarScore | Double | grammar_score | | AI score 0–10 |
| clarityScore | Double | clarity_score | | AI score 0–10 |
| completenessScore | Double | completeness_score | | AI score 0–10 |
| relevanceScore | Double | relevance_score | | AI score 0–10 |
| aiStrengths | String | ai_strengths | TEXT | `\|\|`-delimited bullets |
| aiImprovements | String | ai_improvements | TEXT | `\|\|`-delimited bullets |
| aiSuggestions | String | ai_suggestions | TEXT | `\|\|`-delimited bullets |
| feedbackSavedAt | LocalDateTime | feedback_saved_at | | When AI scores were last persisted |
| similarityScore | Double | similarity_score | | Plagiarism score 0–100 |
| plagiarismSeverity | String | plagiarism_severity | length=10 | LOW/MEDIUM/HIGH |
| plagiarismFlagged | Boolean | plagiarism_flagged | | True if MEDIUM or HIGH |
| plagiarismCheckedAt | LocalDateTime | plagiarism_checked_at | | When plagiarism was last checked |
| aiGeneratedMark | Double | ai_generated_mark | | Weighted formula result; immutable after submit |
| lecturerMark | Double | lecturer_mark | | Post-deadline lecturer override |
| lecturerFeedbackText | String | lecturer_feedback_text | TEXT | Per-question feedback |
| lecturerUpdatedAt | LocalDateTime | lecturer_updated_at | | Audit timestamp |
| lecturerUpdatedBy | String | lecturer_updated_by | length=100 | Lecturer ID (audit) |

---

#### Entity: `SubmissionVersion`
*File:* `backend/submission-management-service/src/main/java/.../model/SubmissionVersion.java`

```
@Table(name = "submission_versions", schema = "submission_schema")
UniqueConstraint: uq_submission_version_number ON (submission_id, version_number)
Index: idx_sv_submission_id_version_number ON (submission_id, version_number)
```

| Field | Java Type | Column | Constraints | Description |
|---|---|---|---|---|
| id | Long | id | PK, IDENTITY | — |
| submissionId | Long | submission_id | NOT NULL | FK to submissions.id |
| versionNumber | Integer | version_number | NOT NULL | 1=first submit, 2=resubmit, etc. |
| studentId | String | student_id | length=100 | — |
| submittedAt | LocalDateTime | submitted_at | NOT NULL | Frozen at snapshot time |
| isLate | Boolean | is_late | default=false | — |
| aiScore | Double | ai_score | | AI quality score at snapshot time |
| plagiarismScore | Double | plagiarism_score | | Max similarity at snapshot time |
| totalWordCount | Integer | total_word_count | | Total words at snapshot time |
| aiGrade | Double | ai_grade | | AI-computed grade at snapshot |
| maxGrade | Double | max_grade | | Copied from submission |
| lecturerGrade | Double | lecturer_grade | | Set by post-deadline grading |
| commitMessage | String | commit_message | length=500 | Human-readable label |
| createdAt | LocalDateTime | created_at | NOT NULL, immutable | @CreationTimestamp |
| answers | List\<VersionAnswer\> | — | @OneToMany CASCADE | Frozen answer snapshots |

---

#### Entity: `VersionAnswer`
*File:* `backend/submission-management-service/src/main/java/.../model/VersionAnswer.java`

```
@Table(name = "version_answers", schema = "submission_schema")
@ManyToOne SubmissionVersion version
```

Contains all the same fields as `Answer` but frozen at submit time, plus:
- `version` — @ManyToOne FK to SubmissionVersion
- `snapshotCreatedAt` — when this snapshot row was created
- `lecturerMark`, `lecturerFeedbackText`, `lecturerUpdatedAt`, `lecturerUpdatedBy` — filled post-deadline on **latest version only**

---

#### Entity: `PlagiarismCheck`
*File:* `backend/integrity-monitoring-service/src/main/java/.../model/PlagiarismCheck.java`

```
@Table(name = "plagiarism_checks", schema = "integrity_schema")
```

| Field | Java Type | Column | Notable |
|---|---|---|---|
| id | Long | id | PK |
| submissionId | Long | submission_id | NOT NULL |
| studentId | String | student_id | NOT NULL |
| assignmentId | String | assignment_id | |
| questionId | Long | question_id | Per-question checks |
| checkType | CheckType | check_type | ENUM: BATCH/REALTIME/SCHEDULED |
| status | CheckStatus | status | ENUM: PENDING/COMPLETED/FAILED |
| questionType | QuestionType | question_type | FACTUAL/CALCULATION/OBJECTIVE |
| overallSimilarityScore | Double | overall_similarity_score | 0.0–1.0 |
| maxSimilarityScore | Double | max_similarity_score | 0.0–1.0 |
| internetSimilarityScore | Double | internet_similarity_score | 0.0–1.0 |
| flagged | Boolean | flagged | |
| notCitedPct | Double | not_cited_pct | 0–100 |
| matchesFound | Integer | matches_found | |
| internetMatchesFound | Integer | internet_matches_found | |
| processingTimeMs | Long | processing_time_ms | |
| metadata | Map | metadata | JSONB column |
| similarityMatches | List\<SimilarityMatch\> | — | @OneToMany CASCADE |
| internetMatches | List\<InternetMatch\> | — | @OneToMany CASCADE |

---

### 2.2 SQL Schema Initialisation

The project uses `spring.sql.init.mode=always` with `spring.sql.init.schema-locations=classpath:schema-init.sql` in all three services. Schema tables are initially created by Hibernate `ddl-auto=update`, and `schema-init.sql` handles idempotent schema creation (e.g., `CREATE SCHEMA IF NOT EXISTS submission_schema`).

---

### 2.3 Application Properties Summary

**Submission Management Service:**
```properties
server.port=8081
spring.datasource.url=jdbc:postgresql://localhost:5432/lms_db?currentSchema=submission_schema
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.default_schema=submission_schema
spring.servlet.multipart.max-file-size=50MB
submission.min-words-per-answer=10   # server-side minimum enforced at submit
```

**Feedback Service:**
```properties
server.port=8083
spring.datasource.url=jdbc:postgresql://localhost:5432/lms_db?currentSchema=feedback_schema
huggingface.model=HuggingFaceH4/zephyr-7b-beta:featherless-ai
huggingface.timeout=120              # seconds
huggingface.max-tokens=500
ai.feedback.max-concurrent-requests=5
spring.data.redis.host=localhost
spring.data.redis.port=6379
management.health.redis.enabled=false  # Redis optional — no startup failure if absent
```

**Integrity Monitoring Service:**
```properties
server.port=8084
spring.datasource.url=jdbc:postgresql://localhost:5432/lms_db?currentSchema=integrity_schema
serp.api-key=[MASKED]
serp.search-api-url=https://serpapi.com/search
integrity.code-similarity-threshold=0.75
integrity.text-similarity-threshold=0.45
integrity.internet-similarity-threshold=0.20
integrity.realtime.min-text-length=50
jplag.min-token-match=9
spring.cache.type=caffeine
spring.cache.caffeine.spec=maximumSize=1000,expireAfterWrite=1h
submission-service.url=http://localhost:8081
```

---

## TASK 3 — API ENDPOINTS EXTRACTION

### 3.1 SubmissionController (`/api/submissions`)

| Method | Path | Auth Required | Body / Params | Return | Description |
|---|---|---|---|---|---|
| POST | `/api/submissions` | Student JWT | `SubmissionRequest` | 201 SubmissionResponse | Create new draft submission. Returns existing draft if one exists (idempotent) |
| GET | `/api/submissions/{id}` | JWT | — | 200 SubmissionResponse | Get full submission details. Students may only view their own |
| GET | `/api/submissions` | JWT | `?studentId=&assignmentId=&page=&size=` | 200 List or Page | List submissions. Students restricted to own `studentId`. Lecturer-only full paged list |
| PUT | `/api/submissions/{id}` | Student JWT | `SubmissionRequest` | 200 SubmissionResponse | Update DRAFT submission metadata |
| DELETE | `/api/submissions/{id}` | Student JWT | — | 200 | Hard delete submission and all files |
| POST | `/api/submissions/{id}/submit` | Student JWT | — | 200 SubmissionResponse | Formal submission: validates words, transitions DRAFT→SUBMITTED (or LATE), computes AI marks, creates version snapshot |
| POST | `/api/submissions/{id}/grade` | Lecturer JWT | `GradeRequest` | 200 SubmissionResponse | Lecturer grade post-deadline. Writes to answers + latest version_answers |

### 3.2 AnswerController (`/api/submissions/{submissionId}/answers`)

| Method | Path | Auth | Body / Params | Return | Description |
|---|---|---|---|---|---|
| PUT | `/{questionId}` | Any | `SaveAnswerRequest` | 200 AnswerResponse | Upsert answer text. Called by frontend debounced auto-save (every 5s) |
| PATCH | `/{questionId}/analysis` | Any | `SaveAnswerAnalysisRequest` | 200 AnswerResponse | Persist AI scores + plagiarism results. Skipped if answer not yet created |
| GET | `/` | Any | — | 200 List\<AnswerResponse\> | Get all answers for submission (for resume on load / grading view) |

### 3.3 VersionController (`/api/submissions/{submissionId}/versions`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Get all version headers (timeline, newest first) |
| GET | `/{versionId}` | Get full version with all answer snapshots |
| GET | `/latest` | Get latest version with full detail |
| POST | `/{versionId}/answers/{questionId}/plagiarism-sources` | Save detailed internet plagiarism sources for a version answer |

### 3.4 AnswerSearchController (`/api/submissions/answers`)

| Method | Path | Description |
|---|---|---|
| GET | `/by-question` | `?questionId=&excludeStudentId=&excludeSubmissionId=` — Returns up to 200 peer answers for plagiarism comparison |

### 3.5 FeedbackController (`/api/feedback`)

| Method | Path | Body | Return | Description |
|---|---|---|---|---|
| POST | `/live` | `LiveFeedbackRequest` | `CompletableFuture<200 LiveFeedbackResponse>` | Real-time AI feedback (async, no DB write). Returns 503 on LLM failure |
| POST | `/generate` | `FeedbackRequest` | 201 FeedbackResponse | Synchronous rubric-based feedback with DB persistence |
| POST | `/generate-async` | `FeedbackRequest` | 202 "Processing" | Async rubric feedback (background) |
| GET | `/{id}` | — | 200 FeedbackResponse | Retrieve stored feedback |
| GET | `/submission/{submissionId}` | — | 200 List | All feedback for a submission |
| GET | `/student/{studentId}` | — | 200 List | All feedback for a student |

### 3.6 IntegrityCheckController (`/api/integrity/checks`)

| Method | Path | Body / Params | Return | Description |
|---|---|---|---|---|
| POST | `/` | `PlagiarismCheckRequest` | 201 PlagiarismCheckResponse | Run full plagiarism check (code or text) |
| GET | `/{id}` | — | 200 PlagiarismCheckResponse | Get check by ID |
| GET | `/flagged` | — | 200 List | All flagged checks (for lecturer dashboard) |
| GET | `/assignment/{assignmentId}` | — | 200 List | All checks for an assignment |
| GET | `/submission/{submissionId}` | — | 200 List | All checks for a submission |

### 3.7 RealtimeCheckController (`/api/integrity/checks/realtime`)

| Method | Path | Body | Return | Description |
|---|---|---|---|---|
| POST | `/` | `RealtimeCheckRequest` | 200 RealtimeCheckResponse | Real-time check triggered by frontend debounce (every 3s) |

### 3.8 ReportController (`/api/integrity/reports`)

| Method | Path | Description |
|---|---|---|
| GET | `/{submissionId}/plagiarism` | Generate and download plagiarism PDF report |
| GET | `/{submissionId}/feedback` | Generate and download combined feedback PDF report |

---

## TASK 4 — CORE BUSINESS LOGIC EXTRACTION

### 4.1 Service Summary Table

| Service Class | Location | Purpose |
|---|---|---|
| SubmissionService | submission-management-service | Lifecycle management: create, update, submit, grade |
| AnswerService | submission-management-service | Upsert answer text; persist AI + plagiarism results |
| VersionService | submission-management-service | Immutable snapshot creation; lecturer grade writes |
| FileStorageService | submission-management-service | File upload/download to filesystem |
| LiveFeedbackService | feedback-service | Real-time AI feedback via LLM (stateless, @Async) |
| FeedbackService | feedback-service | Rubric-based feedback with DB persistence |
| HuggingFaceService | feedback-service | HTTP client for HuggingFace Inference API (OkHttp) |
| FeedbackCacheService | feedback-service | Redis caching layer for feedback results |
| RubricService | feedback-service | CRUD for rubrics and marking criteria |
| IntegrityCheckService | integrity-monitoring-service | Orchestrates text + code + internet plagiarism checks |
| RealtimeCheckService | integrity-monitoring-service | Live plagiarism as student types (saves to DB) |
| TextSimilarityService | integrity-monitoring-service | TF-IDF cosine, Jaccard, N-gram Dice algorithms |
| JPlagService | integrity-monitoring-service | Code plagiarism via JPlag AST-based tokenisation |
| GoogleSearchService | integrity-monitoring-service | SerpAPI wrapper for internet similarity |
| SubmissionFetchService | integrity-monitoring-service | REST calls to submission-management-service (peer data) |
| QuestionAnalyzerService | integrity-monitoring-service | Classifies question type (FACTUAL/CALCULATION/OBJECTIVE) |
| PdfReportGeneratorService | integrity-monitoring-service | PDF generation using Apache PDFBox |

### 4.2 Key Public Methods

**SubmissionService** (`SubmissionService.java`):
- `createSubmission(request)` — Creates DRAFT; returns existing draft if already present (idempotent)
- `getSubmissionById(id)` — Fetch single submission
- `getAllSubmissions(pageable)` — Paginated list for lecturers
- `getSubmissionsByStudentId(studentId)` — All submissions for a student
- `getSubmissionsByStudentIdAndAssignmentId(s, a)` — Scoped by student + assignment
- `getSubmissionsByAssignmentId(assignmentId)` — All submissions for an assignment
- `updateSubmission(id, request, callerId)` — Update DRAFT metadata; throws if non-DRAFT
- `deleteSubmission(id, callerId)` — Hard delete (caller must own it)
- `submitSubmission(id, callerId)` — @Transactional: validates words, transitions status, computes AI marks, creates version snapshot
- `gradeSubmission(id, request)` — Lecturer-only; writes to answers + latest version

**AnswerService** (`AnswerService.java`):
- `saveAnswer(submissionId, questionId, request)` — UPSERT (safe for concurrent auto-saves)
- `getAnswers(submissionId)` — All answers ordered by questionId
- `saveAnalysis(submissionId, questionId, request)` — Persist AI feedback OR plagiarism results (skips if no answer row yet)
- `getAnswersByQuestion(questionId, excludeStudentId, excludeSubmissionId)` — Up to 200 peer answers
- `static countWords(text)` — Server-side word count (authoritative)

**VersionService** (`VersionService.java`):
- `createVersionSnapshot(submission, answers)` — @Transactional; idempotency guard on (submissionId, versionNumber)
- `getVersions(submissionId)` — All version headers (newest first)
- `getVersion(submissionId, versionId)` — Full version with answers
- `getLatestVersion(submissionId)` — Latest version with full detail
- `savePlagiarismSources(submissionId, versionId, questionId, request)` — Store internet URL sources
- `gradeVersionAnswers(submissionId, request)` — Write lecturer overrides to latest version only

---

### 4.3 AI Feedback Generation — Full Implementation

*File:* `backend/feedback-service/src/main/java/.../service/LiveFeedbackService.java`

The `generateLiveFeedback()` method is annotated `@Async("feedbackTaskExecutor")` and returns a `CompletableFuture`, allowing the Spring MVC dispatcher to release the HTTP worker thread immediately while the LLM call executes in a background thread pool.

**Processing pipeline:**

**Step 1 — Gibberish Detection** (lines 91–110):
```java
private boolean isGibberish(String text) {
    String[] words = text.trim().split("\\s+");
    int gibberishCount = 0;
    for (String word : words) {
        String cleaned = word.toLowerCase().replaceAll("[^a-z]", "");
        boolean hasVowel = cleaned.matches(".*[aeiou].*");
        boolean hasLongConsonantRun = cleaned.matches(".*[^aeiou]{5,}.*");
        if (!hasVowel || hasLongConsonantRun) gibberishCount++;
    }
    return (double) gibberishCount / words.length > 0.40;
}
```
A word is flagged if it contains no vowels OR has five or more consecutive consonants. If more than 40% of words are flagged, the answer is classified as gibberish and all scores return 0.

**Step 2 — Prompt Construction** (lines 130–220):
The service selects a short-answer or long-answer prompt template based on `maxPoints ≤ 5` OR `wordCount ≤ 40`. Both templates embed strict mandatory scoring rules that constrain LLM output:
- Rule: CONSISTENCY — if any strength bullet says the answer is correct, RELEVANCE must be ≥ 5
- Rule: SHORT-ANSWER GRADING — correct + direct answer earns RELEVANCE 7–9
- Rule: REPETITION — repeating question words without new content → COMPLETENESS 0–3
- Rule: BLANK/GIBBERISH — all scores must be 0

**Step 3 — LLM API Call:**
`HuggingFaceService.generateCompletion(prompt)` via OkHttp to the HuggingFace Router endpoint using the model `HuggingFaceH4/zephyr-7b-beta:featherless-ai`. Timeout: 120 seconds. Max tokens: 500.

**Step 4 — Response Parsing** (lines 420–440):
```java
private double extractScore(String text, String key) {
    Pattern p = Pattern.compile(key + ":\\s*(10(?:\\.0+)?|[0-9](?:\\.[0-9]+)?)", 
                                Pattern.CASE_INSENSITIVE);
    Matcher m = p.matcher(text);
    if (m.find()) {
        return Math.min(10.0, Math.max(0.0, Double.parseDouble(m.group(1))));
    }
    return 0.0;
}
private List<String> extractLines(String text, String prefix) {
    Pattern p = Pattern.compile(prefix + "\\d+:\\s*(.+)", Pattern.CASE_INSENSITIVE);
    // ... extracts STRENGTH1, STRENGTH2, IMPROVEMENT1, etc.
}
```

**Step 5 — Consistency Enforcement** (lines 240–309):

**Rule A — Positive strength / low score mismatch:**
If any strength bullet contains a positive signal word (correct, accurate, relevant, identifies, demonstrates, etc.) and relevance < 5.0, then relevance is raised to ≥ 5.0 and completeness to ≥ 4.0.

**Rule B — Question repetition penalty:**
The repetition ratio is computed as the fraction of the answer's meaningful words that also appear in the question text:
```java
double repetitionRatio = (double) overlap / answerWords.size();
if (repetitionRatio >= 0.65) {
    completeness = Math.min(completeness, 3.0);
    clarity = Math.min(clarity, 5.0);
}
```

**Rule C — Short-answer keyword floor:**
For short answers (≤ 40 words or ≤ 5 marks), if the answer contains ≥ 30% of the question's meaningful keywords, relevance and completeness receive proportional floors:
```java
double relevanceFloor = 5.0 + coverage * 2.0;     // 5.6–7.0 range
double completenessFloor = 4.0 + coverage * 1.5;  // 4.45–5.5 range
```

---

### 4.4 Plagiarism Detection Algorithms — Full Implementation

*File:* `backend/integrity-monitoring-service/src/main/java/.../service/TextSimilarityService.java`

#### Algorithm 1: TF-IDF Cosine Similarity (lines 21–58)

Tokenisation first converts text to lowercase, removes non-alphanumeric characters, removes words of 3 or fewer characters, and removes a curated stop-word list (44 words).

TF-IDF vector construction uses log-frequency weighting (as used in information retrieval practice):
```java
vector[i] = tf > 0 ? 1 + Math.log(tf) : 0;
```
Where `tf` is the raw term count of term `i` in the document.

Cosine similarity:
```java
double dotProduct = vector1.dotProduct(vector2);
double norm1 = vector1.getNorm();
double norm2 = vector2.getNorm();
return dotProduct / (norm1 * norm2);
```
Implemented using `org.apache.commons.math3.linear.ArrayRealVector`.

#### Algorithm 2: Jaccard Similarity (lines 187–193)

```java
private double computeJaccard(String t1, String t2) {
    Set<String> s1 = new HashSet<>(tokenize(t1));
    Set<String> s2 = new HashSet<>(tokenize(t2));
    Set<String> inter = new HashSet<>(s1); inter.retainAll(s2);
    Set<String> union = new HashSet<>(s1); union.addAll(s2);
    return (double) inter.size() / union.size();
}
```
Formula: J(A, B) = |A ∩ B| / |A ∪ B|

#### Algorithm 3 & 4: N-gram Dice Similarity, n=3 and n=5 (lines 196–211)

```java
private double computeNgramDice(String t1, String t2, int n) {
    Map<String, Long> f1 = buildNgramFreq(n1, n);
    Map<String, Long> f2 = buildNgramFreq(n2, n);
    long intersection = 0;
    for (Map.Entry<String, Long> e : f1.entrySet()) {
        intersection += Math.min(e.getValue(), f2.getOrDefault(e.getKey(), 0L));
    }
    long total = f1.values().stream().mapToLong(Long::longValue).sum()
               + f2.values().stream().mapToLong(Long::longValue).sum();
    return total == 0 ? 0.0 : (2.0 * intersection) / total;
}
```
Formula: Dice(A, B) = 2 × |ngrams(A) ∩ ngrams(B)| / (|ngrams(A)| + |ngrams(B)|)

N-gram sizes 3 and 5 are computed independently and both contribute to the ensemble.

#### Ensemble Strategy — Best Similarity (lines 176–185)

```java
public double calculateBestSimilarity(String text1, String text2) {
    double cosine  = calculateSimilarity(text1, text2);      // TF-IDF cosine
    double jaccard = computeJaccard(text1, text2);
    double ngram3  = computeNgramDice(text1, text2, 3);
    double ngram5  = computeNgramDice(text1, text2, 5);
    return Math.max(Math.max(cosine, jaccard), Math.max(ngram3, ngram5));
}
```
Taking the maximum ensures any algorithm that detects plagiarism causes a flag, regardless of whether the others agree.

#### Internet Similarity — Corpus Concatenation Strategy (lines 132–168)

```java
public double calculateInternetSimilarity(String studentText, 
                                           List<Map<String,String>> searchResults) {
    StringBuilder corpus = new StringBuilder();
    for (Map<String, String> result : searchResults) {
        corpus.append(result.getOrDefault("title", "")).append(". ");
        corpus.append(result.getOrDefault("snippet", "")).append(" ");
    }
    double corpusSim = calculateSimilarity(studentText, corpus.toString().trim());
    
    double maxSnippetSim = 0.0;
    for (Map<String, String> result : searchResults) {
        double sim = calculateSimilarity(studentText, result.getOrDefault("snippet", ""));
        maxSnippetSim = Math.max(maxSnippetSim, sim);
    }
    return Math.max(corpusSim, maxSnippetSim);
}
```
Concatenating all snippets into one corpus gives TF-IDF vectors more shared vocabulary, producing more reliable similarity scores than comparing against each short (50–150 char) snippet individually.

#### Risk Score Computation (`RealtimeCheckService.java`, lines 344–350)

```java
private double computeRiskScore(double maxSimilarity, int numMatches, boolean flagged) {
    if (!flagged && maxSimilarity < 0.20) return 0.0;
    double base = maxSimilarity * 100;
    double matchBonus = Math.min(numMatches * 5.0, 20.0);
    return Math.min(100.0, Math.round((base + matchBonus) * 10.0) / 10.0);
}
```
Risk levels: ≥70 → HIGH, ≥40 → MEDIUM, >5 → LOW, otherwise → CLEAN.

---

### 4.5 Version Snapshot Creation Logic

*File:* `backend/submission-management-service/src/main/java/.../service/VersionService.java`, lines 56–123

```java
@Transactional
public VersionResponse createVersionSnapshot(Submission submission, List<Answer> answers) {
    int versionNumber = submission.getVersionNumber(); // already incremented by submission.submit()

    // Idempotency guard: never create a duplicate version
    if (versionRepository.existsBySubmissionIdAndVersionNumber(submission.getId(), versionNumber)) {
        log.warn("Version snapshot already exists for submission {} version {} — skipping", ...);
        return /* existing version */;
    }

    // Build immutable version header
    SubmissionVersion version = SubmissionVersion.builder()
        .submissionId(submission.getId())
        .versionNumber(versionNumber)
        .submittedAt(submission.getSubmittedAt())   // frozen at submit time
        .aiScore(submission.getAiScore())            // frozen
        .plagiarismScore(submission.getPlagiarismScore()) // frozen
        .commitMessage(title + " — v" + versionNumber)
        .build();
    SubmissionVersion savedVersion = versionRepository.save(version);

    // Build frozen answer snapshots
    for (Answer a : answers) {
        VersionAnswer va = VersionAnswer.builder()
            .version(savedVersion)
            .questionId(a.getQuestionId())
            .answerText(a.getAnswerText())  // frozen at this moment
            .grammarScore(a.getGrammarScore())
            // ... all AI + plagiarism scores frozen ...
            .aiGeneratedMark(computeAiMark(a))
            .build();
        versionAnswerRepository.save(va);
    }
}
```

Key design properties:
- Called inside the same `@Transactional` context as `submitSubmission()` — if snapshot fails, the entire submit rolls back
- Idempotency guard using the database `UniqueConstraint` on `(submission_id, version_number)` prevents duplicate snapshots from retry/network timeout scenarios
- Lecturer fields start as `null` on all snapshot rows — only the latest version's rows are ever updated post-deadline

---

### 4.6 AI Mark / Grade Computation Formula

*File:* `backend/submission-management-service/src/main/java/.../util/AnswerScoreUtils.java`

```java
private static final double W_RELEVANCE    = 0.40;
private static final double W_COMPLETENESS = 0.30;
private static final double W_CLARITY      = 0.15;
private static final double W_GRAMMAR      = 0.15;

public static Double computeWeightedMark(Answer a) {
    boolean hasAny = a.getRelevanceScore() != null || a.getCompletenessScore() != null
                  || a.getClarityScore() != null   || a.getGrammarScore() != null;
    if (!hasAny) return null;

    double weightedSum = 0.0, appliedWeight = 0.0;
    if (a.getRelevanceScore()    != null) { weightedSum += W_RELEVANCE    * a.getRelevanceScore();    appliedWeight += W_RELEVANCE;    }
    if (a.getCompletenessScore() != null) { weightedSum += W_COMPLETENESS * a.getCompletenessScore(); appliedWeight += W_COMPLETENESS; }
    if (a.getClarityScore()      != null) { weightedSum += W_CLARITY      * a.getClarityScore();      appliedWeight += W_CLARITY;      }
    if (a.getGrammarScore()      != null) { weightedSum += W_GRAMMAR      * a.getGrammarScore();      appliedWeight += W_GRAMMAR;      }

    double mark = appliedWeight > 0 ? weightedSum / appliedWeight : 0.0;
    return Math.round(mark * 100.0) / 100.0;   // rounded to 2 d.p.
}
```

**Formula:** `mark = (0.40 × relevance + 0.30 × completeness + 0.15 × clarity + 0.15 × grammar) / appliedWeight`

Normalisation by `appliedWeight` ensures the result stays on a 0–10 scale even when some dimensions are null (not yet scored by the AI).

**Design rationale** (documented in source): Relevance and completeness together account for 70% of the mark because they measure whether the student answered the question correctly — the primary learning objective. Grammar and clarity are secondary surface-quality signals at 15% each.

**Worked example (from WeightedMarkFormulaTest.java):**
```
grammar=4.0, clarity=6.0, completeness=8.0, relevance=10.0
Expected = 0.15×4 + 0.15×6 + 0.30×8 + 0.40×10
         = 0.60 + 0.90 + 2.40 + 4.00
         = 7.90  (2 d.p.)
```

---

### 4.7 Gibberish Detection Logic

*File:* `backend/feedback-service/src/main/java/.../service/LiveFeedbackService.java`, lines 91–110

Already shown in 4.3. The algorithm:
1. Splits answer text on whitespace
2. Strips non-alphabetic characters from each word
3. Checks two heuristics per word:
   - Word has no vowels at all (`!cleaned.matches(".*[aeiou].*")`)
   - Word has 5+ consecutive consonants (`cleaned.matches(".*[^aeiou]{5,}.*")`)
4. If either is true, the word is counted as a gibberish word
5. If > 40% of total words are gibberish words → return `true` (gibberish)

When gibberish is detected, all four scores return 0.0 and the improvements list states "Your response appears to contain random text or gibberish."

---

### 4.8 Consistency Enforcement Rules for AI Scores

*File:* `backend/feedback-service/src/main/java/.../service/LiveFeedbackService.java`, `enforceConsistency()` method (lines 240–309)

Three rules, applied in order:

**Rule B — Question repetition detection** (checked first):
```
repetitionRatio = |answer_meaningful_words ∩ question_meaningful_words| / |answer_meaningful_words|
If repetitionRatio ≥ 0.65:
    completeness = min(completeness, 3.0)
    clarity = min(clarity, 5.0)
```
"Meaningful words" are lower-cased, ≥ 4 characters, and not in the STOP_WORDS list.

**Rule A — Positive strength / score consistency** (checked second):
```
If any strength bullet contains a POSITIVE_SIGNAL_WORD AND relevance < 5.0:
    relevance = max(relevance, 5.0)
    completeness = max(completeness, 4.0)
```
POSITIVE_SIGNAL_WORDS = [correct, accurate, relevant, identifies, addresses, demonstrates, applies, understands, shows, explains, provides, answers, appropriate, good, well, clear, direct, concise, precise, valid, proper, reasonable]

**Rule C — Short-answer keyword floor** (short answers only):
```
keywords = meaningful words from question text
coverage = |answer ∩ keywords| / |keywords|
If coverage ≥ 0.30:
    relevance = max(relevance, 5.0 + coverage × 2.0)     → floor in range [5.6, 7.0]
    completeness = max(completeness, 4.0 + coverage × 1.5) → floor in range [4.45, 5.5]
    if clarity ≥ 4.0: grammar = max(grammar, 4.0)
```

Additional hard rule for short answers: if `relevance < 1.0` and the answer is not blank and has no explicitly negative strength, then `relevance = 1.0` (never zero for a non-blank answer).

---

### 4.9 WebSocket Notification for Plagiarism Alerts

*File:* `backend/integrity-monitoring-service/src/main/java/.../service/RealtimeCheckService.java`, lines 355–366

*Configuration:* `backend/integrity-monitoring-service/src/main/java/.../config/WebSocketConfig.java`

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/integrity")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
```

When a real-time check produces a flagged result, the service immediately pushes a notification:
```java
private void sendWarningNotification(String sessionId, RealtimeCheckResponse response) {
    messagingTemplate.convertAndSend(
        "/topic/plagiarism-warnings/" + sessionId,
        response
    );
}
```

The STOMP topic is scoped to the individual student session (`sessionId` is a UUID generated by the frontend on page load), preventing cross-student information leakage. The frontend subscribes using SockJS + STOMP client library.

---

## TASK 5 — FRONTEND ARCHITECTURE

### 5.1 Main Pages / Routes

| Route | File | Role | Purpose |
|---|---|---|---|
| `/submissions/student/answer/[assignmentId]` | `page.tsx` | Student | Main text-answer editor page. Loads questions, creates/resumes draft, manages all live feedback and plagiarism |
| `/submissions/student/my-submissions` | `page.tsx` | Student | Lists all submissions with status badges; shows "Assignments to Answer" section |
| `/submissions/student/feedback/[id]` | `page.tsx` | Student | View AI and lecturer feedback for a submitted assignment |
| `/submissions/student/versions/[submissionId]` | `page.tsx` | Student | Version timeline + diff viewer |
| `/submissions/student/plagiarism` | `page.tsx` | Student | Student-facing plagiarism summary |
| `/submissions/student/analytics` | `page.tsx` | Student | Personal performance analytics |
| `/submissions/lecturer/grading/[submissionId]` | `page.tsx` | Lecturer | Per-submission grading interface with student answers + AI suggestions pre-populated |
| `/submissions/lecturer/plagiarism` | `page.tsx` | Lecturer | Class-wide plagiarism dashboard with bulk re-check |
| `/submissions/lecturer/submissions/[id]` | `page.tsx` | Lecturer | Submission management view |
| `/submissions/lecturer/assignments/[id]` | `page.tsx` | Lecturer | Assignment-level overview |

### 5.2 Key Custom Hooks

#### `useAnswerEditor` (per-question, most critical)

Manages three independent debounce timers per question using `useRef` (to avoid stale closures):

| Timer | Delay | Trigger | Action |
|---|---|---|---|
| `feedbackTimerRef` | 3,000 ms | Each keystroke resets | `POST /api/feedback/live` |
| `plagiarismTimerRef` | 3,000 ms | Each keystroke resets | `POST /api/integrity/checks/realtime` |
| `autoSaveTimerRef` | 5,000 ms | Each keystroke resets | `PUT /api/submissions/{id}/answers/{qId}` |

After receiving feedback or plagiarism results, a separate call to `PATCH /api/submissions/{id}/answers/{qId}/analysis` persists the scores to the database.

State managed: `text`, `saveStatus` (idle/saving/saved/error), `liveFeedback` (LiveFeedbackResponse), `livePlagiarism` (RealtimeCheckResponse).

#### `useSubmissions`

Wraps submission CRUD API calls. Returns loading/error states plus:
- `useAllSubmissions()` — paged lecturer view
- `useSubmission(id)` — single submission
- `useGradeSubmission()` — returns `{ loading, error, success, gradeSubmission(id, payload) }`

#### `usePlagiarism`

- `usePlagiarismReport(submissionId)` — fetches the latest plagiarism check
- `useAllPlagiarismReports()` — all flagged checks for lecturer dashboard
- `useUpdatePlagiarismReview()` — lecturer manual review action

#### `useVersions`

- `useVersions(submissionId)` — version timeline headers
- `useVersionComparison(submissionId, v1, v2)` — diff between two versions

#### `useFeedback`

- `useFeedback(submissionId)` — stored AI feedback
- `useGenerateFeedback()` — trigger feedback generation with polling (3s, 20 max attempts)

### 5.3 Key UI Components

| Component | Purpose |
|---|---|
| `QuestionCard.tsx` | Two-column layout: RichTextEditor (left) + LiveFeedbackPanel (right), with PlagiarismWarning below editor. Wires up `useAnswerEditor` |
| `RichTextEditor.tsx` | Auto-resizing textarea, word-count bar (green/amber/red), character count |
| `LiveFeedbackPanel.tsx` | Animated score bars for grammar/clarity/completeness/relevance (0–10), plus strength/improvement/suggestion bullets. Three display states: ghost (not triggered yet), loading (spinner), feedback |
| `PlagiarismWarning.tsx` | Severity chip (LOW=grey, MEDIUM=amber, HIGH=red) rendered below editor. Animates in when plagiarism score changes |
| `VersionTimeline.tsx` | Vertical timeline list of version headers with metadata. Compare checkboxes; "Compare Versions" button appears when two are selected |
| `DiffViewer.tsx` | Line-level diff between two version answer texts. Lines coloured green (added), red (removed), grey (unchanged). Long unchanged blocks collapsible |
| `AIFeedbackCard.tsx` | Static display of stored AI scores + bullet points (strengths/improvements/suggestions) |
| `PlagiarismReportCard.tsx` | Traffic-light indicator, risk score, peer match table, internet match URL list |
| `FileUploader.tsx` | Drag-and-drop file upload with progress bar |

### 5.4 TypeScript Interfaces (from `submission.types.ts`)

```typescript
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'GRADED' | 'LATE' | 'PENDING_REVIEW' | 'FLAGGED';

export interface Submission {
    id: string;
    studentId: string;
    studentName?: string;
    assignmentId: string;
    status: SubmissionStatus;
    currentVersionNumber: number;
    totalVersions: number;
    grade?: number;
    plagiarismScore?: number;
    aiScore?: number;
    isLate?: boolean;
    dueDate?: string;
    // ... additional metadata fields
}

export interface Answer {
    id: string;
    submissionId: string;
    questionId: string;
    questionText?: string;
    answerText?: string;
    wordCount?: number;
    // AI scores
    grammarScore?: number;        // 0–10
    clarityScore?: number;
    completenessScore?: number;
    relevanceScore?: number;
    strengths?: string[];
    improvements?: string[];
    suggestions?: string[];
    // Plagiarism
    similarityScore?: number;     // 0–100
    plagiarismSeverity?: 'LOW' | 'MEDIUM' | 'HIGH';
    plagiarismFlagged?: boolean;
    // Grading
    aiGeneratedMark?: number;
    lecturerMark?: number;
    lecturerFeedbackText?: string;
}

export interface LiveFeedbackResponse {
    grammarScore: number;
    clarityScore: number;
    completenessScore: number;
    relevanceScore: number;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
    questionId: string;
    generatedAt: string;
}

export interface RealtimeCheckResponse {
    sessionId: string;
    studentId: string;
    questionId: string;
    similarityScore: number;       // 0.0–1.0
    flagged: boolean;
    riskScore: number;             // 0–100
    riskLevel: 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH';
    warningMessage?: string;
    internetMatches: InternetMatchResponse[];
    internetSimilarityScore: number;
    peerSimilarityScore: number;
    checkedAt: string;
}

export interface VersionAnswer {
    id: string;
    versionId: string;
    questionId: string;
    answerText?: string;
    wordCount?: number;
    // All AI + plagiarism fields (frozen at snapshot time)
    grammarScore?: number;
    // ... same as Answer but immutable after creation
    lecturerMark?: number;         // only non-null on latest version
    lecturerFeedbackText?: string;
}
```

---

## TASK 6 — INTEGRATION POINTS

### 6.1 Inter-Service Communication

All inter-service communication is **synchronous HTTP REST** via `RestTemplate` (configured in `RestTemplateConfig.java`).

**Integrity Monitoring → Submission Management (peer answers):**
```java
// SubmissionFetchService.java
// Configured via: submission-service.url=http://localhost:8081
GET http://localhost:8081/api/submissions/answers/by-question
    ?questionId={id}&excludeStudentId={sid}&excludeSubmissionId={subid}
```
This is used by `RealtimeCheckService` to fetch up to 200 peer answers for comparison, excluding the current student's own answers.

**Frontend → All Services (direct):**
The Next.js frontend calls all three backend services directly via environment variables:
```
NEXT_PUBLIC_SUBMISSION_API_URL=http://localhost:8081
NEXT_PUBLIC_FEEDBACK_API_URL=http://localhost:8083
NEXT_PUBLIC_PLAGIARISM_API_URL=http://localhost:8084
```

### 6.2 JWT Authentication and Security Configuration

*File:* `backend/submission-management-service/src/main/java/.../util/JwtUtils.java`

JWT tokens are validated without a separate security filter — a lightweight `JwtUtils.parseClaims()` utility is called at the start of each controller action:

```java
public static Map<String, Object> parseClaims(String authHeader) {
    // Extracts the payload section (parts[1]), Base64-URL-decodes it,
    // and deserialises it to a Map without signature verification.
    // Signature verification is expected at the API gateway layer.
}

public static String extractRole(Map<String, Object> claims) {
    Object role = claims.get("role");
    if (role == null) role = claims.get("userRole");  // compat: Next.js signs as "userRole"
    return role != null ? String.valueOf(role) : null;
}

public static boolean isLecturer(Map<String, Object> claims) {
    return "lecture".equals(extractRole(claims));  // note: "lecture" not "lecturer"
}
```

Each controller enforces roles via helper methods:
```java
private void requireLecturer(Map<String, Object> claims) {
    if (!JwtUtils.isLecturer(claims)) throw new AccessDeniedException("Lecturer role required");
}
```

### 6.3 WebSocket Configuration

*File:* `backend/integrity-monitoring-service/src/main/java/.../config/WebSocketConfig.java`

- STOMP endpoint: `/ws/integrity` with SockJS fallback
- Message broker: simple in-memory broker on `/topic`
- Application destination prefix: `/app`
- WebSocket notifications sent to `/topic/plagiarism-warnings/{sessionId}`

### 6.4 Integration with Teammate Modules

**Projects & Tasks Service** (teammate module — same Next.js server):
The `getAssignmentWithFallback()` function in `frontend/lib/api/submission-services.ts` resolves questions from:
1. `GET /api/projects-and-tasks/project/{id}` → maps `mainTasks[]` to `Question[]`
2. `GET /api/projects-and-tasks/task/{id}` → maps `subtasks[]` to `Question[]`
3. `GET http://localhost:8081/api/assignments/{id}` (legacy fallback)

**No direct backend-to-backend calls** exist to other teammate services — integration happens entirely in the Next.js API layer.

### 6.5 External API Integrations

| API | Service | Configuration | Purpose |
|---|---|---|---|
| HuggingFace Inference API / Featherless | feedback-service | `huggingface.api-url`, `huggingface.model`, `huggingface.api-key` | Hosts `HuggingFaceH4/zephyr-7b-beta:featherless-ai`; called via OkHttp; 120s timeout; 500 max tokens |
| SerpAPI (Google Search) | integrity-monitoring-service | `serp.api-key`, `serp.search-api-url` | Returns top-3 Google results per query; used for internet similarity detection |
| JPlag 5.1.0 | integrity-monitoring-service | In-process library | AST-based code plagiarism; 14 language modules (Java, Python, C/C++, C#, JavaScript, TypeScript, Kotlin, Scala, Go, Rust, Swift, R, Scheme) |

---

## TASK 7 — TESTING

### 7.1 Test Classes

| Test Class | Service | Location |
|---|---|---|
| `WeightedMarkFormulaTest.java` | submission-management-service | `src/test/java/.../WeightedMarkFormulaTest.java` |
| `SubmissionManagementServiceApplicationTests.java` | submission-management-service | `src/test/java/...` (Spring context load test) |
| `ScoringConsistencyTest.java` | feedback-service | `src/test/java/.../ScoringConsistencyTest.java` |
| `FeedbackServiceApplicationTests.java` | feedback-service | `src/test/java/...` (Spring context load test) |
| `IntegrityMonitoringServiceApplicationTests.java` | integrity-monitoring-service | `src/test/java/...` (Spring context load test) |
| `VersionCreationTest.java` | version-control-service | `src/test/java/...` (legacy service) |

### 7.2 Detailed: WeightedMarkFormulaTest

*File:* `backend/submission-management-service/src/test/java/.../WeightedMarkFormulaTest.java`

This test class verifies the weighted AI mark formula used by both `SubmissionService` and `VersionService`. It uses **Mockito** with no Spring context (fast, no database), accessing private methods via Java Reflection.

**Framework:** JUnit 5 + Mockito (`@ExtendWith(MockitoExtension.class)`)

**Structure:** Three nested test classes covering 11 test cases:

**Nested class: `WeightedFormulaFairness` (Case 5) — 7 tests:**

| Test Name | Input Scores | Expected | Rationale |
|---|---|---|---|
| `typicalShortCorrectAnswer_fairMark` | g=7, cl=5, co=5, r=7 | [5.5, 7.5] | Correct short answer gets fair mark: 6.10 |
| `perfectAnswer_markAboveEight` | g=9, cl=9, co=9, r=10 | ≥ 8.0 | Perfect scores: 9.40 |
| `goodGrammarWrongAnswer_markBelowFour` | g=9, cl=8, co=1, r=1 | < 4.0 | Grammar does not inflate wrong answer: 3.25 |
| `poorGrammarCorrectConcept_markPassFair` | g=2, cl=3, co=7, r=8 | ≥ 5.5 | Concept wins: 6.05 |
| `allZeroScores_markIsZero` | g=0, cl=0, co=0, r=0 | = 0.0 | Safety net |
| `onlyRelevancePresent_normalisedCorrectly` | r=8 only | = 8.0 | Normalisation: 0.40×8/0.40 = 8.0 |
| `noScores_returnsNull` | all null | null | No AI evaluation → no mark |

**Nested class: `FormulaConsistencyAcrossServices` (Case 6) — 4 tests:**

Verifies that `SubmissionService.computeWeightedMark()` and `VersionService.computeAiMark()` produce identical results for the same inputs:
- Short-answer scores (g=7, cl=5, co=6, r=8) → identical from both services
- All-maximum scores → identical, equals 10.0
- Partial scores (g=6, r=7 only) → identical, normalised correctly
- Pre-existing `aiGeneratedMark=9.5` → `VersionService` returns 9.5 without recalculating (immutability)

**Nested class: `RealWorldScenarios` (Case 7) — 5 tests:**

Tests with real-world answer scenarios mapped to expected grade bands:

| Scenario | Answer Context | Expected Band |
|---|---|---|
| A | "SQL injection" (two-word correct) | Pass [5.0, 7.0] |
| B | "Cross-site scripting" (precise acronym) | Merit [7.0, 9.5] |
| C | "A firewall filters network traffic" (brief but complete) | Merit [6.5, 8.5] |
| D | Question repetition (completeness capped at 3) | Below-pass [3, 5) |
| E | Wrong answer with high grammar (g=9, r=1) | < 4.0 and < flat average |

**Key formula verification test:**
```java
double expected = 0.15 * 4.0 + 0.15 * 6.0 + 0.30 * 8.0 + 0.40 * 10.0 = 7.90;
// Verified against both SubmissionService and VersionService implementations
```

### 7.3 ScoringConsistencyTest (Feedback Service)

*File:* `backend/feedback-service/src/test/java/.../ScoringConsistencyTest.java`

Tests the scoring consistency enforcement rules in `LiveFeedbackService`. Due to a refactoring during development where the controller return type changed from `ApiResponse<LiveFeedbackResponse>` to `CompletableFuture<ApiResponse<LiveFeedbackResponse>>` to support `@Async`, the test was updated. The Dockerfile uses `-Dmaven.test.skip=true` to skip test compilation and execution during Docker image builds.

### 7.4 Coverage Notes

- `WeightedMarkFormulaTest.java` provides line-level coverage of `AnswerScoreUtils.computeWeightedMark()` (the shared utility) and its callers
- Context load tests (`*ApplicationTests.java`) verify all Spring beans wire correctly on startup
- No integration tests with live database were found (all tests use mocks or in-memory H2)

**[FLAG — Examiner Note]:** Integration tests against a running PostgreSQL instance were not implemented. The test suite focuses on unit-level business logic verification.

---

## TASK 8 — PERFORMANCE & CONFIGURATION

### 8.1 Thread Pool / @Async Configuration

**Feedback Service** — `AsyncConfig.java`:
```java
@Bean(name = "feedbackTaskExecutor")
public Executor feedbackTaskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(2);
    executor.setMaxPoolSize(maxConcurrentRequests);   // default 5 (configurable)
    executor.setQueueCapacity(50);
    executor.setThreadNamePrefix("feedback-");
    executor.initialize();
    return executor;
}
```
Configured by `ai.feedback.max-concurrent-requests=5`. Core=2 keeps idle threads minimal; max=5 allows bursts; queue=50 buffers requests before rejecting.

**Integrity Monitoring Service** — `AsyncConfig.java`:
A separate task executor configured for plagiarism check tasks (parallel peer + internet checks via `CompletableFuture.allOf()`).

### 8.2 Caching Configuration

**Integrity Monitoring Service** — `CacheConfig.java`:
```java
CaffeineCacheManager cacheManager = new CaffeineCacheManager(
    "internetSearchCache",
    "scholarSearchCache",
    "questionAnalysisCache"
);
cacheManager.setCaffeine(Caffeine.newBuilder()
    .maximumSize(1000)
    .expireAfterWrite(1, TimeUnit.HOURS)
    .recordStats());
```
Three Caffeine caches, each holding up to 1,000 entries with 1-hour expiry. The `internetSearchCache` cache dramatically reduces SerpAPI costs when multiple students write answers with similar phrasing.

**Feedback Service** — Redis via `FeedbackCacheService.java`:
`application.properties`: `ai.feedback.cache-ttl-days=7`
Redis-backed cache keyed on submission ID. Stores complete feedback responses for 7 days, eliminating redundant LLM calls when a student views their feedback multiple times.

### 8.3 Database Indexing

Two explicit composite indexes are defined on the `answers` table (`Answer.java`):
```java
@Index(name = "idx_answers_submission_id_question_id", columnList = "submission_id, question_id")
@Index(name = "idx_answers_question_id_last_modified",  columnList = "question_id, last_modified")
```

The first covers the upsert lookup (`findBySubmissionIdAndQuestionId`) and ordered fetch (`findBySubmissionIdOrderByQuestionId`).
The second covers the peer plagiarism query (`findByQuestionId ORDER BY last_modified DESC LIMIT 200`).

On `submission_versions`:
```java
@UniqueConstraint(columnNames = {"submission_id", "version_number"})
@Index(columnList = "submission_id, version_number")
```
This unique constraint enforces idempotency at the database level, preventing duplicate snapshots even under concurrent retries.

### 8.4 HikariCP Connection Pool Settings

Configured in `feedback-service/application.properties`:
```properties
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000    # 30s
spring.datasource.hikari.idle-timeout=600000          # 10 min
spring.datasource.hikari.max-lifetime=1800000         # 30 min
```

Integrity Monitoring Service:
```properties
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
```

Submission Management Service uses Spring Boot's HikariCP defaults (pool size 10).

### 8.5 Docker / Deployment Configuration

*File:* `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: lms_db, ... }
    healthcheck: ["CMD-SHELL", "pg_isready -U postgres -d lms_db"]
    interval: 10s, timeout: 5s, retries: 10, start_period: 30s

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  submission-management-service:
    ports: ["8081:8081"]
    depends_on: { postgres: { condition: service_healthy } }
    volumes: [uploads:/app/uploads]

  feedback-service:
    ports: ["8083:8083"]
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }

  integrity-monitoring-service:
    ports: ["8084:8084"]
    environment:
      SUBMISSION_SERVICE_URL: http://submission-management-service:8081
    depends_on:
      postgres:                    { condition: service_healthy }
      submission-management-service: { condition: service_started }
```

All three services wait for PostgreSQL to pass its health check before starting. The Integrity Monitoring Service additionally waits for Submission Management to start (not health-checked) because it makes REST calls to it for peer answer retrieval.

---

# PART II — THESIS CONTENT (Task 9)

---

## METHODOLOGY SECTION

### System Architecture Description

The submission management component of the Smart LMS was designed and implemented as a microservice-based system comprising three independent Spring Boot services, a shared PostgreSQL database partitioned by schema, and a Next.js frontend. This architectural approach was chosen to enable independent deployment and scaling of functionally distinct concerns: submission storage and lifecycle management, AI-driven feedback generation, and academic integrity monitoring.

The Submission Management Service, operating on port 8081, serves as the central hub of the component. It is responsible for the full lifecycle of student text-based submissions, from draft creation through to formal submission, version snapshotting, and lecturer grading. Built with Spring Boot 3.4.1 and Java 21, it exposes a REST API consumed directly by the frontend and indirectly by the Integrity Monitoring Service.

The Feedback Service, operating on port 8083, acts as a stateless AI inference gateway. It accepts structured requests containing question and answer text, constructs LLM prompts, calls the HuggingFace Inference API using OkHttp, and returns structured feedback responses. No database writes are performed within this service for live feedback requests, deliberately keeping the hot path as lightweight as possible. Asynchronous processing is achieved through Spring's `@Async` annotation bound to a dedicated thread pool (`feedbackTaskExecutor`) with a configurable pool size (default maximum 5 concurrent threads), which prevents the AI latency from blocking Tomcat's HTTP worker threads.

The Integrity Monitoring Service, operating on port 8084, performs both real-time and batch plagiarism detection. It integrates four text similarity algorithms — TF-IDF cosine similarity, Jaccard similarity, and Sørensen–Dice coefficient over character n-grams of sizes 3 and 5 — as well as internet similarity detection via the SerpAPI web search API, and code plagiarism detection via the JPlag library (version 5.1.0) with support for 14 programming languages. The service maintains real-time WebSocket communication with the frontend via the STOMP protocol over SockJS to deliver instant plagiarism alerts.

The services communicate synchronously over HTTP REST. There is no message queue or event bus in the current implementation. The three backend services share a single PostgreSQL 16 database (`lms_db`) using schema-level isolation: `submission_schema`, `feedback_schema`, and `integrity_schema`. This approach balances operational simplicity (a single database process) with logical separation (schemas act as namespaces, preventing cross-service table collisions).

### Database Design Explanation

The database schema was designed around five primary entities: `Submission`, `Answer`, `SubmissionVersion`, `VersionAnswer`, and `PlagiarismCheck`. Schema management is delegated to Hibernate's `ddl-auto=update` strategy, which creates and evolves tables automatically on service startup without requiring manual migration scripts.

The `Submission` entity is the root aggregate, capturing the student's assignment attempt at the submission level. Its `status` field implements a state machine with four valid states: DRAFT, SUBMITTED, LATE, and GRADED. The DRAFT-to-SUBMITTED transition is guarded by server-side validation including a minimum word count check (`submission.min-words-per-answer=10`), performed against the server-recomputed word count rather than the client-reported value to prevent bypassing the constraint. The LATE status is assigned automatically when a submission is formally submitted after its `dueDate`.

The `Answer` entity stores the content of each question's response within a submission, identified by the pair `(submissionId, questionId)`. An explicit upsert pattern in `AnswerService.saveAnswer()` — using `findBySubmissionIdAndQuestionId` followed by INSERT or UPDATE — ensures that repeated debounced auto-save calls from the frontend produce exactly one row per question regardless of timing or network conditions. Two composite database indexes support the performance requirements of this entity: `(submission_id, question_id)` for the upsert lookup, and `(question_id, last_modified)` for peer comparison queries.

The `SubmissionVersion` and `VersionAnswer` entities implement an immutable snapshot system. Each formal submission creates one `SubmissionVersion` row and one `VersionAnswer` row per question, all frozen at the moment of submission. A database-level unique constraint on `(submission_id, version_number)` enforces idempotency — even under concurrent retry scenarios, no duplicate version can be persisted. Importantly, version snapshot creation occurs within the same `@Transactional` context as the submission state change, meaning that if the snapshot fails, the entire submit operation rolls back atomically and the submission remains in DRAFT status.

The `PlagiarismCheck` entity in `integrity_schema` stores the results of both real-time and batch plagiarism checks. It uses a JSONB column (`metadata`) for flexible storage of configuration parameters and a `@OneToMany` relationship to `SimilarityMatch` (peer matches) and `InternetMatch` (internet URL matches), allowing detailed forensic records alongside the summary scores.

### AI Feedback System Implementation Details

The AI feedback system operates in two complementary modes. The live feedback mode, invoked during answer composition, is stateless and optimised for low latency. The stored feedback mode, invoked after submission, is persisted and rubric-aware.

For live feedback, the `LiveFeedbackService.generateLiveFeedback()` method first applies a gibberish detection heuristic to reject meaningless input. The heuristic classifies a word as suspicious if it contains no vowels or has five or more consecutive consonant characters. When more than 40% of the answer's words are classified as suspicious, the entire answer is marked as gibberish and all four feedback dimensions receive a score of zero.

For valid answers, the service constructs a structured prompt that embeds both the question and the student's answer alongside mandatory scoring rules. Two prompt templates exist: one for short answers (40 words or fewer, or questions worth five marks or fewer) and one for longer answers. The short-answer template explicitly instructs the LLM that a correct one-sentence answer deserves full credit, preventing the model from penalising brevity. Both templates follow a rigid output format (`GRAMMAR: X`, `CLARITY: X`, etc.) to facilitate deterministic parsing.

The LLM response is parsed using Java regular expressions to extract four numeric scores and up to six bullet points across three categories. Following parsing, three post-processing rules enforce internal consistency of the output. Rule A corrects cases where the LLM assigns low numeric scores while simultaneously providing positive qualitative feedback — a common hallucination pattern. Rule B penalises question repetition by capping the completeness score when the answer's meaningful words overlap with the question text by 65% or more. Rule C applies a proportional relevance floor for short answers that contain at least 30% of the question's meaningful keywords, ensuring factually correct brief answers receive appropriate credit.

The four AI feedback dimensions are mapped to a weighted composite mark using the formula: relevance × 0.40 + completeness × 0.30 + clarity × 0.15 + grammar × 0.15. The weighting was chosen to prioritise concept correctness (relevance and completeness, 70% combined) over surface writing quality (clarity and grammar, 30% combined), reflecting the assessment principle that understanding should be rewarded over presentation.

### Plagiarism Detection Algorithm Explanation with Formulas

The plagiarism detection system employs an ensemble approach combining four distinct text similarity algorithms, each measuring a different aspect of textual overlap.

**TF-IDF Cosine Similarity** represents each document as a vector of log-frequency term weights, computed as TF(t,d) = 1 + log(count(t,d)) when count > 0, else 0. Stop words (44 common English function words) and terms of three characters or fewer are removed during tokenisation. The cosine similarity of two document vectors A and B is:

```
cosine(A, B) = (A · B) / (||A|| × ||B||)
```

This measure captures thematic similarity even when documents use paraphrasing, as synonyms and context words contribute to the overall vector direction.

**Jaccard Similarity** operates on sets of unique tokens after stop-word removal:

```
Jaccard(A, B) = |A ∩ B| / |A ∪ B|
```

Jaccard is sensitive to vocabulary overlap and complements TF-IDF by detecting cases where two answers share a distinct vocabulary set even if term frequencies differ.

**Sørensen–Dice N-gram Similarity** computes character n-gram overlap using multiset intersection to account for repeated n-grams:

```
Dice(A, B) = 2 × |ngrams_n(A) ∩ ngrams_n(B)| / (|ngrams_n(A)| + |ngrams_n(B)|)
```

Two n-gram sizes are used: n=3 (trigrams) and n=5 (pentagrams). Trigrams detect short phrase similarities and common word fragments; pentagrams require longer shared subsequences and reduce false positives. Running both sizes and contributing both to the ensemble improves recall without requiring a single fixed n-gram length to be optimal for all answer lengths.

The ensemble strategy takes the maximum across all four algorithms:

```
bestSimilarity(A, B) = max(cosine(A,B), Jaccard(A,B), Dice_3(A,B), Dice_5(A,B))
```

This ensures that plagiarism detected by any single algorithm flags the pair, even if other algorithms do not agree — reducing the false-negative rate without requiring all four to achieve consensus.

Internet similarity is computed using a corpus concatenation strategy: all search result titles and snippets are concatenated into a single corpus document, and TF-IDF cosine similarity is computed between the student's answer and the corpus. This produces more reliable similarity scores than comparing against individual short snippets, because snippet-level TF-IDF vectors share too few vocabulary tokens with a multi-hundred-word essay to yield meaningful cosine scores. A secondary per-snippet comparison is also computed, and the final internet similarity is the maximum of the two approaches.

The risk score aggregates similarity evidence into a 0–100 scale: base = maxSimilarity × 100, plus a bonus of up to 20 points proportional to the number of matched internet sources (5 points per source, capped at 20). Risk levels map to the thresholds ≥70 (HIGH), ≥40 (MEDIUM), >5 (LOW), and below that (CLEAN).

### Version Control System Design

Version control in this system is implemented not as a separate service but as an integral feature of the Submission Management Service, using the `SubmissionVersion` and `VersionAnswer` entities. This design decision was made to guarantee atomic consistency: because version snapshot creation occurs within the same `@Transactional` context as the submission state change, either both succeed or neither does, with no possibility of a submitted assignment lacking a corresponding version snapshot.

Each formal submission increments the `versionNumber` field on the `Submission` entity and creates one `SubmissionVersion` header row plus one `VersionAnswer` row per question. The version header records aggregate metrics at the moment of submission (AI score, plagiarism score, total word count) and assigns a human-readable commit message (e.g., "Web Security Assignment — v2"). All AI feedback scores and plagiarism scores are also captured in the `VersionAnswer` rows, providing a complete forensic record of the submission state.

An idempotency guard at the start of `createVersionSnapshot()` checks for the existence of a version with the same `(submissionId, versionNumber)` pair before inserting, returning the existing version if found. This prevents duplicate snapshots from network timeouts or client retries. The database unique constraint enforces this invariant at the storage level as well.

Lecturer grading overrides are applied exclusively to the `VersionAnswer` rows of the most recent version, leaving all earlier versions permanently intact. The `finalGrade` exposed in API responses is computed as the lecturer-assigned grade if present, falling back to the AI-computed grade otherwise.

### Frontend Implementation Approach

The frontend is built with Next.js 16, React 19, and TypeScript 5, styled with Tailwind CSS 4. The student text-answer page (`/submissions/student/answer/[assignmentId]/page.tsx`) is the most complex component in the system. On load, it decodes the JWT from `localStorage['authToken']` to extract the student identifier, then loads questions from the Projects & Tasks service with fallback to the legacy assignments API. If an existing draft submission is found (by querying `GET /api/submissions?studentId=&assignmentId=&status=DRAFT`), it is resumed; otherwise, a new draft is created.

Each question is rendered as a `QuestionCard` component that internally uses the `useAnswerEditor` hook. This hook manages three concurrent debounce timers using `useRef` to avoid stale-closure issues: a 3-second timer for AI feedback, a 3-second timer for plagiarism checking, and a 5-second timer for answer auto-save. On each keystroke, all three timers are reset, so the API calls fire only after the student pauses for the respective interval.

The live feedback panel (`LiveFeedbackPanel.tsx`) transitions through three visual states: a ghost (skeleton) state when no feedback has been received yet, a loading spinner while the AI call is in progress, and the full feedback display with animated score bars and bullet points once results arrive. The plagiarism warning chip (`PlagiarismWarning.tsx`) renders below the editor with colour coding: grey for LOW, amber for MEDIUM, and red for HIGH severity.

### Security Implementation

Authentication in this system is based on JWT tokens issued by the Next.js authentication service and stored in `localStorage`. The backend services validate the token payload by Base64-URL-decoding the middle segment of the JWT, without performing cryptographic signature verification — this responsibility is assigned to the API gateway layer. The `JwtUtils` class supports two JWT claim key conventions for the role field (`role` and `userRole`) to maintain compatibility with both the production auth service (which signs with `userRole`) and any third-party tooling.

Role-based access control is enforced at the controller level. Student endpoints require `isStudent(claims)` to return true; lecturer endpoints require `isLecturer(claims)`. The role values are `"student"` and `"lecture"` respectively (the latter without the trailing -r suffix, matching the convention established by the authentication service). Cross-student data access is prevented at the service layer: `SubmissionService.getSubmissionById()` throws `AccessDeniedException` when a student attempts to access another student's submission, and `AnswerService.getAnswersByQuestion()` filters out all answers belonging to the requesting student before returning peer data.

### Testing Approach

The testing strategy adopted for this component focuses on business logic unit testing without a Spring application context, minimising test execution time. The `WeightedMarkFormulaTest` class exemplifies this approach: it uses Mockito to inject mock repository dependencies, accesses private service methods via Java Reflection, and verifies the AI mark formula against both manual calculations and real-world scenarios. The 11 test cases are organised into three nested JUnit 5 test classes covering formula fairness, cross-service consistency, and real-world grade bands.

The primary assertion verified across multiple test cases is that the weighted formula does not allow grammar to inflate the mark of an incorrect answer. Specifically, an answer with perfect grammar (9/10) but zero content relevance (1/10) must score below 4/10 under the weighted formula, whereas a simple arithmetic average of the same scores would yield 4.75/10 — a meaningful and pedagogically important difference.

---

## RESULTS AND DISCUSSION SECTION

### API Endpoints Implemented — Summary Table

| Service | Endpoints Implemented | HTTP Methods |
|---|---|---|
| Submission Management | 11 endpoints across 4 controllers | GET, POST, PUT, DELETE, PATCH |
| Feedback Service | 6 endpoints | GET, POST |
| Integrity Monitoring | 7 endpoints | GET, POST |
| **Total** | **24 REST endpoints** | — |

All endpoints return a standardised `ApiResponse<T>` wrapper carrying `success` (Boolean), `message` (String), `data` (T), and `timestamp` (LocalDateTime). This uniformity simplifies frontend error handling, as a single response-processing function handles all service responses.

### Features Successfully Implemented

| Feature | Implementation Status | Evidence |
|---|---|---|
| Text-based Q&A submission with draft management | Complete | `SubmissionService.createSubmission()`, `AnswerService.saveAnswer()` |
| Idempotent auto-save (debounced, 5s) | Complete | `useAnswerEditor.autoSaveTimerRef`, `AnswerService.saveAnswer()` upsert |
| Live AI feedback (3s debounce) | Complete | `LiveFeedbackService.generateLiveFeedback()`, `@Async`, HuggingFace API |
| Gibberish detection | Complete | `isGibberish()` — vowel/consonant-run heuristics |
| LLM consistency enforcement (3 rules) | Complete | `enforceConsistency()` in `LiveFeedbackService` |
| Live plagiarism detection — peer comparison | Complete | `RealtimeCheckService`, `SubmissionFetchService`, 200-answer cap |
| Live plagiarism detection — internet | Complete | `GoogleSearchService`, SerpAPI, corpus concatenation strategy |
| Ensemble similarity (4 algorithms) | Complete | `TextSimilarityService.calculateBestSimilarity()` |
| WebSocket plagiarism alerts | Complete | `WebSocketConfig`, `/topic/plagiarism-warnings/{sessionId}` |
| Atomic version snapshotting | Complete | `VersionService.createVersionSnapshot()`, same `@Transactional` |
| Idempotency guard on version creation | Complete | DB unique constraint + service-layer guard |
| Weighted AI mark formula | Complete | `AnswerScoreUtils.computeWeightedMark()`, verified by 11 unit tests |
| Deadline enforcement | Complete | `SubmissionService.submitSubmission()`, `DeadlineNotPassedException` |
| Post-deadline lecturer grading | Complete | `SubmissionService.gradeSubmission()`, dual write (answers + version) |
| Version history and diff viewing | Complete | `VersionService`, `VersionTimeline.tsx`, `DiffViewer.tsx` |
| Source categorisation (7 categories) | Complete | `RealtimeCheckService.categorizeSource()` |
| PDF report generation | Complete | `PdfReportGeneratorService` using Apache PDFBox 3.0.2 |
| JPlag code plagiarism (14 languages) | Complete | `JPlagService`, JPlag 5.1.0 |
| Docker Compose deployment | Complete | `docker-compose.yml` |
| Unit tests for mark formula | Complete | `WeightedMarkFormulaTest.java`, 11 test cases |

### Performance Metrics (from Configuration)

| Metric | Configured / Measured | Source |
|---|---|---|
| AI feedback latency (target) | 120s timeout (actual ~3–4s for Zephyr-7B) | `huggingface.timeout=120` |
| AI feedback debounce | 3,000 ms after last keystroke | `useAnswerEditor.ts` |
| Auto-save debounce | 5,000 ms after last keystroke | `useAnswerEditor.ts` |
| Minimum text for plagiarism check | 50 characters | `integrity.realtime.min-text-length=50` |
| Peer comparison cap | 200 most-recent answers per question | `AnswerService.getAnswersByQuestion()` |
| Internet search results | 3 results per query | `googleSearch.searchInternet(text, 3)` |
| Cache TTL (internet search) | 1 hour, 1000 entries max | `CacheConfig.java` |
| Cache TTL (AI feedback) | 7 days (Redis) | `ai.feedback.cache-ttl-days=7` |
| Concurrent AI feedback threads | 2 core / 5 max | `AsyncConfig.java` |
| Minimum word count (submit) | 10 words per answer | `submission.min-words-per-answer=10` |
| HikariCP pool size | 10 max / 5 min idle | `feedback-service/application.properties` |

### Key UI Screens (Descriptions)

**Student Answer Editor:**
The primary student interface presents each assignment question in a card with a two-column layout. The left column contains an auto-resizing text area with a colour-coded word-count progress bar (green when ≥80% of the target word count is reached, amber for 40–80%, red below 40%). The right column shows the Live Feedback Panel, which transitions from a ghost skeleton state to an animated loading indicator and then to four horizontal score bars (grammar, clarity, completeness, relevance) accompanied by colour-coded bullet points. A severity chip (LOW/MEDIUM/HIGH) appears below the text area after each plagiarism check.

**Lecturer Grading Interface:**
The grading page presents each question in order with the student's full answer text displayed in a read-only card above an input row containing the AI-suggested mark (pre-populated, greyed out) and an editable override field for the lecturer's mark. A feedback text area allows per-question qualitative comments. The AI mark suggestion is visually distinguished from the lecturer's mark to make clear which value originated from the automated system and which represents human judgement.

**Plagiarism Dashboard:**
The lecturer-facing plagiarism page shows a statistics header (total submissions, flagged count, percentage flagged) followed by a sortable table of flagged submissions. Each row expands to reveal the matched peer submissions and internet sources, with similarity percentages and source categories (ACADEMIC, ENCYCLOPEDIA, GOVERNMENT, EDUCATIONAL, NEWS, BLOG, TECH_COMMUNITY). A bulk re-check button processes submissions sequentially to respect SerpAPI rate limits.

### Integration Outcomes

The submission component integrates with the Projects & Tasks service (managed by a teammate) through the Next.js API layer. The `getAssignmentWithFallback()` function attempts three resolution paths in sequence: project-type assignments exposing main tasks, task-type assignments exposing subtasks, and a legacy direct API fallback. This three-path resolution ensures that regardless of how the assignment was created, the student's answer editor correctly renders the questions.

The integrity monitoring service integrates with the submission management service via a direct HTTP call to fetch peer answers for the same question. The `SubmissionFetchService` constructs the URL dynamically from `submission-service.url`, allowing the target URL to differ between local development (`http://localhost:8081`) and Docker Compose deployment (`http://submission-management-service:8081`).

---

## CONCLUSION SECTION

### What Was Achieved

This thesis describes the design, implementation, and testing of a Submission System with Version Control and AI-Enhanced Feedback Support within a collaborative Smart Learning Management System. The component was delivered as three deployable Spring Boot microservices and a Next.js frontend, implementing 24 REST API endpoints, five core JPA entity types across three database schemas, and four text similarity algorithms.

The key technical contributions are: (1) a real-time AI feedback pipeline using a large language model with deterministic prompt engineering and post-processing consistency enforcement rules; (2) a multi-algorithm ensemble plagiarism detection system combining term-frequency, set-overlap, and n-gram similarity measures for both peer-to-peer and internet-sourced plagiarism; (3) an atomic immutable versioning system integrated directly into the submission lifecycle to ensure snapshot consistency; and (4) a novel weighted mark formula that prioritises conceptual accuracy (relevance 40%, completeness 30%) over surface writing quality (clarity 15%, grammar 15%), verified through 11 unit test cases covering real-world assessment scenarios.

### Research Questions Answered

The component demonstrates that it is feasible to provide AI-generated feedback and plagiarism detection in sub-5-second latency during the submission composition phase, not merely as a post-submission batch process. This is achieved through a combination of debounced API triggering (3-second intervals), asynchronous thread pool execution, and stateless LLM service design that eliminates database write overhead from the critical feedback path.

The weighted mark formula demonstrates that a simple mathematical transform of LLM-generated dimension scores can produce fairer automated assessment than a flat average, specifically by ensuring that grammatical correctness does not compensate for conceptual incorrectness — a property verified formally through parameterised unit testing.

### Limitations Found

Several limitations were identified during implementation. First, the system relies on synchronous HTTP communication between services, meaning that a failure in the Integrity Monitoring Service interrupts the plagiarism check but does not impede submission. However, failures in the Submission Management Service cascade to affect all operations. Second, WebSocket session state is maintained in memory rather than a shared store (such as Redis), which means plagiarism alert delivery would be disrupted across service restarts in a multi-instance deployment. Third, the SerpAPI quota limits the number of internet similarity checks that can be performed in the free tier (100 searches per month), which would be insufficient for a production deployment with many concurrent students. Fourth, the AI feedback is only available in English, as the LLM (Zephyr-7B-Beta) has limited multilingual capability. Fifth, JWT signatures are not verified at the service layer, which requires the system to operate behind a trusted API gateway for security.

### Future Work Suggestions

Future development should consider the following enhancements. The synchronous inter-service communication should be replaced with an asynchronous message broker (such as Apache Kafka) to improve fault isolation and enable event-driven processing. WebSocket session state should be moved to a Redis-backed store to support multi-instance deployment behind a load balancer. The SerpAPI integration should be supplemented with result-level caching keyed on content hash to reduce quota consumption when multiple students write similar answers on the same topic. The AI feedback pipeline should be extended to support multilingual answers through a multilingual LLM such as BLOOM or a multilingual variant of Llama. Finally, an integration test suite against a containerised PostgreSQL instance should be added to complement the existing unit tests, ensuring that database schema migrations and JPA query correctness are verified as part of the continuous integration pipeline.

---

## APPENDIX: FILE REFERENCE TABLE

| Class / File | Service | Path | Primary Purpose |
|---|---|---|---|
| `AnswerScoreUtils.java` | SMS | `util/AnswerScoreUtils.java` | Weighted mark formula (canonical) |
| `AnswerService.java` | SMS | `service/AnswerService.java` | UPSERT, peer query, analysis persistence |
| `SubmissionService.java` | SMS | `service/SubmissionService.java` | Lifecycle, deadline, aggregate metrics |
| `VersionService.java` | SMS | `service/VersionService.java` | Snapshot creation, lecturer grading |
| `JwtUtils.java` | SMS | `util/JwtUtils.java` | Token parse, role extraction |
| `Submission.java` | SMS | `model/Submission.java` | Root aggregate entity |
| `Answer.java` | SMS | `model/Answer.java` | Per-question answer entity |
| `SubmissionVersion.java` | SMS | `model/SubmissionVersion.java` | Immutable version header |
| `VersionAnswer.java` | SMS | `model/VersionAnswer.java` | Frozen answer snapshot |
| `SubmissionController.java` | SMS | `controller/SubmissionController.java` | Submission REST API |
| `AnswerController.java` | SMS | `controller/AnswerController.java` | Answer REST API |
| `WeightedMarkFormulaTest.java` | SMS | `src/test/.../` | 11 unit tests for formula |
| `LiveFeedbackService.java` | FS | `service/LiveFeedbackService.java` | AI feedback pipeline (gibberish, prompt, parse, enforce) |
| `HuggingFaceService.java` | FS | `service/HuggingFaceService.java` | LLM HTTP client |
| `AsyncConfig.java` | FS | `config/AsyncConfig.java` | Thread pool (core=2, max=5) |
| `FeedbackController.java` | FS | `controller/FeedbackController.java` | Feedback REST API |
| `TextSimilarityService.java` | IMS | `service/TextSimilarityService.java` | 4 algorithms + internet similarity |
| `RealtimeCheckService.java` | IMS | `service/RealtimeCheckService.java` | Real-time pipeline, risk score, WebSocket |
| `IntegrityCheckService.java` | IMS | `service/IntegrityCheckService.java` | Batch check orchestration |
| `WebSocketConfig.java` | IMS | `config/WebSocketConfig.java` | STOMP endpoint `/ws/integrity` |
| `CacheConfig.java` | IMS | `config/CacheConfig.java` | Caffeine (3 caches, 1h TTL) |
| `PlagiarismCheck.java` | IMS | `model/PlagiarismCheck.java` | Plagiarism check entity (JSONB metadata) |
| `IntegrityCheckController.java` | IMS | `contoller/IntegrityCheckController.java` | Integrity REST API |
| `useAnswerEditor.ts` | FE | `hooks/useAnswerEditor.ts` | 3-timer debounce orchestration |
| `submission.types.ts` | FE | `types/submission.types.ts` | TypeScript interfaces |
| `docker-compose.yml` | Infra | root | 4-service Docker deployment |

*Abbreviations:* SMS = submission-management-service, FS = feedback-service, IMS = integrity-monitoring-service, FE = frontend

---

*[FLAG — Sections requiring manual screenshot insertion:]*
- *Figure 1: Screenshot of Student Answer Editor with Live Feedback Panel*
- *Figure 2: Screenshot of Plagiarism Warning (MEDIUM severity chip)*
- *Figure 3: Screenshot of Version Timeline showing two versions*
- *Figure 4: Screenshot of Diff Viewer between versions*
- *Figure 5: Screenshot of Lecturer Grading Interface*
- *Figure 6: Screenshot of Plagiarism Dashboard*
- *Figure 7: System Architecture Diagram (component diagram)*
- *Figure 8: Entity-Relationship Diagram for submission_schema*
- *Figure 9: Sequence Diagram — Student Submit flow*
- *Figure 10: Sequence Diagram — Real-time plagiarism check flow*

---

*End of Thesis Documentation*
*Student: IT22586766 | Project: 25-26J-468 | April 2026*
