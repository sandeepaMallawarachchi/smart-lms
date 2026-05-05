package com.example.integrity_monitoring_service.service;

import com.example.integrity_monitoring_service.dto.response.PlagiarismReportData;
import com.example.integrity_monitoring_service.dto.response.PlagiarismReportData.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Generates professional PDF plagiarism/feedback reports.
 * Uses Apache PDFBox 3.x.
 */
@Service
@Slf4j
public class PdfReportGeneratorService {

    // ── Page dimensions (A4) ─────────────────────────────────────────────────
    private static final float W = PDRectangle.A4.getWidth();   // 595 pt
    private static final float H = PDRectangle.A4.getHeight();  // 842 pt
    private static final float MARGIN = 50f;
    private static final float CONTENT_W = W - 2 * MARGIN;

    // ── Brand colours ─────────────────────────────────────────────────────────
    private static final Color BRAND_BLUE       = new Color(33, 90, 168);
    private static final Color BRAND_BLUE_LIGHT = new Color(240, 245, 255);
    private static final Color GREY_LINE        = new Color(220, 220, 220);
    private static final Color TEXT_DARK        = new Color(30, 30, 30);
    private static final Color TEXT_MID         = new Color(80, 80, 80);
    private static final Color TEXT_LIGHT       = new Color(130, 130, 130);
    private static final Color HIGH_RED         = new Color(220, 50, 50);
    private static final Color HIGH_ORANGE      = new Color(230, 120, 30);
    private static final Color HIGH_YELLOW      = new Color(200, 180, 0);
    private static final Color HIGH_GREEN       = new Color(60, 180, 60);
    private static final Color BADGE_LOW        = new Color(34, 139, 34);
    private static final Color BADGE_MEDIUM     = new Color(210, 130, 0);
    private static final Color BADGE_HIGH       = new Color(190, 30, 30);

    // Source badge colours (up to 8 sources)
    private static final Color[] SOURCE_COLORS = {
        new Color(220, 38, 38),  new Color(234, 88, 12),  new Color(202, 138, 4),
        new Color(22, 163, 74),  new Color(37, 99, 235),  new Color(109, 40, 217),
        new Color(219, 39, 119), new Color(6, 148, 162)
    };

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("MMM dd, yyyy, hh:mm a");

