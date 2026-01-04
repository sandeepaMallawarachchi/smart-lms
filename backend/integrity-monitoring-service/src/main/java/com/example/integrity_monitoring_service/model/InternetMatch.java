package com.example.integrity_monitoring_service.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "internet_matches", schema = "integrity_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternetMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plagiarism_check_id", nullable = false)
    @JsonIgnore
    private PlagiarismCheck plagiarismCheck;

    @Column(name = "url", columnDefinition = "TEXT")
    private String url;

    @Column(name = "title", columnDefinition = "TEXT")
    private String title;

    @Column(name = "snippet", columnDefinition = "TEXT")
    private String snippet;

    @Column(name = "similarity_score")
    private Double similarityScore;

    @Column(name = "matched_text", columnDefinition = "TEXT")
    private String matchedText;

    @Column(name = "source_domain")
    private String sourceDomain;

    public void setPlagiarismCheck(PlagiarismCheck plagiarismCheck) {
        this.plagiarismCheck = plagiarismCheck;
    }
}