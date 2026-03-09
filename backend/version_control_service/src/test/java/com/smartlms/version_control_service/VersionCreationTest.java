package com.smartlms.version_control_service;

import com.smartlms.version_control_service.config.VersionControlProperties;
import com.smartlms.version_control_service.dto.request.TextSnapshotRequest;
import com.smartlms.version_control_service.dto.response.VersionResponse;
import com.smartlms.version_control_service.model.SubmissionVersion;
import com.smartlms.version_control_service.repository.FileBlobRepository;
import com.smartlms.version_control_service.repository.SubmissionVersionRepository;
import com.smartlms.version_control_service.repository.VersionFileRepository;
import com.smartlms.version_control_service.service.VersionControlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for VersionControlService.createTextSnapshot().
 *
 * These tests are mocked — no real database required.
 * They verify the version-numbering and sequencing logic that answers:
 *   "Why is always only one version displayed?"
 *
 * Root causes tested:
 *   1. Does the second createTextSnapshot() compute the correct nextVersionNumber?
 *   2. Does findMaxVersionNumberBySubmissionId() get called with the right submissionId?
 *   3. Are both snapshots saved (repository.save called twice)?
 *   4. Do the two snapshots get different versionNumbers (1 and 2)?
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VersionCreationTest {

    @Mock
    private SubmissionVersionRepository versionRepository;
    @Mock
    private FileBlobRepository blobRepository;
    @Mock
    private VersionFileRepository versionFileRepository;
    @Mock
    private VersionControlProperties properties;

    private VersionControlService service;

    private static final Long SUBMISSION_ID = 42L;

    @BeforeEach
    void setUp() {
        when(properties.getSnapshotInterval()).thenReturn(10);
        service = new VersionControlService(versionRepository, blobRepository,
                versionFileRepository, properties);
    }

    // ─── Helper ───────────────────────────────────────────────

    /** Build a minimal TextSnapshotRequest for submissionId. */
    private TextSnapshotRequest makeRequest(String commitMessage) {
        return TextSnapshotRequest.builder()
                .submissionId(SUBMISSION_ID)
                .studentId("student-1")
                .commitMessage(commitMessage)
                .totalWordCount(150)
                .overallGrade(8.0)
                .maxGrade(10.0)
                .answers(List.of(
                        TextSnapshotRequest.AnswerSnapshot.builder()
                                .questionId("q1")
                                .questionText("What is OOP?")
                                .answerText("Object-Oriented Programming is a paradigm...")
                                .wordCount(10)
                                .grammarScore(8.0)
                                .clarityScore(7.5)
                                .completenessScore(8.0)
                                .relevanceScore(9.0)
                                .projectedGrade(8.0)
                                .maxPoints(10.0)
                                .build()
                ))
                .build();
    }

    /** Build a saved SubmissionVersion entity for mock return. */
    private SubmissionVersion savedVersion(int versionNumber) {
        return SubmissionVersion.builder()
                .id((long) versionNumber * 100)
                .submissionId(SUBMISSION_ID)
                .versionNumber(versionNumber)
                .commitHash("hash-" + versionNumber)
                .createdAt(LocalDateTime.now())
                .isSnapshot(true)
                .build();
    }

    // ─── Tests ─────────────────────────────────────────────────

    /**
     * TEST 1: First submit → versionNumber should be 1.
     *
     * When no snapshots exist, findMaxVersionNumberBySubmissionId returns 0.
     * nextVersionNumber = 0 + 1 = 1. First snapshot gets versionNumber=1.
     */
    @Test
    @DisplayName("First submit creates version 1")
    void firstSubmit_createsVersionOne() {
        // Given: no snapshots exist yet
        when(versionRepository.findMaxVersionNumberBySubmissionId(SUBMISSION_ID)).thenReturn(0);
        when(versionRepository.findLatestVersionBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
        when(versionRepository.save(any())).thenAnswer(inv -> {
            SubmissionVersion v = inv.getArgument(0);
            v.setId(1L);
            return v;
        });

        // When
        VersionResponse result = service.createTextSnapshot(makeRequest("v1"));

        // Then: snapshot was saved with versionNumber=1
        ArgumentCaptor<SubmissionVersion> captor = ArgumentCaptor.forClass(SubmissionVersion.class);
        verify(versionRepository).save(captor.capture());
        SubmissionVersion saved = captor.getValue();

        System.out.println("[TEST 1] Saved versionNumber = " + saved.getVersionNumber());
        assertThat(saved.getVersionNumber()).isEqualTo(1);
        assertThat(saved.getSubmissionId()).isEqualTo(SUBMISSION_ID);
        assertThat(saved.getMetadata()).containsKey("type");
        assertThat(saved.getMetadata().get("type")).isEqualTo("TEXT_SUBMISSION");
    }

    /**
     * TEST 2: Second submit → versionNumber should be 2.
     *
     * When v1 already exists, findMaxVersionNumberBySubmissionId returns 1.
     * nextVersionNumber = 1 + 1 = 2. Second snapshot gets versionNumber=2.
     */
    @Test
    @DisplayName("Second submit creates version 2")
    void secondSubmit_createsVersionTwo() {
        // Given: v1 already exists
        SubmissionVersion existingV1 = savedVersion(1);
        when(versionRepository.findMaxVersionNumberBySubmissionId(SUBMISSION_ID)).thenReturn(1);
        when(versionRepository.findLatestVersionBySubmissionId(SUBMISSION_ID))
                .thenReturn(Optional.of(existingV1));
        when(versionRepository.save(any())).thenAnswer(inv -> {
            SubmissionVersion v = inv.getArgument(0);
            v.setId(2L);
            return v;
        });

        // When
        VersionResponse result = service.createTextSnapshot(makeRequest("v2"));

        // Then: snapshot was saved with versionNumber=2
        ArgumentCaptor<SubmissionVersion> captor = ArgumentCaptor.forClass(SubmissionVersion.class);
        verify(versionRepository).save(captor.capture());
        SubmissionVersion saved = captor.getValue();

        System.out.println("[TEST 2] Saved versionNumber = " + saved.getVersionNumber());
        System.out.println("[TEST 2] parentVersionId = " + saved.getParentVersionId());
        assertThat(saved.getVersionNumber()).isEqualTo(2);
        assertThat(saved.getParentVersionId()).isEqualTo(existingV1.getId());
    }

    /**
     * TEST 3: Two sequential calls (first + second submit) must each call
     * findMaxVersionNumberBySubmissionId once, and save() must be called twice.
     * The version numbers must be 1 and 2 respectively.
     *
     * This simulates the complete resubmission scenario.
     */
    @Test
    @DisplayName("Sequential first + second submit produce versions 1 and 2")
    void sequentialSubmits_produceSequentialVersionNumbers() {
        // First call: no snapshots yet
        when(versionRepository.findMaxVersionNumberBySubmissionId(SUBMISSION_ID))
                .thenReturn(0)     // first call → v1
                .thenReturn(1);    // second call → v2
        when(versionRepository.findLatestVersionBySubmissionId(SUBMISSION_ID))
                .thenReturn(Optional.empty())
                .thenAnswer(inv -> Optional.of(savedVersion(1)));
        when(versionRepository.save(any())).thenAnswer(inv -> {
            SubmissionVersion v = inv.getArgument(0);
            v.setId((long) v.getVersionNumber() * 100);
            return v;
        });

        // When: student submits twice
        VersionResponse v1Result = service.createTextSnapshot(makeRequest("First submit v1"));
        VersionResponse v2Result = service.createTextSnapshot(makeRequest("Second submit v2"));

        // Then
        ArgumentCaptor<SubmissionVersion> captor = ArgumentCaptor.forClass(SubmissionVersion.class);
        verify(versionRepository, times(2)).save(captor.capture());

        List<SubmissionVersion> captured = captor.getAllValues();
        int firstVersionNumber  = captured.get(0).getVersionNumber();
        int secondVersionNumber = captured.get(1).getVersionNumber();

        System.out.println("[TEST 3] First snapshot versionNumber  = " + firstVersionNumber);
        System.out.println("[TEST 3] Second snapshot versionNumber = " + secondVersionNumber);

        assertThat(firstVersionNumber).isEqualTo(1);
        assertThat(secondVersionNumber).isEqualTo(2);
        assertThat(secondVersionNumber).isGreaterThan(firstVersionNumber);

        // findMax must have been called twice (once per submit)
        verify(versionRepository, times(2))
                .findMaxVersionNumberBySubmissionId(SUBMISSION_ID);
    }

    /**
     * TEST 4: findMaxVersionNumberBySubmissionId is called with the correct
     * submissionId (Long, not Integer or String).
     *
     * A type mismatch could cause the query to always return 0 and thus always
     * create versionNumber=1, making every snapshot appear as v1.
     */
    @Test
    @DisplayName("findMaxVersionNumberBySubmissionId receives correct Long submissionId")
    void findMax_receivesCorrectType() {
        when(versionRepository.findMaxVersionNumberBySubmissionId(SUBMISSION_ID)).thenReturn(3);
        when(versionRepository.findLatestVersionBySubmissionId(SUBMISSION_ID))
                .thenReturn(Optional.of(savedVersion(3)));
        when(versionRepository.save(any())).thenAnswer(inv -> {
            SubmissionVersion v = inv.getArgument(0);
            v.setId(4L);
            return v;
        });

        service.createTextSnapshot(makeRequest("v4"));

        // Verify the exact value (and type — Mockito uses equals(), so Long 42 ≠ Integer 42)
        verify(versionRepository).findMaxVersionNumberBySubmissionId(eq(42L));

        ArgumentCaptor<SubmissionVersion> captor = ArgumentCaptor.forClass(SubmissionVersion.class);
        verify(versionRepository).save(captor.capture());
        System.out.println("[TEST 4] versionNumber saved = " + captor.getValue().getVersionNumber());
        assertThat(captor.getValue().getVersionNumber()).isEqualTo(4);
    }

    /**
     * TEST 5: getVersionsBySubmissionId returns ALL versions (not just the latest).
     *
     * Verifies that the query fetches the complete list so the frontend can
     * display multiple versions in the timeline.
     */
    @Test
    @DisplayName("getVersionsBySubmissionId returns all versions ordered descending")
    void getVersionsBySubmissionId_returnsAll() {
        // Given: 3 versions exist in DB
        List<SubmissionVersion> dbVersions = List.of(
                savedVersion(3),
                savedVersion(2),
                savedVersion(1)
        );
        when(versionRepository.findBySubmissionIdOrderByVersionNumberDesc(SUBMISSION_ID))
                .thenReturn(dbVersions);

        // When
        List<VersionResponse> result = service.getVersionsBySubmissionId(SUBMISSION_ID);

        System.out.println("[TEST 5] Returned " + result.size() + " versions:");
        result.forEach(v -> System.out.println("  versionNumber=" + v.getVersionNumber()));

        assertThat(result).hasSize(3);
        assertThat(result.get(0).getVersionNumber()).isEqualTo(3); // newest first
        assertThat(result.get(1).getVersionNumber()).isEqualTo(2);
        assertThat(result.get(2).getVersionNumber()).isEqualTo(1);
    }

    /**
     * TEST 6: Metadata is stored correctly in the snapshot.
     *
     * If metadata is null or missing keys, the frontend can't extract
     * answers/scores from the version and shows blank cards.
     */
    @Test
    @DisplayName("Text snapshot metadata contains type, answers, and grade fields")
    void textSnapshot_metadataIsComplete() {
        when(versionRepository.findMaxVersionNumberBySubmissionId(SUBMISSION_ID)).thenReturn(0);
        when(versionRepository.findLatestVersionBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
        when(versionRepository.save(any())).thenAnswer(inv -> {
            SubmissionVersion v = inv.getArgument(0);
            v.setId(1L);
            return v;
        });

        service.createTextSnapshot(makeRequest("v1"));

        ArgumentCaptor<SubmissionVersion> captor = ArgumentCaptor.forClass(SubmissionVersion.class);
        verify(versionRepository).save(captor.capture());
        var metadata = captor.getValue().getMetadata();

        System.out.println("[TEST 6] Metadata keys = " + metadata.keySet());

        assertThat(metadata).containsKey("type");
        assertThat(metadata).containsKey("answers");
        assertThat(metadata).containsKey("overallGrade");
        assertThat(metadata).containsKey("maxGrade");
        assertThat(metadata).containsKey("totalWordCount");
        assertThat(metadata.get("type")).isEqualTo("TEXT_SUBMISSION");

        @SuppressWarnings("unchecked")
        var answers = (java.util.List<?>) metadata.get("answers");
        System.out.println("[TEST 6] answers count in metadata = " + answers.size());
        assertThat(answers).hasSize(1);
    }
}
