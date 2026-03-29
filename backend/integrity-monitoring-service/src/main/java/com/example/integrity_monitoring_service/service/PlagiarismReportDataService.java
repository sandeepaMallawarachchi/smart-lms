package com.example.integrity_monitoring_service.service;

import com.example.integrity_monitoring_service.dto.response.PlagiarismReportData;
import com.example.integrity_monitoring_service.dto.response.PlagiarismReportData.*;
import com.example.integrity_monitoring_service.model.InternetMatch;
import com.example.integrity_monitoring_service.model.PlagiarismCheck;
import com.example.integrity_monitoring_service.model.SimilarityMatch;
import com.example.integrity_monitoring_service.repository.PlagiarismCheckRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Aggregates all data needed to generate a PDF plagiarism report for a submission.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlagiarismReportDataService {

    private final PlagiarismCheckRepository checkRepository;
    private final CitationDetectorService citationDetector;

    @Value("${submission-service.url:http://localhost:8081}")
    private String submissionServiceUrl;

    @Value("${feedback-service.url:http://localhost:8083}")
    private String feedbackServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Build a complete PlagiarismReportData for a submission.
     * Fetches plagiarism results from DB + answer text + AI feedback from services.
     */
    public PlagiarismReportData buildReportData(Long submissionId) {
        // 1. Get latest plagiarism check for this submission
        List<PlagiarismCheck> checks = checkRepository.findBySubmissionIdOrderByCreatedAtDesc(submissionId);
        PlagiarismCheck check = checks.isEmpty() ? null : checks.get(0);

        // 2. Fetch submission metadata + answer text from submission-service
        SubmissionMeta meta = fetchSubmissionMeta(submissionId);

        // 3. Fetch AI feedback from latest version
        AiFeedbackSection aiFeedback = fetchAiFeedback(submissionId);

        // 4. Build top sources list
        List<TopSource> topSources = buildTopSources(check);

        // 5. Build text highlights from match data
        List<TextHighlight> highlights = buildHighlights(check, meta.answerText(), topSources);

        // 6. Compute category percentages
        double[] categories = computeCategories(check, meta.answerText(), highlights);

        double overall      = check != null && check.getOverallSimilarityScore() != null
                              ? check.getOverallSimilarityScore() * 100 : 0.0;
        double internet     = check != null && check.getInternetSimilarityScore() != null
                              ? check.getInternetSimilarityScore() * 100 : 0.0;
        double studentPaper = check != null && check.getStudentSimilarityScore() != null
                              ? check.getStudentSimilarityScore() * 100 : 0.0;

        // Publication similarity approximated from academic domain internet matches
        double publications = estimatePublicationSimilarity(check);

        String answerText = meta.answerText() != null ? meta.answerText() : "";

        return PlagiarismReportData.builder()
                .studentName(meta.studentName())
                .studentId(meta.studentId())
                .assignmentTitle(meta.assignmentTitle())
                .courseName(meta.courseName())
                .submissionId(submissionId.toString())
                .submissionDate(meta.submittedAt())
                .downloadDate(LocalDateTime.now())
                .wordCount(countWords(answerText))
                .charCount(answerText.length())
                .overallSimilarity(round1(overall))
                .internetSimilarity(round1(internet))
                .studentPaperSimilarity(round1(studentPaper))
                .publicationSimilarity(round1(publications))
                .notCitedOrQuotedPct(round1(categories[0]))
                .missingQuotationsPct(round1(categories[1]))
                .missingCitationPct(round1(categories[2]))
                .citedAndQuotedPct(round1(categories[3]))
                .topSources(topSources)
                .answerText(answerText)
                .highlights(highlights)
                .aiFeedback(aiFeedback)
                .build();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private List<TopSource> buildTopSources(PlagiarismCheck check) {
        if (check == null) return new ArrayList<>();

        List<TopSource> sources = new ArrayList<>();
        int rank = 1;

        // Internet matches first (sorted by score desc)
        List<InternetMatch> internet = check.getInternetMatches().stream()
                .sorted((a, b) -> Double.compare(
                        b.getSimilarityScore() != null ? b.getSimilarityScore() : 0,
                        a.getSimilarityScore() != null ? a.getSimilarityScore() : 0))
                .collect(Collectors.toList());

        for (InternetMatch im : internet) {
            if (rank > 10) break;
            double pct = im.getSimilarityScore() != null ? im.getSimilarityScore() * 100 : 0;
            String type = categoriseDomain(im.getSourceDomain());
            sources.add(TopSource.builder()
                    .rank(rank++)
                    .type(type)
                    .label(im.getUrl() != null ? im.getUrl() : im.getSourceDomain())
                    .similarityPct(round1(pct))
                    .matchedExcerpt(truncate(im.getMatchedText(), 120))
                    .build());
        }

        // Peer (student paper) matches
        List<SimilarityMatch> peers = check.getSimilarityMatches().stream()
                .sorted((a, b) -> Double.compare(
                        b.getSimilarityScore() != null ? b.getSimilarityScore() : 0,
                        a.getSimilarityScore() != null ? a.getSimilarityScore() : 0))
                .collect(Collectors.toList());

        for (SimilarityMatch pm : peers) {
            if (rank > 10) break;
            double pct = pm.getSimilarityScore() != null ? pm.getSimilarityScore() * 100 : 0;
            // Anonymise: use submissionId as a date proxy
            String label = "Student submission #" + (pm.getMatchedSubmissionId() != null
                    ? pm.getMatchedSubmissionId() : "unknown");
            sources.add(TopSource.builder()
                    .rank(rank++)
                    .type("Student papers")
                    .label(label)
                    .similarityPct(round1(pct))
                    .matchedExcerpt(truncate(pm.getDetails(), 120))
                    .build());
        }

        return sources;
    }

    private List<TextHighlight> buildHighlights(PlagiarismCheck check, String answerText,
                                                  List<TopSource> topSources) {
        List<TextHighlight> highlights = new ArrayList<>();
        if (check == null || answerText == null || answerText.isBlank()) return highlights;

        int sourceIdx = 0;
        for (InternetMatch im : check.getInternetMatches()) {
            sourceIdx++;
            if (im.getMatchedText() == null || im.getMatchedText().isBlank()) continue;

            // Try to find the matched text (or a long substring) in the answer
            String needle = im.getMatchedText().length() > 30
                    ? im.getMatchedText().substring(0, Math.min(im.getMatchedText().length(), 60))
                    : im.getMatchedText();

            int idx = answerText.indexOf(needle);
            if (idx < 0 && needle.contains(" ")) {
                // Try first sentence of matched text
                String[] words = needle.split("\\s+");
                if (words.length >= 4) {
                    needle = String.join(" ", Arrays.copyOfRange(words, 0, 4));
                    idx = answerText.indexOf(needle);
                }
            }

            if (idx >= 0) {
                int end = Math.min(answerText.length(), idx + im.getMatchedText().length());
                CitationDetectorService.CitationStatus status =
                        citationDetector.classifyMatch(answerText, idx, end, im.getMatchedText());

                highlights.add(TextHighlight.builder()
                        .startIndex(idx)
                        .endIndex(end)
                        .sourceRank(sourceIdx)
                        .status(status.name())
                        .build());
            }
        }

        return highlights;
    }

    private double[] computeCategories(PlagiarismCheck check, String answerText,
                                        List<TextHighlight> highlights) {
        // [0]=NOT_CITED, [1]=MISSING_QUOTATIONS, [2]=MISSING_CITATION, [3]=CITED_AND_QUOTED
        if (check == null || answerText == null || answerText.isBlank()) return new double[4];

        double totalChars = answerText.length();
        long[] charsByStatus = new long[4];

        for (TextHighlight h : highlights) {
            int len = h.getEndIndex() - h.getStartIndex();
            switch (h.getStatus()) {
                case "NOT_CITED_OR_QUOTED"  -> charsByStatus[0] += len;
                case "MISSING_QUOTATIONS"   -> charsByStatus[1] += len;
                case "MISSING_CITATION"     -> charsByStatus[2] += len;
                case "CITED_AND_QUOTED"     -> charsByStatus[3] += len;
            }
        }

        // If no highlights (e.g., paraphrase detected via score but no exact match),
        // attribute overall internet similarity to NOT_CITED
        if (highlights.isEmpty() && check.getOverallSimilarityScore() != null) {
            double overall = check.getOverallSimilarityScore() * 100;
            return new double[]{ overall, 0, 0, 0 };
        }

        return new double[]{
                totalChars > 0 ? (charsByStatus[0] / totalChars) * 100 : 0,
                totalChars > 0 ? (charsByStatus[1] / totalChars) * 100 : 0,
                totalChars > 0 ? (charsByStatus[2] / totalChars) * 100 : 0,
                totalChars > 0 ? (charsByStatus[3] / totalChars) * 100 : 0
        };
    }

    private double estimatePublicationSimilarity(PlagiarismCheck check) {
        if (check == null) return 0.0;
        return check.getInternetMatches().stream()
                .filter(m -> isAcademicDomain(m.getSourceDomain()))
                .mapToDouble(m -> m.getSimilarityScore() != null ? m.getSimilarityScore() * 100 : 0)
                .max().orElse(0.0);
    }

    private boolean isAcademicDomain(String domain) {
        if (domain == null) return false;
        String d = domain.toLowerCase();
        return d.contains("scholar") || d.contains("ieee") || d.contains("acm") ||
               d.contains("springer") || d.contains("elsevier") || d.contains("researchgate") ||
               d.contains("academia") || d.endsWith(".edu") || d.contains("jstor") ||
               d.contains("pubmed") || d.contains("sciencedirect");
    }

    private String categoriseDomain(String domain) {
        if (domain == null) return "Internet";
        if (isAcademicDomain(domain)) return "Publications";
        return "Internet";
    }

    // ── Submission-service fetch ──────────────────────────────────────────────

    private record SubmissionMeta(String studentName, String studentId, String assignmentTitle,
                                   String courseName, LocalDateTime submittedAt, String answerText) {}

    private SubmissionMeta fetchSubmissionMeta(Long submissionId) {
        try {
            // Fetch submission
            String url = submissionServiceUrl + "/api/submissions/" + submissionId;
            String body = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(body);
            JsonNode data = root.path("data");

            String studentId    = data.path("studentId").asText("");
            String assignId     = data.path("assignmentId").asText("");
            String submittedAt  = data.path("submittedAt").asText("");
            LocalDateTime submitted = submittedAt.isBlank() ? LocalDateTime.now()
                    : LocalDateTime.parse(submittedAt.replace("Z", ""));

            // Fetch answers (working copy)
            String answersUrl = submissionServiceUrl + "/api/submissions/" + submissionId + "/answers";
            String answersBody = restTemplate.getForObject(answersUrl, String.class);
            StringBuilder combined = new StringBuilder();
            if (answersBody != null) {
                JsonNode answersRoot = objectMapper.readTree(answersBody);
                JsonNode answersData = answersRoot.path("data");
                if (answersData.isArray()) {
                    for (JsonNode ans : answersData) {
                        combined.append(ans.path("answerText").asText("")).append("\n\n");
                    }
                }
            }

            return new SubmissionMeta(
                    "Student " + studentId.substring(0, Math.min(8, studentId.length())),
                    studentId, assignId, "Smart LMS", submitted, combined.toString().trim());

        } catch (Exception e) {
            log.warn("[ReportDataService] Failed to fetch submission meta for {}: {}", submissionId, e.getMessage());
            return new SubmissionMeta("Student", "", "Assignment", "Smart LMS", LocalDateTime.now(), "");
        }
    }

    private AiFeedbackSection fetchAiFeedback(Long submissionId) {
        try {
            String url = submissionServiceUrl + "/api/submissions/" + submissionId + "/versions/latest";
            String body = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(body);
            JsonNode data = root.path("data");

            if (data.isMissingNode()) return null;

            // Aggregate AI scores from version answers
            JsonNode answers = data.path("answers");
            if (!answers.isArray() || answers.isEmpty()) return null;

            double totalGrammar = 0, totalClarity = 0, totalCompleteness = 0, totalRelevance = 0;
            int count = 0;
            List<String> allStrengths = new ArrayList<>(), allImprovements = new ArrayList<>();

            for (JsonNode ans : answers) {
                totalGrammar      += ans.path("grammarScore").asDouble(0);
                totalClarity      += ans.path("clarityScore").asDouble(0);
                totalCompleteness += ans.path("completenessScore").asDouble(0);
                totalRelevance    += ans.path("relevanceScore").asDouble(0);
                count++;

                String s = ans.path("strengths").asText("");
                if (!s.isBlank()) allStrengths.addAll(Arrays.asList(s.split("\\|\\|")));
                String i = ans.path("improvements").asText("");
                if (!i.isBlank()) allImprovements.addAll(Arrays.asList(i.split("\\|\\|")));
            }

            if (count == 0) return null;

            return AiFeedbackSection.builder()
                    .grammarScore(round1(totalGrammar / count))
                    .clarityScore(round1(totalClarity / count))
                    .completenessScore(round1(totalCompleteness / count))
                    .relevanceScore(round1(totalRelevance / count))
                    .strengths(allStrengths.stream().filter(s -> !s.isBlank()).limit(3).collect(Collectors.toList()))
                    .improvements(allImprovements.stream().filter(s -> !s.isBlank()).limit(3).collect(Collectors.toList()))
                    .suggestions(new ArrayList<>())
                    .build();

        } catch (Exception e) {
            log.debug("[ReportDataService] Could not fetch AI feedback for {}: {}", submissionId, e.getMessage());
            return null;
        }
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    private int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return text.trim().split("\\s+").length;
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "\u2026";
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
