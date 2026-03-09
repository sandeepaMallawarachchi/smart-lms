package com.smartlms.submission_management_service;

import com.smartlms.submission_management_service.dto.response.SubmissionResponse;
import com.smartlms.submission_management_service.model.Answer;
import com.smartlms.submission_management_service.model.Submission;
import com.smartlms.submission_management_service.model.SubmissionStatus;
import com.smartlms.submission_management_service.model.SubmissionType;
import com.smartlms.submission_management_service.repository.AnswerRepository;
import com.smartlms.submission_management_service.repository.SubmissionRepository;
import com.smartlms.submission_management_service.service.SubmissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SubmissionService.submitSubmission() in the context of resubmission.
 *
 * Root causes tested:
 *   1. Does submitSubmission() work when status is already SUBMITTED (resubmission)?
 *   2. Does versionNumber increment correctly on each submit?
 *   3. Does totalVersions increment correctly on each submit?
 *   4. Does the deadline check block resubmission ONLY when the deadline has passed?
 *   5. Is totalVersions returned in SubmissionResponse (needed by frontend)?
 */
@ExtendWith(MockitoExtension.class)
class ResubmissionTest {

    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private AnswerRepository answerRepository;
    @Mock
    private RestTemplate restTemplate;

    private SubmissionService service;

    @BeforeEach
    void setUp() {
        service = new SubmissionService(submissionRepository, answerRepository, restTemplate);
    }

    // ─── Helpers ───────────────────────────────────────────────

    /** Build a Submission in SUBMITTED state (as it would be after first submit). */
    private Submission submittedSubmission(Long id, Integer versionNumber, Integer totalVersions,
                                           LocalDateTime dueDate) {
        return Submission.builder()
                .id(id)
                .title("Test Assignment")
                .studentId("student-1")
                .studentName("Test Student")
                .assignmentId("assignment-123")
                .submissionType(SubmissionType.ASSIGNMENT)
                .status(SubmissionStatus.SUBMITTED)
                .versionNumber(versionNumber)
                .totalVersions(totalVersions)
                .dueDate(dueDate)
                .submittedAt(LocalDateTime.now().minusHours(1))
                .build();
    }

    /** Build a DRAFT submission (as it would be when first created). */
    private Submission draftSubmission(Long id, LocalDateTime dueDate) {
        return Submission.builder()
                .id(id)
                .title("Test Assignment")
                .studentId("student-1")
                .studentName("Test Student")
                .assignmentId("assignment-123")
                .submissionType(SubmissionType.ASSIGNMENT)
                .status(SubmissionStatus.DRAFT)
                .versionNumber(0)   // createSubmission sets this to 0
                .totalVersions(0)   // starts at 0
                .dueDate(dueDate)
                .build();
    }

    /** Build a minimal Answer row. */
    private Answer answerWithContent(String questionId) {
        Answer a = new Answer();
        a.setQuestionId(questionId);
        a.setAnswerText("This is a test answer with enough content.");
        a.setWordCount(9);
        a.setGrammarScore(8.0);
        a.setClarityScore(7.5);
        a.setCompletenessScore(7.0);
        a.setRelevanceScore(8.5);
        return a;
    }

    // ─── Tests ─────────────────────────────────────────────────