    // ── Fonts ─────────────────────────────────────────────────────────────────
    private PDFont fontRegular(PDDocument doc) throws Exception {
        return new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    }
    private PDFont fontBold(PDDocument doc) throws Exception {
        return new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    }
    private PDFont fontOblique(PDDocument doc) throws Exception {
        return new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Single combined integrity + feedback report (Turnitin-style). */
    @Async("plagiarismTaskExecutor")
    public CompletableFuture<byte[]> generateReport(PlagiarismReportData data) {
        try {
            return CompletableFuture.completedFuture(buildPdf(data));
        } catch (Exception e) {
            log.error("[PDF] Error generating report: {}", e.getMessage(), e);
            CompletableFuture<byte[]> failed = new CompletableFuture<>();
            failed.completeExceptionally(new RuntimeException("PDF generation failed: " + e.getMessage(), e));
            return failed;
        }
    }

    /** Kept for backward compatibility — delegates to the combined report. */
    @Async("plagiarismTaskExecutor")
    public CompletableFuture<byte[]> generatePlagiarismReport(PlagiarismReportData data) {
        return generateReport(data);
    }

    /** Kept for backward compatibility — delegates to the combined report. */
    @Async("plagiarismTaskExecutor")
    public CompletableFuture<byte[]> generateFeedbackReport(PlagiarismReportData data) {
        return generateReport(data);
    }

    private byte[] buildPdf(PlagiarismReportData data) throws Exception {
        try (PDDocument doc = new PDDocument()) {
            boolean hasQuestions = data.getQuestionSections() != null && !data.getQuestionSections().isEmpty();

            addCoverPage(doc, data);              // page 1
            addIntegrityOverviewPage(doc, data);  // page 2

            if (hasQuestions) {
                addQuestionDetailPages(doc, data, 3);
            } else {
                addHighlightedContentPages(doc, data);
                if (data.getAiFeedback() != null) addAiAnalysisPage(doc, data);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    // ── Page 1: Cover ─────────────────────────────────────────────────────────

    private void addCoverPage(PDDocument doc, PlagiarismReportData d) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDFont bold = fontBold(doc), regular = fontRegular(doc);

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            drawRect(cs, 0, H - 50, W, 50, BRAND_BLUE);
            drawText(cs, bold, 10, Color.WHITE, MARGIN, H - 33, "Smart LMS");
            drawText(cs, regular, 9, Color.WHITE, MARGIN + 70, H - 33, "Page 1  -  Cover Page");
            drawText(cs, regular, 9, Color.WHITE, W - 220, H - 33,
                    "Submission ID  " + d.getSubmissionId());

            // Report type banner
            drawRect(cs, 0, H - 90, W, 38, new Color(20, 65, 130));
            drawText(cs, bold, 13, Color.WHITE, MARGIN, H - 66, "INTEGRITY & FEEDBACK REPORT");

            float nameY = H - 210;
            drawText(cs, bold, 28, TEXT_DARK, MARGIN, nameY, d.getStudentName());
            drawText(cs, bold, 18, TEXT_DARK, MARGIN, nameY - 45, d.getAssignmentTitle());
            drawText(cs, regular, 12, TEXT_MID, MARGIN, nameY - 70,
                    "·  " + d.getCourseName());

            drawRect(cs, MARGIN, nameY - 95, CONTENT_W, 1, GREY_LINE);

            float boxY = nameY - 110;
            drawText(cs, bold, 14, TEXT_DARK, MARGIN, boxY, "Document Details");

            // Left column: submission metadata
            float col2 = W - 190;
            float ly = boxY - 30;
            String[][] leftRows = {
                {"Submission ID",   d.getSubmissionId()},
                {"Submission Date", d.getSubmissionDate() != null ? d.getSubmissionDate().format(DT_FMT) : "-"},
                {"Download Date",   d.getDownloadDate() != null ? d.getDownloadDate().format(DT_FMT) : "-"},
            };
            for (String[] row : leftRows) {
                drawText(cs, regular, 9, TEXT_LIGHT, MARGIN, ly, row[0]);
                drawText(cs, bold, 9, TEXT_DARK, MARGIN, ly - 14, row[1]);
                ly -= 38;
            }

            // Right column: similarity badge (coloured by severity)
            Color simColor = d.getOverallSimilarity() >= 50 ? HIGH_RED
                           : d.getOverallSimilarity() >= 25 ? HIGH_ORANGE : HIGH_GREEN;
            drawRect(cs, col2 - 10, boxY - 25, 160, 90, simColor);
            float ry = boxY - 42;
            drawText(cs, regular, 8, Color.WHITE, col2, ry, "SIMILARITY SCORE");
            ry -= 22;
            drawText(cs, bold, 26, Color.WHITE, col2, ry, String.format("%.0f%%", d.getOverallSimilarity()));
            ry -= 18;
            drawText(cs, regular, 8, Color.WHITE, col2, ry,
                    d.getWordCount() + " words  |  " + d.getCharCount() + " chars");

            addFooter(cs, regular, bold, 1, 0, d.getSubmissionId(), "Cover Page");
        }
    }

    // ── Page 2: Integrity Overview ────────────────────────────────────────────

    private void addIntegrityOverviewPage(PDDocument doc, PlagiarismReportData d) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDFont bold = fontBold(doc), regular = fontRegular(doc);

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            addPageHeader(cs, bold, regular, 2, d.getSubmissionId(), "Integrity Overview");

            float y = H - 90;

            // ── Overall similarity hero number ────────────────────────────────
            String pctStr = String.format("%.0f%%", d.getOverallSimilarity());
            Color simColor = d.getOverallSimilarity() >= 50 ? HIGH_RED
                           : d.getOverallSimilarity() >= 25 ? HIGH_ORANGE : HIGH_GREEN;
            drawText(cs, bold, 36, simColor, MARGIN, y, pctStr + "  Overall Similarity");
            y -= 18;
            drawText(cs, regular, 9, TEXT_LIGHT, MARGIN, y,
                    "Combined similarity across internet sources, student papers, and publications.");
            y -= 22;
            drawRect(cs, MARGIN, y, CONTENT_W, 1, GREY_LINE);
            y -= 20;

            // ── Databases checked ─────────────────────────────────────────────
            drawText(cs, bold, 11, TEXT_DARK, MARGIN, y, "Databases Checked");
            y -= 16;
            float midX = W / 2 + 10;
            Object[][] dbs = {
                {d.getInternetSimilarity(),     "Internet Sources"},
                {d.getPublicationSimilarity(),  "Publications"},
                {d.getStudentPaperSimilarity(), "Student Papers"},
            };
            for (Object[] db : dbs) {
                double pct = (double) db[0];
                Color dbColor = pct >= 50 ? HIGH_RED : pct >= 25 ? HIGH_ORANGE : HIGH_GREEN;
                drawRect(cs, MARGIN, y - 8, 8, 8, dbColor);
                drawText(cs, bold, 10, TEXT_DARK, MARGIN + 14, y, String.format("%.1f%%", pct));
                drawText(cs, regular, 10, TEXT_MID, MARGIN + 55, y, (String) db[1]);
                y -= 18;
            }
            y -= 10;
            drawRect(cs, MARGIN, y, CONTENT_W, 1, GREY_LINE);
            y -= 20;

            // ── Match categories (left) + Filtered items (right) ─────────────
            drawText(cs, bold, 11, TEXT_DARK, MARGIN, y, "Match Categories");
            y -= 16;
            Object[][] matchGroups = {
                {new Color(190, 30, 30), d.getNotCitedOrQuotedPct(), "Not Cited or Quoted"},
                {HIGH_ORANGE,            d.getMissingQuotationsPct(), "Missing Quotations"},
                {HIGH_YELLOW,            d.getMissingCitationPct(),   "Missing Citation"},
                {HIGH_GREEN,             d.getCitedAndQuotedPct(),    "Cited and Quoted"},
            };
            float gy = y;
            for (Object[] g : matchGroups) {
                Color c = (Color) g[0]; double pct = (double) g[1];
                drawRect(cs, MARGIN, gy - 8, 10, 10, c);
                drawText(cs, bold, 9, TEXT_DARK, MARGIN + 16, gy, String.format("%.1f%%", pct));
                drawText(cs, regular, 9, TEXT_MID, MARGIN + 52, gy, (String) g[2]);
                gy -= 16;
            }

            // Filtered items (right column)
            float ry2 = y;
            drawText(cs, bold, 11, TEXT_DARK, midX, ry2, "Excluded from Analysis");
            ry2 -= 16;
            for (String item : List.of("Bibliography", "Quoted Text", "Matches < 8 words")) {
                drawText(cs, regular, 9, TEXT_MID, midX + 10, ry2, "»  " + item);
                ry2 -= 14;
            }

            y = Math.min(gy, ry2) - 16;
            drawRect(cs, MARGIN, y, CONTENT_W, 1, GREY_LINE);
            y -= 20;

            // ── Per-question similarity summary table ─────────────────────────
            List<QuestionSection> qs = d.getQuestionSections();
            if (qs != null && !qs.isEmpty()) {
                drawText(cs, bold, 11, TEXT_DARK, MARGIN, y, "Per-Question Similarity Summary");
                y -= 14;
                // Table header
                drawRect(cs, MARGIN, y - 12, CONTENT_W, 16, new Color(240, 240, 245));
                drawText(cs, bold, 8, TEXT_MID, MARGIN + 4,   y - 4, "Q#");
                drawText(cs, bold, 8, TEXT_MID, MARGIN + 28,  y - 4, "Question");
                drawText(cs, bold, 8, TEXT_MID, MARGIN + 255, y - 4, "Words");
                drawText(cs, bold, 8, TEXT_MID, MARGIN + 295, y - 4, "AI Mark");
                drawText(cs, bold, 8, TEXT_MID, MARGIN + 355, y - 4, "Similarity");
                drawText(cs, bold, 8, TEXT_MID, MARGIN + 415, y - 4, "Severity");
                y -= 18;
                for (QuestionSection q : qs) {
                    if (y < 80) break;
                    String sev = (q.getSimilaritySeverity() != null && !q.getSimilaritySeverity().isBlank())
                            ? q.getSimilaritySeverity().toUpperCase()
                            : (q.getSimilarityScore() >= 50 ? "HIGH" : q.getSimilarityScore() >= 25 ? "MEDIUM" : "LOW");
                    Color sevC = switch (sev) {
                        case "HIGH" -> BADGE_HIGH; case "MEDIUM" -> BADGE_MEDIUM; default -> BADGE_LOW;
                    };
                    // Truncate long question text for the table
                    String qtShort = q.getQuestionText();
                    if (qtShort != null && qtShort.length() > 45) qtShort = qtShort.substring(0, 42) + "...";
                    // aiGeneratedMark is the actual earned mark (e.g. 15.5 out of 20) — use directly
                    String markStr;
                    if (q.getMaxPoints() > 0 && q.getAiGeneratedMark() > 0) {
                        markStr = String.format("%.1f/%.0f", q.getAiGeneratedMark(), q.getMaxPoints());
                    } else {
                        markStr = "—";
                    }
                    drawText(cs, regular, 8, TEXT_DARK, MARGIN + 4,   y, String.valueOf(q.getQuestionNumber()));
                    drawText(cs, regular, 8, TEXT_DARK, MARGIN + 28,  y, qtShort != null ? qtShort : "");
                    drawText(cs, regular, 8, TEXT_DARK, MARGIN + 255, y, String.valueOf(q.getWordCount()));
                    drawText(cs, bold,    8, TEXT_DARK, MARGIN + 295, y, markStr);
                    drawText(cs, bold,    8, sevC,      MARGIN + 355, y, String.format("%.1f%%", q.getSimilarityScore()));
                    drawText(cs, bold,    8, sevC,      MARGIN + 415, y, sev);
                    y -= 14;
                    drawRect(cs, MARGIN, y + 2, CONTENT_W, 0.5f, GREY_LINE);
                }
            }

            addFooter(cs, regular, bold, 2, 0, d.getSubmissionId(), "Integrity Overview");
        }
    }

