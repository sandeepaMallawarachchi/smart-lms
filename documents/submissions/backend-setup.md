# Submission System — Backend Setup Guide

**Module:** Submission System (IT22586766)
**Updated:** 2026-03-02

This guide is for backend developers implementing the 4 Spring Boot microservices.

---

## Services Summary

| Service | Port | Tech | Responsibility |
|---------|------|------|----------------|
| Submission Management | 8081 | Spring Boot 3 + JPA | Submissions, assignments, text answers, grading |
| Version Control | 8082 | Spring Boot 3 + JPA | File versions, diffs, download |
| AI Feedback | 8083 | Spring Boot 3 + HuggingFace | AI analysis (async + live) |
| Plagiarism / Integrity | 8084 | Spring Boot 3 | Similarity detection (full + real-time) |

---

## Common Setup (All 4 Services)

### `application.properties` requirements

```properties
# CORS — must allow the Next.js frontend
spring.web.cors.allowed-origins=http://localhost:3000
spring.web.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
spring.web.cors.allowed-headers=*
spring.web.cors.allow-credentials=true

# Server port — different per service
server.port=8081

# JWT secret — must match what the auth service uses to sign tokens
jwt.secret=${JWT_SECRET}
```

### JWT Validation

Each service must validate the `Authorization: Bearer <token>` header on every request.

```java
// In a JwtFilter or SecurityConfig:
// 1. Extract token from Authorization header
// 2. Validate signature using the shared JWT_SECRET
// 3. Extract userId and userRole from claims
// 4. Populate SecurityContext

// JWT claims to expect:
// payload.userId   — MongoDB _id of the user
// payload.userRole — "student" or "lecture"
// payload.email    — user email
```

### Response format for errors

```java
// Return this on any error — frontend reads .message field
{
    "success": false,
    "message": "Submission not found",
    "errors": { "submissionId": ["No submission found with ID 'abc'"] }
}
```

### CORS Config (Global — Java)

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("http://localhost:3000")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

---

## Service 1 — Submission Management (port 8081)

### Key Entities

#### `Submission.java`

```java
@Entity
@Table(schema = "submission_schema", name = "submissions")
public class Submission {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String studentId;          // MongoDB _id from auth service JWT

    private String studentName;
    private String studentEmail;
    private String studentRegistrationId;

    @Column(nullable = false)
    private String assignmentId;

    private String assignmentTitle;
    private String moduleCode;
    private String moduleName;

    @Enumerated(EnumType.STRING)
    private SubmissionStatus status;   // DRAFT, SUBMITTED, GRADED, LATE, PENDING_REVIEW, FLAGGED

    private String title;
    private String comments;

    @OneToMany(cascade = CascadeType.ALL)
    private List<SubmissionFile> files;

    private Integer currentVersionNumber;
    private Integer totalVersions;

    private Double grade;
    private Integer totalMarks;
    private Double plagiarismScore;
    private Double aiScore;
    private Integer wordCount;

    private LocalDateTime submittedAt;
    private LocalDateTime gradedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Boolean isLate;
    private LocalDateTime dueDate;

    private String lecturerFeedback;
    private String lecturerName;
    private String aiFeedbackId;
}
```

**`SubmissionStatus` enum:**
```java
public enum SubmissionStatus {
    DRAFT, SUBMITTED, GRADED, LATE, PENDING_REVIEW, FLAGGED
}
```

---

#### `Answer.java`

```java
@Entity
@Table(schema = "submission_schema", name = "answers",
    uniqueConstraints = @UniqueConstraint(columnNames = {"submission_id", "question_id"}))
public class Answer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private String submissionId;

    @Column(name = "question_id", nullable = false)
    private String questionId;

    @Column(columnDefinition = "TEXT")
    private String questionText;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String answerText;

    private Integer wordCount;
    private Integer characterCount;

    @Column(nullable = false)
    private LocalDateTime lastModified;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        lastModified = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        lastModified = LocalDateTime.now();
    }
}
```

