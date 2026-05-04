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
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
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

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Internal answer record ────────────────────────────────────────────────

    private record AnswerData(
            String questionId,
            String questionText,
            String answerText,
            int wordCount,
            double maxPoints,
            double aiGeneratedMark,
            double similarityScore,   // 0-100 as stored in Answer entity
            String severity,
            boolean flagged,
            double grammarScore,
            double clarityScore,
            double completenessScore,
            double relevanceScore,
            List<String> strengths,
            List<String> improvements,
            String plagiarismSources  // JSON-serialised InternetMatch[] from SMS
    ) {}

    // ── Submission metadata record ────────────────────────────────────────────

    private record SubmissionMeta(
            String studentName,
            String studentId,
            String assignmentTitle,
            String courseName,
            LocalDateTime submittedAt
    ) {}

    /**
     * Build a complete PlagiarismReportData for a submission.
     * Per-question data (AI scores + plagiarism score) comes from the Answer entities
     * stored in submission-management-service. DB PlagiarismCheck records are used
     * opportunistically for detailed internet sources; if absent, scores are derived
     * from the Answer similarity scores.
     */
    public PlagiarismReportData buildReportData(Long submissionId) {
        // 1. Fetch submission metadata (studentName, assignmentTitle, etc.)
        SubmissionMeta meta = fetchSubmissionMeta(submissionId);

        // 2. Fetch per-question answers (includes AI scores + plagiarism scores)
        List<AnswerData> answers = fetchAnswers(submissionId);
        log.info("[ReportDataService] buildReportData — submissionId={} answers={}", submissionId, answers.size());

        // 3. Build QuestionSection list from answers
        List<QuestionSection> questionSections = buildQuestionSections(answers);

        // 4. Try DB for PlagiarismCheck (for detailed internet source list)
        List<PlagiarismCheck> checks = checkRepository.findBySubmissionIdOrderByCreatedAtDesc(submissionId);
        PlagiarismCheck check = checks.isEmpty() ? null : checks.get(0);

        // 5. Build top sources — prefer DB check, fall back to sources saved per-answer
        List<TopSource> topSources = buildTopSources(check);
        if (topSources.isEmpty()) {
            topSources = buildTopSourcesFromAnswers(answers);
        }

        // 6. Compute overall similarity
        double overallSimilarity;
        if (check != null && check.getOverallSimilarityScore() != null) {
            overallSimilarity = check.getOverallSimilarityScore() * 100;
        } else {
            // Derive from max per-question similarity stored in Answer entities
            overallSimilarity = answers.stream()
                    .mapToDouble(AnswerData::similarityScore)
                    .max().orElse(0.0);
        }

        double internet = check != null && check.getInternetSimilarityScore() != null
                ? check.getInternetSimilarityScore() * 100 : overallSimilarity;
        double studentPaper = check != null && check.getStudentSimilarityScore() != null
                ? check.getStudentSimilarityScore() * 100 : 0.0;
        double publications = estimatePublicationSimilarity(check);

        // 7. Combined answer text (for highlights + legacy pages)
        String answerText = answers.stream()
                .map(AnswerData::answerText)
                .filter(t -> t != null && !t.isBlank())
                .collect(Collectors.joining("\n\n"));

        // 8. Highlights from DB check (best-effort)
        List<TextHighlight> highlights = buildHighlights(check, answerText, topSources);

        // 9. Category percentages
        double[] categories = computeCategories(check, answerText, highlights);
        // If no DB check but we have a similarity score, attribute to NOT_CITED
        if (check == null && overallSimilarity > 0) {
            categories[0] = overallSimilarity;
        }

        // 10. AI feedback aggregate
        AiFeedbackSection aiFeedback = buildAiFeedbackFromAnswers(answers);

        // 11. Word / char counts (prefer per-question wordCount sum)
        int totalWords = answers.stream().mapToInt(AnswerData::wordCount).sum();
        if (totalWords == 0) totalWords = countWords(answerText);

        return PlagiarismReportData.builder()
                .studentName(meta.studentName())
                .studentId(meta.studentId())
                .assignmentTitle(meta.assignmentTitle())
                .courseName(meta.courseName())
                .submissionId(submissionId.toString())
                .submissionDate(meta.submittedAt())
                .downloadDate(LocalDateTime.now())
                .wordCount(totalWords)
                .charCount(answerText.length())
                .overallSimilarity(round1(overallSimilarity))
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
                .questionSections(questionSections)
                .build();
    }

    // ── Per-question helpers ──────────────────────────────────────────────────

    private List<AnswerData> fetchAnswers(Long submissionId) {
        try {
            String url = submissionServiceUrl + "/api/internal/submissions/" + submissionId + "/answers";
            String body = restTemplate.getForObject(url, String.class);
            if (body == null) return new ArrayList<>();

            JsonNode root = objectMapper.readTree(body);
            JsonNode data = root.path("data");

            List<AnswerData> results = new ArrayList<>();
            if (data.isArray()) {
                for (JsonNode ans : data) {
                    List<String> strengths = new ArrayList<>();
                    JsonNode sArr = ans.path("strengths");
                    if (sArr.isArray()) sArr.forEach(n -> {
                        String s = cleanBulletText(n.asText(""));
                        if (!s.isBlank()) strengths.add(s);
                    });

                    List<String> improvements = new ArrayList<>();
                    JsonNode iArr = ans.path("improvements");
                    if (iArr.isArray()) iArr.forEach(n -> {
                        String s = cleanBulletText(n.asText(""));
                        if (!s.isBlank()) improvements.add(s);
                    });

                    // similarityScore stored as 0-100 (see Answer entity comment)
                    double simScore = ans.path("similarityScore").asDouble(0);
                    double maxPts   = ans.path("maxPoints").asDouble(0);
                    double aiMark   = ans.path("aiGeneratedMark").asDouble(0);

                    // plagiarismSources is a JSON string — keep as-is for later parsing
                    String plagSources = null;
                    JsonNode srcNode = ans.path("plagiarismSources");
                    if (!srcNode.isMissingNode() && !srcNode.isNull()) {
                        String raw = srcNode.asText("");
                        if (!raw.isBlank()) plagSources = raw;
                    }

                    results.add(new AnswerData(
                            ans.path("questionId").asText(""),
                            ans.path("questionText").asText(""),
                            ans.path("answerText").asText(""),
                            ans.path("wordCount").asInt(0),
                            maxPts,
                            aiMark,
                            simScore,
                            ans.path("plagiarismSeverity").asText(""),
                            ans.path("plagiarismFlagged").asBoolean(false),
                            ans.path("grammarScore").asDouble(0),
                            ans.path("clarityScore").asDouble(0),
                            ans.path("completenessScore").asDouble(0),
                            ans.path("relevanceScore").asDouble(0),
                            strengths,
                            improvements,
                            plagSources
                    ));
                }
            }
            log.info("[ReportDataService] fetchAnswers — {} answers for submission {}", results.size(), submissionId);
            return results;
        } catch (Exception e) {
            log.warn("[ReportDataService] fetchAnswers failed for {}: {}", submissionId, e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<QuestionSection> buildQuestionSections(List<AnswerData> answers) {
        // Find the longest common prefix shared by all non-blank question texts
        // (e.g. "life. " prepended by the task title) so it can be stripped.
        List<String> allTexts = answers.stream()
                .map(AnswerData::questionText)
                .filter(t -> t != null && !t.isBlank())
                .collect(Collectors.toList());
        String commonPrefix = findCommonPrefix(allTexts);

        List<QuestionSection> sections = new ArrayList<>();
        int qNum = 1;
        for (AnswerData a : answers) {
            String raw = (a.questionText() != null && !a.questionText().isBlank())
                    ? a.questionText() : "Question " + qNum;
            // Strip shared prefix (e.g. "life. ") to avoid repeating task preamble on every page
            String qText = (commonPrefix.length() > 3 && raw.startsWith(commonPrefix))
                    ? raw.substring(commonPrefix.length()).trim() : raw;
            if (qText.isBlank()) qText = raw;
            sections.add(QuestionSection.builder()
                    .questionNumber(qNum++)
                    .questionText(qText)
                    .answerText(a.answerText())
                    .wordCount(a.wordCount())
                    .maxPoints(a.maxPoints())
                    .aiGeneratedMark(a.aiGeneratedMark())
                    .similarityScore(round1(a.similarityScore()))
                    .similaritySeverity(a.severity())
                    .flagged(a.flagged())
                    .relevanceScore(a.relevanceScore())
                    .completenessScore(a.completenessScore())
                    .clarityScore(a.clarityScore())
                    .grammarScore(a.grammarScore())
                    .strengths(a.strengths() != null ? a.strengths() : new ArrayList<>())
                    .improvements(a.improvements() != null ? a.improvements() : new ArrayList<>())
                    .sources(parseTopSourcesFromJson(a.plagiarismSources()))
                    .build());
        }
        return sections;
    }

    private AiFeedbackSection buildAiFeedbackFromAnswers(List<AnswerData> answers) {
        if (answers.isEmpty()) return null;

        double totalGrammar = 0, totalClarity = 0, totalCompleteness = 0, totalRelevance = 0;
        int count = 0;
        List<String> allStrengths = new ArrayList<>(), allImprovements = new ArrayList<>();

        for (AnswerData a : answers) {
            // Only include answers that actually have AI scores
            if (a.grammarScore() > 0 || a.clarityScore() > 0 || a.completenessScore() > 0 || a.relevanceScore() > 0) {
                totalGrammar      += a.grammarScore();
                totalClarity      += a.clarityScore();
                totalCompleteness += a.completenessScore();
                totalRelevance    += a.relevanceScore();
                count++;
            }
            if (a.strengths() != null) allStrengths.addAll(a.strengths());
            if (a.improvements() != null) allImprovements.addAll(a.improvements());
        }

        if (count == 0) return null;

        return AiFeedbackSection.builder()
                .grammarScore(round1(totalGrammar / count))
                .clarityScore(round1(totalClarity / count))
                .completenessScore(round1(totalCompleteness / count))
                .relevanceScore(round1(totalRelevance / count))
                .strengths(allStrengths.stream().filter(s -> !s.isBlank()).distinct().limit(5).collect(Collectors.toList()))
                .improvements(allImprovements.stream().filter(s -> !s.isBlank()).distinct().limit(5).collect(Collectors.toList()))
                .suggestions(new ArrayList<>())
                .build();
    }

    // ── Submission-service fetch ──────────────────────────────────────────────

    private SubmissionMeta fetchSubmissionMeta(Long submissionId) {
        try {
            String url = submissionServiceUrl + "/api/internal/submissions/" + submissionId;
            String body = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(body);
            JsonNode data = root.path("data");

            String studentId       = data.path("studentId").asText("");
            String studentName     = data.path("studentName").asText("");
            String assignmentTitle = data.path("assignmentTitle").asText("");
            String submittedAt     = data.path("submittedAt").asText("");

            LocalDateTime submitted;
            try {
                if (submittedAt.isBlank()) {
                    submitted = LocalDateTime.now();
                } else if (submittedAt.contains("+") || (submittedAt.endsWith("Z") && submittedAt.length() > 19)) {
                    submitted = OffsetDateTime.parse(submittedAt).toLocalDateTime();
                } else {
                    submitted = LocalDateTime.parse(submittedAt.replace("Z", ""));
                }
            } catch (DateTimeParseException ex) {
                log.warn("[ReportDataService] Could not parse submittedAt '{}': {}", submittedAt, ex.getMessage());
                submitted = LocalDateTime.now();
            }

            String displayName  = studentName.isBlank()
                    ? (studentId.isBlank() ? "Student" : "Student " + studentId.substring(0, Math.min(8, studentId.length())))
                    : studentName;
            String displayTitle = assignmentTitle.isBlank() ? "Assignment" : assignmentTitle;

            return new SubmissionMeta(displayName, studentId, displayTitle, "Smart LMS", submitted);

        } catch (Exception e) {
            log.warn("[ReportDataService] Failed to fetch submission meta for {}: {}", submissionId, e.getMessage());
            return new SubmissionMeta("Student", "", "Assignment", "Smart LMS", LocalDateTime.now());
        }
    }

    // ── Top-sources / highlights / categories (DB-based, best-effort) ─────────

    private List<TopSource> buildTopSources(PlagiarismCheck check) {
        if (check == null) return new ArrayList<>();

        List<TopSource> sources = new ArrayList<>();
        int rank = 1;

        List<InternetMatch> internet = check.getInternetMatches().stream()
                .sorted((a, b) -> Double.compare(
                        b.getSimilarityScore() != null ? b.getSimilarityScore() : 0,
                        a.getSimilarityScore() != null ? a.getSimilarityScore() : 0))
                .collect(Collectors.toList());

        for (InternetMatch im : internet) {
            if (rank > 10) break;
            double pct  = im.getSimilarityScore() != null ? im.getSimilarityScore() * 100 : 0;
            String type = categoriseDomain(im.getSourceDomain());
            sources.add(TopSource.builder()
                    .rank(rank++)
                    .type(type)
                    .label(im.getUrl() != null ? im.getUrl() : im.getSourceDomain())
                    .similarityPct(round1(pct))
                    .matchedExcerpt(truncate(im.getMatchedText(), 120))
                    .build());
        }

        List<SimilarityMatch> peers = check.getSimilarityMatches().stream()
                .sorted((a, b) -> Double.compare(
                        b.getSimilarityScore() != null ? b.getSimilarityScore() : 0,
                        a.getSimilarityScore() != null ? a.getSimilarityScore() : 0))
                .collect(Collectors.toList());

        for (SimilarityMatch pm : peers) {
            if (rank > 10) break;
            double pct  = pm.getSimilarityScore() != null ? pm.getSimilarityScore() * 100 : 0;
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

            String needle = im.getMatchedText().length() > 30
                    ? im.getMatchedText().substring(0, Math.min(im.getMatchedText().length(), 60))
                    : im.getMatchedText();

            int idx = answerText.indexOf(needle);
            if (idx < 0 && needle.contains(" ")) {
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
        return isAcademicDomain(domain) ? "Publications" : "Internet";
    }

    // ── Answer-derived sources ────────────────────────────────────────────────

    /**
     * Parses the JSON-serialised InternetMatch[] stored in Answer.plagiarismSources
     * and returns a list of TopSource objects ranked by similarity score.
     */
    private List<TopSource> parseTopSourcesFromJson(String plagiarismSourcesJson) {
        if (plagiarismSourcesJson == null || plagiarismSourcesJson.isBlank()) return new ArrayList<>();
        try {
            JsonNode arr = objectMapper.readTree(plagiarismSourcesJson);
            if (!arr.isArray()) return new ArrayList<>();
            List<TopSource> sources = new ArrayList<>();
            int rank = 1;
            // Sort by similarityScore descending before ranking
            List<JsonNode> nodes = new ArrayList<>();
            arr.forEach(nodes::add);
            nodes.sort((a, b) -> Double.compare(
                    b.path("similarityScore").asDouble(0),
                    a.path("similarityScore").asDouble(0)));
            for (JsonNode src : nodes) {
                if (rank > 10) break;
                double simPct = src.path("similarityScore").asDouble(0); // already 0-100
                String url     = src.path("url").asText("");
                String domain  = src.path("sourceDomain").asText("");
                String title   = src.path("title").asText("");
                String snippet = src.path("snippet").asText("");
                String cat     = src.path("sourceCategory").asText("OTHER");
                String label   = url.isBlank() ? (domain.isBlank() ? title : domain) : url;
                String type    = "ACADEMIC".equals(cat) ? "Publications" : "Internet";
                sources.add(TopSource.builder()
                        .rank(rank++)
                        .type(type)
                        .label(truncate(label, 100))
                        .similarityPct(round1(simPct))
                        .matchedExcerpt(truncate(snippet, 120))
                        .build());
            }
            return sources;
        } catch (Exception e) {
            log.warn("[ReportDataService] Failed to parse plagiarismSources JSON: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Aggregates internet sources across all answers (de-duplicated by URL),
     * ranked globally by similarity score. Used when the DB PlagiarismCheck has no records.
     */
    private List<TopSource> buildTopSourcesFromAnswers(List<AnswerData> answers) {
        Map<String, TopSource> byUrl = new LinkedHashMap<>();
        for (AnswerData a : answers) {
            for (TopSource src : parseTopSourcesFromJson(a.plagiarismSources())) {
                byUrl.merge(src.getLabel(), src, (existing, newer) ->
                        newer.getSimilarityPct() > existing.getSimilarityPct() ? newer : existing);
            }
        }
        // Re-rank globally, rebuilding with correct rank
        List<TopSource> sorted = byUrl.values().stream()
                .sorted((a, b) -> Double.compare(b.getSimilarityPct(), a.getSimilarityPct()))
                .limit(10)
                .collect(Collectors.toList());
        List<TopSource> ranked = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            TopSource s = sorted.get(i);
            ranked.add(TopSource.builder()
                    .rank(i + 1)
                    .type(s.getType())
                    .label(s.getLabel())
                    .similarityPct(s.getSimilarityPct())
                    .matchedExcerpt(s.getMatchedExcerpt())
                    .build());
        }
        return ranked;
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    private int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return text.trim().split("\\s+").length;
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    /**
     * Cleans a stored strength/improvement string:
     * strips surrounding quotes, filters pure numbers, "N/A", and fragments < 8 chars.
     * Returns blank string for values that should be skipped.
     */
    private String cleanBulletText(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        // Strip surrounding double or single quotes the LLM sometimes adds
        if (s.length() >= 2 &&
            ((s.startsWith("\"") && s.endsWith("\"")) ||
             (s.startsWith("'")  && s.endsWith("'")))) {
            s = s.substring(1, s.length() - 1).trim();
        }
        // Reject pure numbers (score values that leaked in), "N/A", very short fragments
        if (s.isBlank()) return "";
        if (s.matches("[0-9]+(?:\\.[0-9]+)?(?:\\s*/\\s*10)?")) return "";
        if (s.equalsIgnoreCase("n/a") || s.equalsIgnoreCase("none") || s.equalsIgnoreCase("ok")) return "";
        if (s.length() < 8) return "";
        return s;
    }

    /**
     * Returns the longest common prefix shared by all strings in the list.
     * Only compares at word boundaries to avoid splitting mid-word.
     */
    private String findCommonPrefix(List<String> texts) {
        if (texts == null || texts.size() < 2) return "";
        String base = texts.get(0);
        int maxLen = base.length();
        for (int i = 1; i < texts.size(); i++) {
            String t = texts.get(i);
            int j = 0;
            while (j < Math.min(maxLen, t.length()) && base.charAt(j) == t.charAt(j)) j++;
            maxLen = j;
        }
        // Trim to last whitespace so we don't cut mid-word
        String prefix = base.substring(0, maxLen);
        int lastSpace = prefix.lastIndexOf(' ');
        return lastSpace > 0 ? prefix.substring(0, lastSpace + 1) : "";
    }
}