    // ── Top Sources page (no longer in main flow — kept as dead code) ─────────

    @SuppressWarnings("unused")
    private void addTopSourcesPage(PDDocument doc, PlagiarismReportData d) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDFont bold = fontBold(doc), regular = fontRegular(doc);

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            addPageHeader(cs, bold, regular, 3, d.getSubmissionId(), "Top Sources");

            float y = H - 90;
            drawText(cs, bold, 12, TEXT_DARK, MARGIN, y, "Top Sources");
            y -= 15;
            drawText(cs, regular, 9, TEXT_LIGHT, MARGIN, y,
                    "The sources with the highest number of matches within the submission.");
            y -= 30;

            List<TopSource> sources = d.getTopSources();
            if (sources.isEmpty()) {
                drawText(cs, regular, 11, TEXT_MID, MARGIN, y, "No significant sources detected.");
            } else {
                for (TopSource src : sources) {
                    if (y < 120) break;
                    int rank = src.getRank();
                    Color c = SOURCE_COLORS[Math.min(rank - 1, SOURCE_COLORS.length - 1)];

                    drawCircle(cs, MARGIN + 12, y - 4, 12, c);
                    drawTextCentered(cs, bold, 9, Color.WHITE, MARGIN + 12, y - 8, String.valueOf(rank), 24);

                    float badgeX = MARGIN + 32;
                    drawRoundRect(cs, badgeX, y - 14, 90, 16, new Color(230, 230, 230));
                    drawText(cs, regular, 8, TEXT_MID, badgeX + 5, y - 8, src.getType());

                    float labelX = badgeX + 98;
                    float pctX   = W - MARGIN - 30;
                    String label = src.getLabel();
                    if (label != null && label.length() > 55) label = label.substring(0, 52) + "...";
                    drawText(cs, bold, 10, TEXT_DARK, labelX, y, label != null ? label : "");
                    drawText(cs, bold, 11, c, pctX, y, String.format("%.0f%%", src.getSimilarityPct()));

                    if (src.getMatchedExcerpt() != null && !src.getMatchedExcerpt().isBlank()) {
                        y -= 14;
                        String excerpt = src.getMatchedExcerpt();
                        if (excerpt.length() > 80) excerpt = excerpt.substring(0, 77) + "...";
                        drawText(cs, regular, 8, TEXT_LIGHT, labelX, y, excerpt);
                    }

                    y -= 8;
                    drawRect(cs, MARGIN, y, CONTENT_W, 0.5f, GREY_LINE);
                    y -= 18;
                }
            }