---

#### `AnswerRepository.java`

```java
public interface AnswerRepository extends JpaRepository<Answer, Long> {
    List<Answer> findBySubmissionId(String submissionId);
    Optional<Answer> findBySubmissionIdAndQuestionId(String submissionId, String questionId);
}
```

---

### Key Endpoints

#### `SubmissionController.java`

```java
@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    // GET /api/submissions
    // Params: studentId?, assignmentId?, status?, page?, size?
    // Returns: Submission[] OR Page<Submission>
    @GetMapping
    public ResponseEntity<?> getSubmissions(
        @RequestParam(required = false) String studentId,
        @RequestParam(required = false) String assignmentId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Integer page,
        @RequestParam(required = false) Integer size
    ) { ... }

    // GET /api/submissions/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Submission> getSubmission(@PathVariable String id) { ... }

    // POST /api/submissions
    @PostMapping
    public ResponseEntity<Submission> createSubmission(@RequestBody CreateSubmissionRequest req) { ... }

    // PUT /api/submissions/{id}
    @PutMapping("/{id}")
    public ResponseEntity<Submission> updateSubmission(
        @PathVariable String id, @RequestBody UpdateSubmissionRequest req) { ... }

    // POST /api/submissions/{id}/submit
    // Logic: status = SUBMITTED (or LATE if past dueDate), submittedAt = now()
    @PostMapping("/{id}/submit")
    public ResponseEntity<Submission> submitSubmission(@PathVariable String id) { ... }

    // DELETE /api/submissions/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSubmission(@PathVariable String id) { ... }

    // POST /api/submissions/{submissionId}/files
    @PostMapping("/{submissionId}/files")
    public ResponseEntity<Submission> uploadFiles(
        @PathVariable String submissionId,
        @RequestParam("files") List<MultipartFile> files) { ... }

    // POST /api/submissions/{id}/grade
    // Logic: status = GRADED, gradedAt = now(), grade + lecturerFeedback stored
    @PostMapping("/{id}/grade")
    public ResponseEntity<Submission> gradeSubmission(
        @PathVariable String id, @RequestBody GradeSubmissionRequest req) { ... }
}
```

---

#### `AnswerController.java`

```java
@RestController
@RequestMapping("/api/submissions")
public class AnswerController {

    // PUT /api/submissions/{submissionId}/answers/{questionId}
    // Logic: upsert — find by (submissionId, questionId), update or create
    @PutMapping("/{submissionId}/answers/{questionId}")
    public ResponseEntity<Answer> saveAnswer(
        @PathVariable String submissionId,
        @PathVariable String questionId,
        @RequestBody SaveAnswerRequest req) { ... }

    // GET /api/submissions/{submissionId}/answers
    // Returns empty list if no answers
    @GetMapping("/{submissionId}/answers")
    public ResponseEntity<List<Answer>> getAnswers(@PathVariable String submissionId) { ... }
}
```

---

#### `AnswerService.java` — Upsert Logic

```java
public Answer saveAnswer(String submissionId, String questionId, SaveAnswerRequest req) {
    Optional<Answer> existing = answerRepo.findBySubmissionIdAndQuestionId(submissionId, questionId);

    Answer answer = existing.orElse(new Answer());
    answer.setSubmissionId(submissionId);
    answer.setQuestionId(questionId);
    answer.setAnswerText(req.getAnswerText());
    answer.setQuestionText(req.getQuestionText());
    answer.setWordCount(req.getWordCount());
    answer.setCharacterCount(req.getCharacterCount());
    answer.setLastModified(LocalDateTime.now());

    return answerRepo.save(answer);
}
```

---

### Assignment Entity (brief)

The `Assignment` entity must include a `questions` field (one-to-many or embedded list):

```java
@OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
@JoinColumn(name = "assignment_id")
private List<Question> questions = new ArrayList<>();
```

