package com.example.integrity_monitoring_service.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "similarity_matches", schema = "integrity_service")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimilarityMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plagiarism_check_id", nullable = false)
    @JsonIgnore
    private PlagiarismCheck plagiarismCheck;

    @Column(name = "matched_submission_id")
    private Long matchedSubmissionId;

    @Column(name = "matched_student_id")
    private String matchedStudentId;

    @Column(name = "similarity_score", nullable = false)
    private Double similarityScore;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "matched_file_name")
    private String matchedFileName;

    @Column(name = "matching_lines")
    private Integer matchingLines;

    @Column(name = "tokens_matched")
    private Integer tokensMatched;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    public void setPlagiarismCheck(PlagiarismCheck plagiarismCheck) {
        this.plagiarismCheck = plagiarismCheck;
    }
}