            addFooter(cs, regular, bold, 3, 0, d.getSubmissionId(), "Top Sources");
        }
    }

    // ── Pages 3+: Per-Question Detail Pages (Turnitin-style) ─────────────────

    private void addQuestionDetailPages(PDDocument doc, PlagiarismReportData data,
                                         int startPageNum) throws Exception {
        PDFont bold = fontBold(doc), regular = fontRegular(doc), oblique = fontOblique(doc);
        int pageNum = startPageNum;

        for (QuestionSection q : data.getQuestionSections()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(doc, page);
            String section = "Question " + q.getQuestionNumber();
            addPageHeader(cs, bold, regular, pageNum, data.getSubmissionId(), section);

            float y = H - 90;

            // ── Q badge + question text ──────────────────────────────────────
            drawRect(cs, MARGIN, y - 3, 26, 18, BRAND_BLUE);
            drawTextCentered(cs, bold, 9, Color.WHITE, MARGIN + 13, y + 1, "Q" + q.getQuestionNumber(), 26);
            y = drawWrappedText(cs, bold, 11, TEXT_DARK, MARGIN + 33, y, q.getQuestionText(), CONTENT_W - 33);
            y -= 8;

            // ── Similarity + severity badge ──────────────────────────────────
            String sev = (q.getSimilaritySeverity() != null && !q.getSimilaritySeverity().isBlank())
                    ? q.getSimilaritySeverity().toUpperCase()
                    : (q.getSimilarityScore() >= 50 ? "HIGH" : q.getSimilarityScore() >= 25 ? "MEDIUM" : "LOW");
            Color sevColor = switch (sev) {
                case "HIGH"   -> BADGE_HIGH;
                case "MEDIUM" -> BADGE_MEDIUM;
                default       -> BADGE_LOW;
            };
            String simLabel = q.getSimilarityScore() > 0
                    ? String.format("Similarity: %.1f%%  |  %s", q.getSimilarityScore(), sev)
                    : "Similarity: 0.0%  |  CLEAN";
            drawRect(cs, MARGIN, y - 3, 175, 15, q.getSimilarityScore() > 0 ? sevColor : BADGE_LOW);
            drawText(cs, bold, 8, Color.WHITE, MARGIN + 4, y + 1, simLabel);
            y -= 22;

            // ════════════════════════════════════════════════════════════════
            // SECTION 1: PLAGIARISM ANALYSIS
            // ════════════════════════════════════════════════════════════════
            drawRect(cs, MARGIN, y, CONTENT_W, 0.5f, GREY_LINE);
            y -= 14;
            drawRect(cs, MARGIN, y - 3, CONTENT_W, 16, new Color(245, 247, 252));
            drawText(cs, bold, 10, BRAND_BLUE, MARGIN + 4, y + 6, "PLAGIARISM ANALYSIS");
            y -= 20;

            // Databases checked row
            drawText(cs, bold, 9, TEXT_DARK, MARGIN, y, "Checked against:");
            float dbX = MARGIN + 100;
            Object[][] dbRows = {
                {data.getInternetSimilarity(),     "Internet Sources"},
                {data.getStudentPaperSimilarity(), "Student Papers"},
                {data.getPublicationSimilarity(),  "Publications"},
            };
            for (Object[] db : dbRows) {
                double pct = (double) db[0];
                Color dbC = pct >= 50 ? HIGH_RED : pct >= 25 ? HIGH_ORANGE : HIGH_GREEN;
                drawText(cs, bold, 9, dbC, dbX, y, String.format("%.1f%%", pct));
                drawText(cs, regular, 9, TEXT_MID, dbX + 35, y, (String) db[1]);
                dbX += 140;
            }
            y -= 14;

            // Per-question sources (from SMS plagiarismSources), falling back to submission-level topSources
            List<TopSource> sources = (q.getSources() != null && !q.getSources().isEmpty())
                    ? q.getSources() : data.getTopSources();
            if (sources != null && !sources.isEmpty()) {
                drawText(cs, bold, 9, TEXT_DARK, MARGIN, y, "Matched Sources:");
                y -= 13;
                int shown = 0;
                for (TopSource src : sources) {
                    if (shown >= 3 || y < 140) break;
                    int rank = src.getRank();
                    Color sc = SOURCE_COLORS[Math.min(rank - 1, SOURCE_COLORS.length - 1)];
                    drawCircle(cs, MARGIN + 8, y - 3, 7, sc);
                    drawTextCentered(cs, bold, 7, Color.WHITE, MARGIN + 8, y - 6, String.valueOf(rank), 14);
                    String lbl = src.getLabel();
                    if (lbl != null && lbl.length() > 58) lbl = lbl.substring(0, 55) + "...";
                    drawText(cs, regular, 8, TEXT_DARK, MARGIN + 20, y, lbl != null ? lbl : "");
                    drawText(cs, bold, 8, sc, MARGIN + 390, y, String.format("%.1f%%", src.getSimilarityPct()));
                    drawText(cs, regular, 7, TEXT_LIGHT, MARGIN + 430, y, src.getType());
                    y -= 12;
                    shown++;
                }
            } else if (q.getSimilarityScore() > 0) {
                // No DB records but we have a score — explain the source type
                drawText(cs, oblique, 8, TEXT_MID, MARGIN, y,
                        "Matched against internet sources. Detailed URL breakdown requires full integrity scan.");
                y -= 12;
            } else {
                drawText(cs, oblique, 8, BADGE_LOW, MARGIN, y, "No similarity detected for this answer.");
                y -= 12;
            }
            y -= 6;

            // ════════════════════════════════════════════════════════════════
            // SECTION 2: STUDENT ANSWER
            // ════════════════════════════════════════════════════════════════
            drawRect(cs, MARGIN, y, CONTENT_W, 0.5f, GREY_LINE);
            y -= 14;
            drawRect(cs, MARGIN, y - 3, CONTENT_W, 16, new Color(245, 247, 252));
            drawText(cs, bold, 10, BRAND_BLUE, MARGIN + 4, y + 6, "STUDENT ANSWER");
            drawText(cs, regular, 8, TEXT_LIGHT, MARGIN + 135, y + 6, "(" + q.getWordCount() + " words)");
            y -= 20;

            String answerText = (q.getAnswerText() != null && !q.getAnswerText().isBlank())
                    ? q.getAnswerText() : "(No answer provided)";
            float textSize = 9.5f, lineH = 13.5f, x = MARGIN;
            // minY: leave room for AI scores section at bottom
            float minY = 200f;

            for (String token : answerText.split("(?<=\\s)|(?=\\s)")) {
                if (token.equals("\n") || token.equals("\r\n") || token.equals("\r")) {
                    x = MARGIN; y -= lineH;
                } else {
                    float wordW;
                    try { wordW = regular.getStringWidth(sanitiseText(token)) / 1000f * textSize; }
                    catch (Exception e) { wordW = token.length() * 4.5f; }

                    if (x + wordW > W - MARGIN && x > MARGIN) { x = MARGIN; y -= lineH; }

                    if (y < minY) {
                        addFooter(cs, regular, bold, pageNum, 0, data.getSubmissionId(), section);
                        cs.close(); pageNum++;
                        page = new PDPage(PDRectangle.A4); doc.addPage(page);
                        cs = new PDPageContentStream(doc, page);
                        addPageHeader(cs, bold, regular, pageNum, data.getSubmissionId(), section + " (cont.)");
                        y = H - 90; x = MARGIN; minY = 200f;
                    }

                    String safe = sanitiseText(token);
                    if (!safe.isBlank()) {
                        cs.beginText(); cs.setFont(regular, textSize);
                        cs.setNonStrokingColor(TEXT_DARK);
                        cs.newLineAtOffset(x, y); cs.showText(safe); cs.endText();
                    }
                    x += wordW;
                }
            }
            y -= 16;

            // ════════════════════════════════════════════════════════════════
            // SECTION 3: AI WRITING QUALITY ASSESSMENT
            // ════════════════════════════════════════════════════════════════
            boolean hasAiScores = q.getRelevanceScore() > 0 || q.getCompletenessScore() > 0
                    || q.getClarityScore() > 0 || q.getGrammarScore() > 0;
            boolean hasStrengths    = q.getStrengths()    != null && !q.getStrengths().isEmpty();
            boolean hasImprovements = q.getImprovements() != null && !q.getImprovements().isEmpty();

            float neededH = (hasAiScores ? 100 : 0)
                    + (hasStrengths    ? 20 + q.getStrengths().size()    * 14 : 0)
                    + (hasImprovements ? 20 + q.getImprovements().size() * 14 : 0);

            if (y - neededH < 60 && neededH > 0) {
                addFooter(cs, regular, bold, pageNum, 0, data.getSubmissionId(), section);
                cs.close(); pageNum++;
                page = new PDPage(PDRectangle.A4); doc.addPage(page);
                cs = new PDPageContentStream(doc, page);
                addPageHeader(cs, bold, regular, pageNum, data.getSubmissionId(), section + " - Feedback");
                y = H - 90;
            }

            if (hasAiScores || hasStrengths || hasImprovements) {
                drawRect(cs, MARGIN, y, CONTENT_W, 0.5f, GREY_LINE);
                y -= 14;
                drawRect(cs, MARGIN, y - 3, CONTENT_W, 16, new Color(245, 247, 252));
                drawText(cs, bold, 10, BRAND_BLUE, MARGIN + 4, y + 6, "AI WRITING QUALITY ASSESSMENT");

                // Show earned mark / max mark when both are available
                // aiGeneratedMark is actual earned mark (e.g. 15.5 out of 20) — use directly
                double maxPts = q.getMaxPoints();
                double aiMark = q.getAiGeneratedMark();
                if (maxPts > 0 && aiMark > 0) {
                    String markStr = String.format("%.1f / %.0f marks", aiMark, maxPts);
                    float markX = MARGIN + CONTENT_W - bold.getStringWidth(markStr) / 1000f * 10 - 4;
                    drawText(cs, bold, 10, BRAND_BLUE, markX, y + 6, markStr);
                }
                y -= 20;
            }

            if (hasAiScores) {
                float labelW = 100, scoreW = 40, barX = MARGIN + labelW + scoreW, barW = 200;
                String[] scoreLabels = {"Relevance", "Completeness", "Clarity", "Grammar"};
                double[] scoreVals   = {q.getRelevanceScore(), q.getCompletenessScore(),
                                        q.getClarityScore(),   q.getGrammarScore()};
                for (int i = 0; i < scoreLabels.length; i++) {
                    drawText(cs, regular, 9, TEXT_MID, MARGIN, y, scoreLabels[i] + ":");
                    drawText(cs, bold, 9, TEXT_DARK, MARGIN + labelW, y,
                            String.format("%.1f / 10", scoreVals[i]));
                    float barY = y - 2;
                    drawRect(cs, barX, barY, barW, 9, new Color(230, 230, 230));
                    double pct = Math.min(scoreVals[i] / 10.0, 1.0);
                    Color barColor = pct >= 0.7 ? HIGH_GREEN : pct >= 0.4 ? HIGH_ORANGE : HIGH_RED;
                    if (pct > 0) drawRect(cs, barX, barY, (float)(barW * pct), 9, barColor);
                    y -= 18;
                }
                y -= 6;
            }

            if (hasStrengths) {
                drawText(cs, bold, 10, TEXT_DARK, MARGIN, y, "Strengths");
                y -= 14;
                for (String s : q.getStrengths())
                    y = drawWrappedBullet(cs, regular, 9, TEXT_MID, MARGIN, y, s, CONTENT_W);
                y -= 4;
            }

            if (hasImprovements) {
                drawText(cs, bold, 10, TEXT_DARK, MARGIN, y, "Areas for Improvement");
                y -= 14;
                for (String s : q.getImprovements())
                    y = drawWrappedBullet(cs, regular, 9, TEXT_MID, MARGIN, y, s, CONTENT_W);
            }

            addFooter(cs, regular, bold, pageNum, 0, data.getSubmissionId(), section);
            cs.close();
            pageNum++;
        }
    }

    // ── Legacy highlighted content pages (fallback when no QuestionSections) ──

    private void addHighlightedContentPages(PDDocument doc, PlagiarismReportData d) throws Exception {
        PDFont bold = fontBold(doc), regular = fontRegular(doc);
        String text = d.getAnswerText();
        if (text == null || text.isBlank()) text = "(No text content available)";

        List<TextHighlight> highlights = d.getHighlights();
        int len = text.length();
        Color[] charColors = new Color[len];

        for (TextHighlight h : highlights) {
            int start = Math.max(0, h.getStartIndex());
            int end   = Math.min(len, h.getEndIndex());
            Color hColor = getHighlightColor(h.getStatus());
            for (int i = start; i < end; i++) charColors[i] = hColor;
        }

        List<Segment> segments = buildSegments(text, charColors, highlights);

        float lineH = 14f, textSize = 10f, maxY = H - 90, minY = 70f, y = maxY;
        int pageNum = 4;

        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDPageContentStream cs = new PDPageContentStream(doc, page);
        addPageHeader(cs, bold, regular, pageNum, d.getSubmissionId(), "Integrity Submission");

        cs.beginText();
        cs.setFont(bold, 12);
        cs.setNonStrokingColor(TEXT_DARK);
        cs.newLineAtOffset(MARGIN, y);
        cs.showText(d.getAssignmentTitle() != null ? d.getAssignmentTitle() : "Student Submission");
        cs.endText();
        y -= 20;

        float x = MARGIN;
        for (Segment seg : segments) {
            String[] words = seg.text().split("(?<=\\s)|(?=\\s)");
            for (String word : words) {
                if (word.equals("\n") || word.equals("\r\n")) {
                    x = MARGIN; y -= lineH;
                    if (y < minY) {
                        addFooter(cs, regular, bold, pageNum, 0, d.getSubmissionId(), "Integrity Submission");
                        cs.close(); pageNum++;
                        page = new PDPage(PDRectangle.A4); doc.addPage(page);
                        cs = new PDPageContentStream(doc, page);
                        addPageHeader(cs, bold, regular, pageNum, d.getSubmissionId(), "Integrity Submission");
                        y = maxY; x = MARGIN;
                    }
                    continue;
                }
                float wordW;
                try { wordW = regular.getStringWidth(sanitiseText(word)) / 1000 * textSize; }
                catch (Exception e) { wordW = word.length() * 5f; }

                if (x + wordW > W - MARGIN && x > MARGIN) {
                    x = MARGIN; y -= lineH;
                    if (y < minY) {
                        addFooter(cs, regular, bold, pageNum, 0, d.getSubmissionId(), "Integrity Submission");
                        cs.close(); pageNum++;
                        page = new PDPage(PDRectangle.A4); doc.addPage(page);
                        cs = new PDPageContentStream(doc, page);
                        addPageHeader(cs, bold, regular, pageNum, d.getSubmissionId(), "Integrity Submission");
                        y = maxY; x = MARGIN;
                    }
                }
                if (seg.highlightColor() != null) {
                    Color hl = seg.highlightColor();
                    drawRect(cs, x, y - 2, wordW, lineH, new Color(hl.getRed(), hl.getGreen(), hl.getBlue(), 80));
                }
                String safe = sanitiseText(word);
                if (!safe.isBlank()) {
                    cs.beginText(); cs.setFont(regular, textSize); cs.setNonStrokingColor(TEXT_DARK);
                    cs.newLineAtOffset(x, y); cs.showText(safe); cs.endText();
                }
                x += wordW;
            }
        }
        addFooter(cs, regular, bold, pageNum, 0, d.getSubmissionId(), "Integrity Submission");
        cs.close();
    }

    // ── AI Analysis Summary Page (used only when no per-question sections) ────

    private void addAiAnalysisPage(PDDocument doc, PlagiarismReportData d) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDFont bold = fontBold(doc), regular = fontRegular(doc);
        AiFeedbackSection ai = d.getAiFeedback();
        int pageNum = doc.getNumberOfPages();

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            addPageHeader(cs, bold, regular, pageNum, d.getSubmissionId(), "AI Analysis");

            float y = H - 90;
            drawText(cs, bold, 14, TEXT_DARK, MARGIN, y, "Writing Quality Analysis");
            y -= 30;

            String[][] scores = {
                {"Relevance Score",    String.format("%.1f", ai.getRelevanceScore())},
                {"Completeness Score", String.format("%.1f", ai.getCompletenessScore())},
                {"Clarity Score",      String.format("%.1f", ai.getClarityScore())},
                {"Grammar Score",      String.format("%.1f", ai.getGrammarScore())},
            };
            double[] scoreVals = {
                ai.getRelevanceScore(), ai.getCompletenessScore(),
                ai.getClarityScore(),   ai.getGrammarScore()
            };

            for (int i = 0; i < scores.length; i++) {
                drawText(cs, regular, 10, TEXT_DARK, MARGIN, y, scores[i][0] + ":");
                drawText(cs, bold, 10, TEXT_DARK, MARGIN + 140, y, scores[i][1] + " / 10");
                float barX = MARGIN + 200, barY = y - 3, barW = 200, barH = 10;
                drawRect(cs, barX, barY, barW, barH, new Color(230, 230, 230));
                double pct = scoreVals[i] / 10.0;
                Color barColor = pct >= 0.7 ? HIGH_GREEN : pct >= 0.4 ? HIGH_ORANGE : HIGH_RED;
                if (pct > 0) drawRect(cs, barX, barY, (float)(barW * Math.min(pct, 1.0)), barH, barColor);
                y -= 24;
            }

            y -= 20;
            drawRect(cs, MARGIN, y, CONTENT_W, 1, GREY_LINE);
            y -= 20;

            if (ai.getStrengths() != null && !ai.getStrengths().isEmpty()) {
                drawText(cs, bold, 11, TEXT_DARK, MARGIN, y, "Strengths");
                y -= 16;
                for (String s : ai.getStrengths()) {
                    y = drawWrappedBullet(cs, regular, 9, TEXT_MID, MARGIN, y, s, CONTENT_W);
                }
                y -= 10;
            }

            if (ai.getImprovements() != null && !ai.getImprovements().isEmpty()) {
                drawText(cs, bold, 11, TEXT_DARK, MARGIN, y, "Areas for Improvement");
                y -= 16;
                for (String s : ai.getImprovements()) {
                    y = drawWrappedBullet(cs, regular, 9, TEXT_MID, MARGIN, y, s, CONTENT_W);
                }
            }

            addFooter(cs, regular, bold, pageNum, 0, d.getSubmissionId(), "AI Analysis");
        }
    }

    // ── Shared chrome ─────────────────────────────────────────────────────────

    private void addPageHeader(PDPageContentStream cs, PDFont bold, PDFont regular,
                                int pageNum, String submissionId, String section) throws Exception {
        drawRect(cs, 0, H - 50, W, 50, BRAND_BLUE);
        drawText(cs, bold, 10, Color.WHITE, MARGIN, H - 33, "Smart LMS");
        drawText(cs, regular, 9, Color.WHITE, MARGIN + 70, H - 33, "Page " + pageNum + "  -  " + section);
        drawText(cs, regular, 9, Color.WHITE, W - 220, H - 33, "Submission ID  " + submissionId);
    }

    private void addFooter(PDPageContentStream cs, PDFont regular, PDFont bold,
                            int pageNum, int unused, String submissionId, String section) throws Exception {
        drawRect(cs, 0, 45, W, 1, GREY_LINE);
        drawText(cs, bold, 8, TEXT_MID, MARGIN, 32, "Smart LMS");
        drawText(cs, regular, 8, TEXT_LIGHT, MARGIN + 60, 32, "Page " + pageNum + "  -  " + section);
        drawText(cs, regular, 8, TEXT_LIGHT, W - 230, 32, "Submission ID  " + submissionId);
    }

    // ── Drawing utilities ─────────────────────────────────────────────────────

    private void drawRect(PDPageContentStream cs, float x, float y, float w, float h, Color color) throws Exception {
        cs.setNonStrokingColor(color);
        cs.addRect(x, y, w, h);
        cs.fill();
        cs.setNonStrokingColor(Color.BLACK);
    }

    private void drawRoundRect(PDPageContentStream cs, float x, float y, float w, float h, Color color) throws Exception {
        drawRect(cs, x, y, w, h, color);
    }

    private void drawCircle(PDPageContentStream cs, float cx, float cy, float r, Color color) throws Exception {
        cs.setNonStrokingColor(color);
        float k = 0.5523f * r;
        cs.moveTo(cx - r, cy);
        cs.curveTo(cx - r, cy + k, cx - k, cy + r, cx, cy + r);
        cs.curveTo(cx + k, cy + r, cx + r, cy + k, cx + r, cy);
        cs.curveTo(cx + r, cy - k, cx + k, cy - r, cx, cy - r);
        cs.curveTo(cx - k, cy - r, cx - r, cy - k, cx - r, cy);
        cs.closePath();
        cs.fill();
        cs.setNonStrokingColor(Color.BLACK);
    }

    private void drawText(PDPageContentStream cs, PDFont font, float size, Color color,
                           float x, float y, String text) throws Exception {
        if (text == null || text.isBlank()) return;
        cs.beginText();
        cs.setFont(font, size);
        cs.setNonStrokingColor(color);
        cs.newLineAtOffset(x, y);
        cs.showText(sanitiseText(text));
        cs.endText();
    }

    private void drawTextCentered(PDPageContentStream cs, PDFont font, float size, Color color,
                                   float cx, float y, String text, float boxW) throws Exception {
        if (text == null || text.isBlank()) return;
        float tw = font.getStringWidth(sanitiseText(text)) / 1000 * size;
        drawText(cs, font, size, color, cx - tw / 2, y, text);
    }

    /**
     * Draws wrapped text (no bullet prefix). Returns the y position after the last line.
     */
    private float drawWrappedText(PDPageContentStream cs, PDFont font, float size, Color color,
                                   float x, float y, String text, float maxW) throws Exception {
        if (text == null || text.isBlank()) return y;
        float lineH = size * 1.45f;
        String[] words = text.split("\\s+");
        StringBuilder line = new StringBuilder();
        float lineW = 0;

        for (String word : words) {
            String safe = sanitiseText(word);
            float wordW;
            try { wordW = font.getStringWidth(safe + " ") / 1000f * size; }
            catch (Exception e) { wordW = safe.length() * 4f; }

            if (lineW + wordW > maxW && line.length() > 0) {
                drawText(cs, font, size, color, x, y, line.toString().trim());
                y -= lineH;
                line = new StringBuilder();
                lineW = 0;
            }
            line.append(word).append(" ");
            lineW += wordW;
        }
        if (line.length() > 0) {
            drawText(cs, font, size, color, x, y, line.toString().trim());
            y -= lineH;
        }
        return y;
    }

    private float drawWrappedBullet(PDPageContentStream cs, PDFont font, float size, Color color,
                                     float x, float y, String text, float maxW) throws Exception {
        String bullet = "- ";
        float bulletW = font.getStringWidth(bullet) / 1000 * size;
        String[] words = text.split("\\s+");
        StringBuilder line = new StringBuilder();
        float lineW = bulletW;
        boolean firstLine = true;

        for (String word : words) {
            float wordW;
            try { wordW = font.getStringWidth(word + " ") / 1000 * size; }
            catch (Exception e) { wordW = word.length() * 4f; }

            if (lineW + wordW > maxW && line.length() > 0) {
                String prefix = firstLine ? bullet : "  ";
                drawText(cs, font, size, color, x, y, prefix + line.toString().trim());
                y -= 13;
                line = new StringBuilder();
                lineW = bulletW;
                firstLine = false;
            }
            line.append(word).append(" ");
            lineW += wordW;
        }
        if (line.length() > 0) {
            String prefix = firstLine ? bullet : "  ";
            drawText(cs, font, size, color, x, y, prefix + line.toString().trim());
            y -= 13;
        }
        return y;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private record Segment(String text, Color highlightColor, int sourceRank) {}

    private List<Segment> buildSegments(String text, Color[] charColors, List<TextHighlight> highlights) {
        List<Segment> segs = new ArrayList<>();
        if (text.isEmpty()) return segs;
        int[] rankArr = new int[text.length()];
        for (TextHighlight h : highlights) {
            int start = Math.max(0, h.getStartIndex());
            int end   = Math.min(text.length(), h.getEndIndex());
            for (int i = start; i < end; i++) rankArr[i] = h.getSourceRank();
        }
        int i = 0;
        while (i < text.length()) {
            Color cur = charColors[i]; int rank = rankArr[i]; int j = i + 1;
            while (j < text.length() && colorEquals(charColors[j], cur) && rankArr[j] == rank) j++;
            segs.add(new Segment(text.substring(i, j), cur, rank));
            i = j;
        }
        return segs;
    }

    private boolean colorEquals(Color a, Color b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.getRGB() == b.getRGB();
    }

    private Color getHighlightColor(String status) {
        if (status == null) return null;
        return switch (status) {
            case "NOT_CITED_OR_QUOTED" -> HIGH_RED;
            case "MISSING_QUOTATIONS"  -> HIGH_ORANGE;
            case "MISSING_CITATION"    -> HIGH_YELLOW;
            case "CITED_AND_QUOTED"    -> HIGH_GREEN;
            default -> null;
        };
    }

    /**
     * Replaces characters outside the Helvetica / Latin-1 printable range with safe equivalents.
     * Smart quotes, em dashes, ellipses, and other common Unicode typographic characters
     * are mapped to their ASCII counterparts before the catch-all "?" replacement.
     */
    private String sanitiseText(String s) {
        if (s == null) return "";
        return s
                // Smart single quotes -> ASCII apostrophe
                .replace("‘", "'").replace("’", "'")
                // Smart double quotes -> ASCII double-quote
                .replace("“", "\"").replace("”", "\"")
                // Ellipsis -> three dots
                .replace("…", "...")
                // Em dash, en dash -> hyphen
                .replace("—", "-").replace("–", "-")
                // Bullet -> dash
                .replace("•", "-")
                // Non-breaking hyphen -> hyphen
                .replace("‑", "-")
                // Any remaining character outside Basic Latin (0020-007E) + Latin Supplement (00A0-00FF) -> ?
                .replaceAll("[^ -~ -ÿ]", "?");
    }

}