`Question` entity fields: `id`, `assignmentId`, `text`, `description`, `order`, `expectedWordCount`, `maxWordCount`, `isRequired`.

> **Critical:** `GET /api/assignments/{id}` and `GET /api/assignments` must always serialize `questions`. Return `[]` if none.

---

### Submit Logic — Late Detection

```java
public Submission submitSubmission(String id) {
    Submission sub = submissionRepo.findById(id).orElseThrow();
    LocalDateTime now = LocalDateTime.now();

    // Look up assignment to check due date
    Assignment assignment = assignmentRepo.findById(sub.getAssignmentId()).orElseThrow();

    boolean isLate = now.isAfter(assignment.getDueDate());

    sub.setStatus(isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED);
    sub.setIsLate(isLate);
    sub.setSubmittedAt(now);

    return submissionRepo.save(sub);
}
```

---

## Service 2 — Version Control (port 8082)

### Key Entities

```java
@Entity
public class SubmissionVersion {
    private String id;
    private String submissionId;
    private Integer versionNumber;

    @OneToMany(cascade = CascadeType.ALL)
    private List<VersionFile> files;

    private Integer wordCount;
    private Double plagiarismScore;
    private Double aiScore;
    private String changes;
    private String commitMessage;
    private LocalDateTime createdAt;
    private Boolean isSubmitted;
    private String aiFeedback;
    private String plagiarismDetails;
}
```

### Controller

```java
@RestController
@RequestMapping("/api/versions")
public class VersionController {

    @GetMapping                          // ?submissionId=
    @GetMapping("/{id}")
    @GetMapping("/latest")               // ?submissionId=
    @GetMapping("/compare")              // ?v1=&v2=  → returns VersionComparison
    @PostMapping                         // multipart: submissionId, commitMessage, files[]
    @GetMapping("/{versionId}/download") // → ResponseEntity<byte[]> application/zip
}
```

### Version Comparison Response

```java
public class VersionComparison {
    private SubmissionVersion versionA;
    private SubmissionVersion versionB;
    private List<FileDiff> diffs;
    private Integer wordCountChange;
    private Double aiScoreChange;
    private Double plagiarismChange;
}

public class FileDiff {
    private String fileName;
    private Integer additions;
    private Integer deletions;
    private List<DiffHunk> hunks;
}

public class DiffHunk {
    private Integer oldStart;
    private Integer newStart;
    private List<DiffLine> lines;
}

public class DiffLine {
    private String type;    // "add" | "remove" | "context"
    private String content;
    private Integer lineNumber;
}
```

---

## Service 3 — AI Feedback (port 8083)

### HuggingFace Setup

```properties
# application.properties
huggingface.api.key=${HUGGINGFACE_API_KEY}
huggingface.model=mistralai/Mistral-7B-Instruct-v0.2
huggingface.api.url=https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2
```

### Key Entities

```java
public enum FeedbackStatus { PENDING, PROCESSING, COMPLETED, FAILED }

@Entity
public class Feedback {
    private String id;
    private String submissionId;
    private String versionId;
    private FeedbackStatus status;
    private String overallAssessment;

    @ElementCollection
    private List<String> strengths;

    @ElementCollection
    private List<String> improvements;

    @ElementCollection
    private List<String> recommendations;

    // FeedbackScore embedded
    private Double overallScore;
    private Double correctnessScore;
    private Double styleScore;

    // Per-question feedback (serialized as JSON)
    @Column(columnDefinition = "TEXT")
    private String questionFeedbackJson;

    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private String processingError;
}
```

### Live Feedback Endpoint

```java
@PostMapping("/live")
public ResponseEntity<LiveFeedbackResponse> generateLiveFeedback(
    @RequestBody LiveFeedbackRequest req) {

    // Call HuggingFace synchronously
    // If HuggingFace fails → return fallback (DO NOT throw 500)
    // Response must include questionId echoed from request
}
```