    /**
     * TEST 1: First submit — DRAFT → SUBMITTED.
     * versionNumber: 1 → 2. totalVersions: 0 → 1.
     */
    @Test
    @DisplayName("First submit transitions DRAFT to SUBMITTED and sets totalVersions=1")
    void firstSubmit_draftToSubmitted() {
        LocalDateTime futureDeadline = LocalDateTime.now().plusDays(7);
        Submission draft = draftSubmission(1L, futureDeadline);

        when(submissionRepository.findById(1L)).thenReturn(Optional.of(draft));
        when(answerRepository.findBySubmissionIdOrderByQuestionId("1"))
                .thenReturn(List.of(answerWithContent("q1")));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SubmissionResponse result = service.submitSubmission(1L);

        ArgumentCaptor<Submission> captor = ArgumentCaptor.forClass(Submission.class);
        verify(submissionRepository).save(captor.capture());
        Submission saved = captor.getValue();

        System.out.println("[TEST 1] status        = " + saved.getStatus());
        System.out.println("[TEST 1] versionNumber = " + saved.getVersionNumber());
        System.out.println("[TEST 1] totalVersions = " + saved.getTotalVersions());

        assertThat(saved.getStatus()).isEqualTo(SubmissionStatus.SUBMITTED);
        assertThat(saved.getVersionNumber()).isEqualTo(1);  // 0+1
        assertThat(saved.getTotalVersions()).isEqualTo(1);  // 0+1
        assertThat(result.getTotalVersions()).isEqualTo(1); // returned in response
    }

    /**
     * TEST 2: Second submit — SUBMITTED → SUBMITTED (resubmission before deadline).
     * versionNumber: 2 → 3. totalVersions: 1 → 2.
     *
     * This is the key test — if this fails, it means the backend blocks resubmission,
     * which is why only one version is ever created.
     */
    @Test
    @DisplayName("Second submit (resubmission before deadline) increments totalVersions to 2")
    void secondSubmit_resubmissionBeforeDeadline_allowed() {
        LocalDateTime futureDeadline = LocalDateTime.now().plusDays(7);
        // Submission is already SUBMITTED (after first submit), versionNumber=2, totalVersions=1
        Submission submitted = submittedSubmission(1L, 2, 1, futureDeadline);

        when(submissionRepository.findById(1L)).thenReturn(Optional.of(submitted));
        when(answerRepository.findBySubmissionIdOrderByQuestionId("1"))
                .thenReturn(List.of(answerWithContent("q1")));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Should NOT throw — resubmission before deadline is allowed
        SubmissionResponse result = service.submitSubmission(1L);

        ArgumentCaptor<Submission> captor = ArgumentCaptor.forClass(Submission.class);
        verify(submissionRepository).save(captor.capture());
        Submission saved = captor.getValue();

        System.out.println("[TEST 2] status        = " + saved.getStatus());
        System.out.println("[TEST 2] versionNumber = " + saved.getVersionNumber());
        System.out.println("[TEST 2] totalVersions = " + saved.getTotalVersions());

        assertThat(saved.getStatus()).isEqualTo(SubmissionStatus.SUBMITTED);
        assertThat(saved.getVersionNumber()).isEqualTo(3);  // 2+1
        assertThat(saved.getTotalVersions()).isEqualTo(2);  // 1+1
        assertThat(result.getTotalVersions()).isEqualTo(2); // CRITICAL: frontend uses this for snapshot commit message
    }

