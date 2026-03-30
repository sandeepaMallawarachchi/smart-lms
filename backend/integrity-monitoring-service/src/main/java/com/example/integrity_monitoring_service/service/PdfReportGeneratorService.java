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
 * Generates professional PDF plagiarism reports similar to Turnitin's format.
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
    private static final Color HIGH_RED         = new Color(255, 90, 90);
    private static final Color HIGH_ORANGE      = new Color(255, 165, 50);
    private static final Color HIGH_YELLOW      = new Color(255, 215, 0);
    private static final Color HIGH_GREEN       = new Color(100, 210, 100);

    // Source badge colours (up to 8 sources)
    private static final Color[] SOURCE_COLORS = {
        new Color(220, 38, 38),  new Color(234, 88, 12),  new Color(202, 138, 4),
        new Color(22, 163, 74),  new Color(37, 99, 235),  new Color(109, 40, 217),
        new Color(219, 39, 119), new Color(6, 148, 162)
    };

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("MMM dd, yyyy, hh:mm a");

    // ── Fonts (loaded once per document) ─────────────────────────────────────
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

    @Async("plagiarismTaskExecutor")
    public CompletableFuture<byte[]> generatePlagiarismReport(PlagiarismReportData data) {
        try {
            return CompletableFuture.completedFuture(buildPdf(data));
        } catch (Exception e) {
            log.error("[PDF] Error generating plagiarism report: {}", e.getMessage(), e);
            CompletableFuture<byte[]> failed = new CompletableFuture<>();
            failed.completeExceptionally(new RuntimeException("PDF generation failed: " + e.getMessage(), e));
            return failed;
        }
    }

    @Async("plagiarismTaskExecutor")
    public CompletableFuture<byte[]> generateFeedbackReport(PlagiarismReportData data) {
        try {
            return CompletableFuture.completedFuture(buildPdf(data));
        } catch (Exception e) {
            log.error("[PDF] Error generating feedback report: {}", e.getMessage(), e);
            CompletableFuture<byte[]> failed = new CompletableFuture<>();
            failed.completeExceptionally(new RuntimeException("PDF generation failed: " + e.getMessage(), e));
            return failed;
        }
    }

    /** Synchronous PDF build — called by both public async entry points. */
    private byte[] buildPdf(PlagiarismReportData data) throws Exception {
        try (PDDocument doc = new PDDocument()) {
            int totalPages = 3 + estimateContentPages(data.getAnswerText()) + 1;
            addCoverPage(doc, data, totalPages);
            addIntegrityOverviewPage(doc, data, totalPages);
            addTopSourcesPage(doc, data, totalPages);
            addHighlightedContentPages(doc, data, totalPages);
            if (data.getAiFeedback() != null) {
                addAiAnalysisPage(doc, data, totalPages);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    // ── Page 1: Cover ─────────────────────────────────────────────────────────

    private void addCoverPage(PDDocument doc, PlagiarismReportData d, int totalPages) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDFont bold = fontBold(doc), regular = fontRegular(doc);

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            // Header bar
            drawRect(cs, 0, H - 50, W, 50, BRAND_BLUE);
            drawText(cs, bold, 10, Color.WHITE, MARGIN, H - 33, "Smart LMS");
            drawText(cs, regular, 9, Color.WHITE, MARGIN + 70, H - 33,
                    "Page 1 of " + totalPages + " - Cover Page");
            drawText(cs, regular, 9, Color.WHITE, W - 220, H - 33,
                    "Submission ID  " + d.getSubmissionId());

            // Student name (large)
            float nameY = H - 200;
            drawText(cs, bold, 28, TEXT_DARK, MARGIN, nameY, d.getStudentName());

            // Assignment title
            drawText(cs, bold, 18, TEXT_DARK, MARGIN, nameY - 45, d.getAssignmentTitle());

            // Course
            drawText(cs, regular, 12, TEXT_MID, MARGIN, nameY - 70,
                    "\u25A0  " + d.getCourseName());

            // Divider
            drawRect(cs, MARGIN, nameY - 95, CONTENT_W, 1, GREY_LINE);

            // Document Details box
            float boxY = nameY - 110;
            drawText(cs, bold, 14, TEXT_DARK, MARGIN, boxY, "Document Details");

            float col2 = W - 190;
            // Left column
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

            // Right column — stats box
            drawRect(cs, col2 - 10, boxY - 25, 160, 80, BRAND_BLUE_LIGHT);
            float ry = boxY - 40;
            String[][] rightStats = {
                {d.getWordCount() + " Words"},
                {d.getCharCount() + " Characters"},
            };
            for (String[] row : rightStats) {
                drawText(cs, bold, 11, TEXT_DARK, col2, ry, row[0]);
                ry -= 22;
            }

            // Footer
            addFooter(cs, regular, bold, 1, totalPages, d.getSubmissionId(), "Cover Page");
        }
    }

    // ── Page 2: Integrity Overview ────────────────────────────────────────────

    private void addIntegrityOverviewPage(PDDocument doc, PlagiarismReportData d, int totalPages) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDFont bold = fontBold(doc), regular = fontRegular(doc);

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            addPageHeader(cs, bold, regular, 2, totalPages, d.getSubmissionId(), "Integrity Overview");

            float y = H - 90;

            // Big similarity number
            String pctStr = String.format("%.0f%%", d.getOverallSimilarity());
            Color simColor = d.getOverallSimilarity() >= 50 ? HIGH_RED
                           : d.getOverallSimilarity() >= 25 ? HIGH_ORANGE : HIGH_GREEN;
            drawText(cs, bold, 36, simColor, MARGIN, y, pctStr + "  Overall Similarity");

            y -= 20;
            drawText(cs, regular, 9, TEXT_LIGHT, MARGIN, y,
                    "The combined total of all matches, including overlapping sources, for each database.");

            y -= 30;
            drawRect(cs, MARGIN, y, CONTENT_W, 1, GREY_LINE);
            y -= 20;

            // Filtered from Report
            drawText(cs, bold, 11, TEXT_DARK, MARGIN, y, "Filtered from the Report");
            y -= 18;
            for (String item : List.of("Bibliography", "Quoted Text", "Small Matches (less than 8 words)")) {
                drawText(cs, regular, 9, TEXT_MID, MARGIN + 10, y, "\u25B8  " + item);
                y -= 14;
            }

            y -= 20;
            drawRect(cs, MARGIN, y, CONTENT_W, 1, GREY_LINE);
            y -= 30;

            // Two columns
            float midX = W / 2 + 10;

            // Left: Match Groups
            drawText(cs, bold, 12, TEXT_DARK, MARGIN, y, "Match Groups");
            y -= 20;
            Object[][] matchGroups = {
                {new Color(190, 30, 30),  d.getNotCitedOrQuotedPct(), "Not Cited or Quoted",
                 "Matches with neither in-text citation nor quotation marks"},
                {HIGH_ORANGE, d.getMissingQuotationsPct(), "Missing Quotations",
                 "Matches that are still very similar to source material"},
                {HIGH_YELLOW, d.getMissingCitationPct(), "Missing Citation",
                 "Matches that have quotation marks, but no in-text citation"},
                {HIGH_GREEN, d.getCitedAndQuotedPct(), "Cited and Quoted",
                 "Matches with in-text citation present, but no quotation marks"},
            };
            float gy = y;
            for (Object[] g : matchGroups) {
                Color c = (Color) g[0]; double pct = (double) g[1];
                drawRect(cs, MARGIN, gy - 10, 14, 14, c);
                drawText(cs, bold, 10, TEXT_DARK, MARGIN + 20, gy,
                        String.format("%.0f", pct) + " " + g[2] + "  " + String.format("%.1f%%", pct));
                gy -= 14;
                drawText(cs, regular, 8, TEXT_LIGHT, MARGIN + 20, gy, (String) g[3]);
                gy -= 22;
            }

            // Right: Top Sources
            float rsy = y;
            drawText(cs, bold, 12, TEXT_DARK, midX, rsy, "Top Sources");
            rsy -= 20;
            Object[][] topSrcTypes = {
                {d.getInternetSimilarity(),     "Internet sources"},
                {d.getPublicationSimilarity(),  "Publications"},
                {d.getStudentPaperSimilarity(), "Submitted works (Student Papers)"},
            };
            for (Object[] src : topSrcTypes) {
                double pct = (double) src[0];
                drawText(cs, bold, 11, TEXT_DARK, midX, rsy,
                        String.format("%.0f%%  ", pct));
                drawText(cs, regular, 10, TEXT_MID, midX + 40, rsy, (String) src[1]);
                rsy -= 22;
            }

            addFooter(cs, regular, bold, 2, totalPages, d.getSubmissionId(), "Integrity Overview");
        }
    }

    // ── Page 3: Top Sources ───────────────────────────────────────────────────

    private void addTopSourcesPage(PDDocument doc, PlagiarismReportData d, int totalPages) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDFont bold = fontBold(doc), regular = fontRegular(doc);

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            addPageHeader(cs, bold, regular, 3, totalPages, d.getSubmissionId(), "Integrity Overview");

            float y = H - 90;

            drawText(cs, bold, 12, TEXT_DARK, MARGIN, y, "Top Sources");
            y -= 15;
            drawText(cs, regular, 9, TEXT_LIGHT, MARGIN, y,
                    "The sources with the highest number of matches within the submission. Overlapping sources will not be displayed.");
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

                    String type = src.getType();
                    float badgeX = MARGIN + 32;
                    drawRoundRect(cs, badgeX, y - 14, 90, 16, new Color(230, 230, 230));
                    drawText(cs, regular, 8, TEXT_MID, badgeX + 5, y - 8, type);

                    float labelX = badgeX + 98;
                    float pctX   = W - MARGIN - 30;
                    String label = src.getLabel();
                    if (label != null && label.length() > 55) label = label.substring(0, 52) + "\u2026";
                    drawText(cs, bold, 10, TEXT_DARK, labelX, y, label != null ? label : "");
                    drawText(cs, bold, 11, c, pctX, y, String.format("%.0f%%", src.getSimilarityPct()));

                    if (src.getMatchedExcerpt() != null && !src.getMatchedExcerpt().isBlank()) {
                        y -= 14;
                        String excerpt = src.getMatchedExcerpt();
                        if (excerpt.length() > 80) excerpt = excerpt.substring(0, 77) + "\u2026";
                        drawText(cs, regular, 8, TEXT_LIGHT, labelX, y, excerpt);
                    }

                    y -= 8;
                    drawRect(cs, MARGIN, y, CONTENT_W, 0.5f, GREY_LINE);
                    y -= 18;
                }
            }

            addFooter(cs, regular, bold, 3, totalPages, d.getSubmissionId(), "Integrity Overview");
        }
    }

    // ── Pages 4+: Highlighted Submission Content ──────────────────────────────

    private void addHighlightedContentPages(PDDocument doc, PlagiarismReportData d, int totalPages) throws Exception {
        PDFont bold = fontBold(doc), regular = fontRegular(doc);
        String text = d.getAnswerText();
        if (text == null || text.isBlank()) text = "(No text content available)";

        List<TextHighlight> highlights = d.getHighlights();

        // Build character-level color array
        int len = text.length();
        Color[] charColors = new Color[len];

        for (TextHighlight h : highlights) {
            int start = Math.max(0, h.getStartIndex());
            int end   = Math.min(len, h.getEndIndex());
            Color hColor = getHighlightColor(h.getStatus());
            for (int i = start; i < end; i++) {
                charColors[i] = hColor;
            }
        }

        // Build segments: runs of same color
        List<Segment> segments = buildSegments(text, charColors, highlights);

        float lineH = 14f;
        float textSize = 10f;
        float maxY = H - 90;
        float minY = 70f;
        float y = maxY;
        int pageNum = 4;

        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDPageContentStream cs = new PDPageContentStream(doc, page);
        addPageHeader(cs, bold, regular, pageNum, totalPages, d.getSubmissionId(), "Integrity Submission");

        // Title
        cs.beginText();
        cs.setFont(bold, 12);
        cs.setNonStrokingColor(TEXT_DARK);
        cs.newLineAtOffset(MARGIN, y);
        cs.showText(d.getAssignmentTitle() != null ? d.getAssignmentTitle() : "Student Submission");
        cs.endText();
        y -= 20;

        // Draw source number legend
        if (!d.getTopSources().isEmpty()) {
            float lx = MARGIN;
            for (TopSource src : d.getTopSources()) {
                int rank = src.getRank();
                if (rank > 5) break;
                Color c = SOURCE_COLORS[Math.min(rank - 1, SOURCE_COLORS.length - 1)];
                drawCircle(cs, lx + 8, y - 3, 8, c);
                drawTextCentered(cs, bold, 7, Color.WHITE, lx + 8, y - 6, String.valueOf(rank), 16);
                lx += 20;
            }
            y -= 20;
        }

        // Render text with highlights word-by-word
        float x = MARGIN;
        for (Segment seg : segments) {
            String[] words = seg.text().split("(?<=\\s)|(?=\\s)");
            for (String word : words) {
                if (word.equals("\n") || word.equals("\r\n")) {
                    x = MARGIN;
                    y -= lineH;
                    if (y < minY) {
                        addFooter(cs, regular, bold, pageNum, totalPages, d.getSubmissionId(), "Integrity Submission");
                        cs.close();
                        pageNum++;
                        page = new PDPage(PDRectangle.A4);
                        doc.addPage(page);
                        cs = new PDPageContentStream(doc, page);
                        addPageHeader(cs, bold, regular, pageNum, totalPages, d.getSubmissionId(), "Integrity Submission");
                        y = maxY;
                        x = MARGIN;
                    }
                    continue;
                }

                float wordW;
                try {
                    wordW = regular.getStringWidth(sanitiseText(word)) / 1000 * textSize;
                } catch (Exception e) {
                    wordW = word.length() * 5f;
                }

                if (x + wordW > W - MARGIN && x > MARGIN) {
                    x = MARGIN;
                    y -= lineH;
                    if (y < minY) {
                        addFooter(cs, regular, bold, pageNum, totalPages, d.getSubmissionId(), "Integrity Submission");
                        cs.close();
                        pageNum++;
                        page = new PDPage(PDRectangle.A4);
                        doc.addPage(page);
                        cs = new PDPageContentStream(doc, page);
                        addPageHeader(cs, bold, regular, pageNum, totalPages, d.getSubmissionId(), "Integrity Submission");
                        y = maxY;
                        x = MARGIN;
                    }
                }

                // Draw highlight background
                if (seg.highlightColor() != null) {
                    Color hl = seg.highlightColor();
                    Color bg = new Color(hl.getRed(), hl.getGreen(), hl.getBlue(), 80);
                    drawRect(cs, x, y - 2, wordW, lineH, bg);
                }

                // Draw text
                String safe = sanitiseText(word);
                if (!safe.isBlank()) {
                    cs.beginText();
                    cs.setFont(regular, textSize);
                    cs.setNonStrokingColor(TEXT_DARK);
                    cs.newLineAtOffset(x, y);
                    cs.showText(safe);
                    cs.endText();
                }

                // Draw source number badge for highlighted segments
                if (seg.sourceRank() > 0 && word.trim().length() > 2) {
                    Color c = SOURCE_COLORS[Math.min(seg.sourceRank() - 1, SOURCE_COLORS.length - 1)];
                    drawCircle(cs, x - 10, y + 6, 7, c);
                    drawTextCentered(cs, bold, 5, Color.WHITE, x - 10, y + 3, String.valueOf(seg.sourceRank()), 14);
                }

                x += wordW;
            }
        }

        addFooter(cs, regular, bold, pageNum, totalPages, d.getSubmissionId(), "Integrity Submission");
        cs.close();
    }

    // ── AI Analysis Page ──────────────────────────────────────────────────────

    private void addAiAnalysisPage(PDDocument doc, PlagiarismReportData d, int totalPages) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDFont bold = fontBold(doc), regular = fontRegular(doc);
        AiFeedbackSection ai = d.getAiFeedback();

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            int pageNum = totalPages;
            addPageHeader(cs, bold, regular, pageNum, totalPages, d.getSubmissionId(), "AI Analysis");

            float y = H - 90;

            drawText(cs, bold, 14, TEXT_DARK, MARGIN, y, "Writing Quality Analysis");
            y -= 30;

            // Score bars
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
                drawRect(cs, barX, barY, (float)(barW * pct), barH, barColor);

                y -= 24;
            }

            y -= 20;
            drawRect(cs, MARGIN, y, CONTENT_W, 1, GREY_LINE);
            y -= 20;

            // Strengths
            if (ai.getStrengths() != null && !ai.getStrengths().isEmpty()) {
                drawText(cs, bold, 11, TEXT_DARK, MARGIN, y, "Strengths");
                y -= 16;
                for (String s : ai.getStrengths()) {
                    y = drawWrappedBullet(cs, regular, 9, TEXT_MID, MARGIN, y, s, CONTENT_W);
                }
                y -= 10;
            }

            // Improvements
            if (ai.getImprovements() != null && !ai.getImprovements().isEmpty()) {
                drawText(cs, bold, 11, TEXT_DARK, MARGIN, y, "Areas for Improvement");
                y -= 16;
                for (String s : ai.getImprovements()) {
                    y = drawWrappedBullet(cs, regular, 9, TEXT_MID, MARGIN, y, s, CONTENT_W);
                }
            }

            addFooter(cs, regular, bold, pageNum, totalPages, d.getSubmissionId(), "AI Analysis");
        }
    }

    // ── Shared page chrome ────────────────────────────────────────────────────

    private void addPageHeader(PDPageContentStream cs, PDFont bold, PDFont regular,
                                int pageNum, int totalPages, String submissionId, String section) throws Exception {
        drawRect(cs, 0, H - 50, W, 50, BRAND_BLUE);
        drawText(cs, bold, 10, Color.WHITE, MARGIN, H - 33, "Smart LMS");
        drawText(cs, regular, 9, Color.WHITE, MARGIN + 70, H - 33,
                "Page " + pageNum + " of " + totalPages + " - " + section);
        drawText(cs, regular, 9, Color.WHITE, W - 220, H - 33, "Submission ID  " + submissionId);
    }

    private void addFooter(PDPageContentStream cs, PDFont regular, PDFont bold,
                            int pageNum, int totalPages, String submissionId, String section) throws Exception {
        drawRect(cs, 0, 45, W, 1, GREY_LINE);
        drawText(cs, bold, 8, TEXT_MID, MARGIN, 32, "Smart LMS");
        drawText(cs, regular, 8, TEXT_LIGHT, MARGIN + 60, 32,
                "Page " + pageNum + " of " + totalPages + " - " + section);
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
        float x = cx - tw / 2;
        drawText(cs, font, size, color, x, y, text);
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
            float wordW = font.getStringWidth(word + " ") / 1000 * size;
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
            for (int i = start; i < end; i++) {
                rankArr[i] = h.getSourceRank();
            }
        }

        int i = 0;
        while (i < text.length()) {
            Color currentColor = charColors[i];
            int currentRank = rankArr[i];
            int j = i + 1;
            while (j < text.length() && colorEquals(charColors[j], currentColor) && rankArr[j] == currentRank) {
                j++;
            }
            segs.add(new Segment(text.substring(i, j), currentColor, currentRank));
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

    private String sanitiseText(String s) {
        if (s == null) return "";
        return s.replaceAll("[^\u0020-\u007E\u00A0-\u00FF]", "?")
                .replace("\u2022", "-");
    }

    private int estimateContentPages(String text) {
        if (text == null || text.isBlank()) return 1;
        int wordsPerPage = 300;
        int words = text.trim().split("\\s+").length;
        return Math.max(1, (int) Math.ceil((double) words / wordsPerPage));
    }
}