**`LiveFeedbackRequest`:**
```java
public class LiveFeedbackRequest {
    @NotBlank private String questionId;
    @NotBlank private String answerText;
    private String questionPrompt;
    private Integer expectedWordCount;
}
```

**`LiveFeedbackResponse`:**
```java
public class LiveFeedbackResponse {
    private String questionId;     // echoed from request
    private double grammarScore;       // 0.0 – 10.0
    private double clarityScore;       // 0.0 – 10.0
    private double completenessScore;  // 0.0 – 10.0
    private double relevanceScore;     // 0.0 – 10.0
    private List<String> suggestions;  // 2 items
    private List<String> strengths;    // 2 items
    private List<String> improvements; // 2 items
    private String generatedAt;        // ISO-8601
}
```

**Fallback response when HuggingFace is unavailable:**
```java
return LiveFeedbackResponse.builder()
    .questionId(req.getQuestionId())
    .grammarScore(5.0)
    .clarityScore(5.0)
    .completenessScore(5.0)
    .relevanceScore(5.0)
    .strengths(List.of("Your answer shows effort", "Continue developing your ideas"))
    .improvements(List.of("Consider expanding your explanation", "Add specific examples"))
    .suggestions(List.of("Review the question requirements", "Check your word count target"))
    .generatedAt(LocalDateTime.now().toString())
    .build();
```

---

## Service 4 — Plagiarism / Integrity (port 8084)

### Key Entities

```java
public enum PlagiarismStatus { PENDING, PROCESSING, COMPLETED, FAILED }
public enum PlagiarismReviewStatus { PENDING_REVIEW, REVIEWED, FALSE_POSITIVE, CONFIRMED }

@Entity
public class PlagiarismReport {
    private String id;
    private String submissionId;
    private String versionId;
    private Double overallScore;  // 0-100
    private PlagiarismStatus status;
    private PlagiarismReviewStatus reviewStatus;
    private Integer sourcesChecked;
    private Integer matchesFound;

    @OneToMany(cascade = CascadeType.ALL)
    private List<PlagiarismMatch> topMatches;

    private String details;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private String reviewNotes;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
```

### Real-Time Check Endpoint

```java
@PostMapping("/integrity/realtime/check")
public ResponseEntity<RealtimeCheckResponse> realtimeCheck(
    @RequestBody RealtimeCheckRequest req) {
    // ...
}
```

**Request:**
```java
public class RealtimeCheckRequest {
    private String sessionId;
    private String studentId;
    private Long questionId;       // ← MUST be Long
    private String textContent;
    private String questionText;
    private String questionType;   // "TEXT"
}
```

**Response:**
```java
public class RealtimeCheckResponse {
    private String sessionId;
    private Double similarityScore;  // ← MUST be 0.0 – 1.0 range
    private Boolean flagged;         // true if score >= 0.70
    private String matchedText;      // optional excerpt
}
```

> The frontend converts `0.0–1.0` to `0–100%` for display. If you return `0–100` directly the UI will show `7000%`.

---

## Development Checklist

Before merging a service, verify:

- [ ] `server.port` set correctly (8081/8082/8083/8084)
- [ ] CORS configured for `http://localhost:3000`
- [ ] JWT validation filter in place
- [ ] All dates serialized as ISO-8601 strings (not timestamp numbers)
- [ ] `null` fields included in JSON output (not omitted) — use `@JsonInclude(ALWAYS)` or equivalent
- [ ] Error responses use `{ success: false, message: "..." }` format
- [ ] 204 No Content returned for DELETE and void PUT
- [ ] `GET /api/assignments/{id}` includes `questions: []`
- [ ] `POST /api/feedback/live` — synchronous, never returns 500, has fallback
- [ ] `questionId` in realtime check is `Long` type
- [ ] `similarityScore` in realtime response is `0.0–1.0`
- [ ] `POST /api/submissions/{id}/submit` auto-detects late submissions