    /**
     * TEST 3: Resubmission AFTER deadline on an already-SUBMITTED submission → BLOCKED.
     * This is expected behavior — not a bug.
     */
    @Test
    @DisplayName("Resubmission after deadline is blocked for already-SUBMITTED submission")
    void resubmission_afterDeadline_blocked() {
        LocalDateTime pastDeadline = LocalDateTime.now().minusDays(1);
        Submission submitted = submittedSubmission(1L, 2, 1, pastDeadline);

        when(submissionRepository.findById(1L)).thenReturn(Optional.of(submitted));
        when(answerRepository.findBySubmissionIdOrderByQuestionId("1"))
                .thenReturn(List.of(answerWithContent("q1")));

        assertThatThrownBy(() -> service.submitSubmission(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Deadline has passed");

        System.out.println("[TEST 3] Correctly blocked resubmission after deadline.");
        verify(submissionRepository, never()).save(any());
    }

    /**
     * TEST 4: Initial (late) submission AFTER deadline — allowed (isLate=true).
     * A DRAFT submission can always be submitted for the first time, even if late.
     */
    @Test
    @DisplayName("Initial submission after deadline is allowed but marked as LATE")
    void initialSubmission_afterDeadline_allowedAsLate() {
        LocalDateTime pastDeadline = LocalDateTime.now().minusDays(1);
        Submission draft = draftSubmission(1L, pastDeadline);

        when(submissionRepository.findById(1L)).thenReturn(Optional.of(draft));
        when(answerRepository.findBySubmissionIdOrderByQuestionId("1"))
                .thenReturn(List.of(answerWithContent("q1")));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Should succeed but mark as LATE
        SubmissionResponse result = service.submitSubmission(1L);

        ArgumentCaptor<Submission> captor = ArgumentCaptor.forClass(Submission.class);
        verify(submissionRepository).save(captor.capture());
        Submission saved = captor.getValue();

        System.out.println("[TEST 4] status  = " + saved.getStatus());
        System.out.println("[TEST 4] isLate  = " + saved.getIsLate());

        assertThat(saved.getStatus()).isEqualTo(SubmissionStatus.LATE);
        assertThat(saved.getIsLate()).isTrue();
        assertThat(saved.getTotalVersions()).isEqualTo(1);
    }

    /**
     * TEST 5: totalVersions is included in SubmissionResponse.
     *
     * The frontend reads `submittedResult.totalVersions` to build the commit message
     * for the text snapshot (e.g., "Assignment — v2").
     * If totalVersions is null in the response, the frontend falls back to
     * versionNumber which is WRONG (versionNumber=3 for second submit, not 2).
     */
    @Test
    @DisplayName("SubmissionResponse includes non-null totalVersions after submit")
    void submissionResponse_includesTotalVersions() {
        LocalDateTime futureDeadline = LocalDateTime.now().plusDays(7);
        Submission draft = draftSubmission(1L, futureDeadline);

        when(submissionRepository.findById(1L)).thenReturn(Optional.of(draft));
        when(answerRepository.findBySubmissionIdOrderByQuestionId("1"))
                .thenReturn(List.of(answerWithContent("q1")));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SubmissionResponse result = service.submitSubmission(1L);

        System.out.println("[TEST 5] result.totalVersions = " + result.getTotalVersions());
        System.out.println("[TEST 5] result.versionNumber = " + result.getVersionNumber());

        // totalVersions MUST be non-null and equal to 1 (first submit)
        assertThat(result.getTotalVersions()).isNotNull();
        assertThat(result.getTotalVersions()).isEqualTo(1);

        // versionNumber is 1 (0+1) after first submit
        assertThat(result.getVersionNumber()).isEqualTo(1);
    }

    /**
     * TEST 6: Third submit — version chain 1→2→3 with no deadline.
     * Verifies totalVersions is reliable across multiple resubmissions.
     */
    @Test
    @DisplayName("Third submit produces totalVersions=3")
    void thirdSubmit_totalVersionsEqualsThree() {
        // Submission after two previous submits: versionNumber=3, totalVersions=2
        Submission submitted = submittedSubmission(1L, 3, 2, null); // null dueDate = no deadline

        when(submissionRepository.findById(1L)).thenReturn(Optional.of(submitted));
        when(answerRepository.findBySubmissionIdOrderByQuestionId("1"))
                .thenReturn(List.of(answerWithContent("q1")));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SubmissionResponse result = service.submitSubmission(1L);

        ArgumentCaptor<Submission> captor = ArgumentCaptor.forClass(Submission.class);
        verify(submissionRepository).save(captor.capture());
        Submission saved = captor.getValue();

        System.out.println("[TEST 6] versionNumber = " + saved.getVersionNumber() + " (expected 4)");
        System.out.println("[TEST 6] totalVersions = " + saved.getTotalVersions() + " (expected 3)");

        assertThat(saved.getVersionNumber()).isEqualTo(4);
        assertThat(saved.getTotalVersions()).isEqualTo(3);
        assertThat(result.getTotalVersions()).isEqualTo(3);
    }
}
