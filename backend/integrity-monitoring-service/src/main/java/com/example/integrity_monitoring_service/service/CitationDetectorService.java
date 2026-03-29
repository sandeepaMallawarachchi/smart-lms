package com.example.integrity_monitoring_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * Detects citation and quotation patterns in student text.
 * Used to categorise matches as: NOT_CITED, MISSING_QUOTATIONS, MISSING_CITATION, CITED_AND_QUOTED.
 */
@Service
@Slf4j
public class CitationDetectorService {

    // APA: (Smith, 2020), (Smith & Jones, 2020), (2020)
    private static final Pattern APA = Pattern.compile(
            "\\(([A-Z][a-z]+(?:\\s*[&,]\\s*[A-Z][a-z]+)*,?\\s*\\d{4}[a-z]?)\\)");

    // Numeric: [1], [1, 2], [1-3]
    private static final Pattern NUMERIC = Pattern.compile(
            "\\[\\d+(?:[,\\s-]\\d+)*\\]");

    // Footnote superscript (Unicode): ¹²³
    private static final Pattern SUPERSCRIPT = Pattern.compile("[¹²³⁴⁵⁶⁷⁸⁹⁰]+");

    // Attribution phrases
    private static final Pattern ATTRIBUTION = Pattern.compile(
            "(?i)(according to|as stated by|as noted by|as cited in|as quoted by|as mentioned by|" +
            "as described by|per |cited in|from |source:|reference:)");

    // Quotation marks (regular and curly)
    private static final Pattern QUOTES = Pattern.compile(
            "\"[^\"]{10,}\"|\\u201C[^\\u201D]{10,}\\u201D");

    public enum CitationStatus {
        NOT_CITED_OR_QUOTED,
        MISSING_QUOTATIONS,    // similar to source; should be quoted
        MISSING_CITATION,      // in quotes but no citation
        CITED_AND_QUOTED       // properly attributed
    }

    /**
     * Determine the citation status of a match found at a specific location in the student text.
     *
     * @param fullText      The student's complete answer text
     * @param matchStart    Start index of the matching segment (or -1 if unknown)
     * @param matchEnd      End index of the matching segment (or -1 if unknown)
     * @param matchedText   The specific text that was flagged as matching
     * @return CitationStatus
     */
    public CitationStatus classifyMatch(String fullText, int matchStart, int matchEnd, String matchedText) {
        if (fullText == null || matchedText == null) return CitationStatus.NOT_CITED_OR_QUOTED;

        // Extract context window (200 chars before and after the match)
        int ctxStart = matchStart >= 0 ? Math.max(0, matchStart - 200) : 0;
        int ctxEnd   = matchEnd   >= 0 ? Math.min(fullText.length(), matchEnd + 200) : fullText.length();
        String context = fullText.substring(ctxStart, ctxEnd);

        boolean inQuotes    = isInQuotes(fullText, matchStart, matchedText);
        boolean hasCitation = hasCitationNearby(context);

        if (inQuotes && hasCitation) return CitationStatus.CITED_AND_QUOTED;
        if (inQuotes)                return CitationStatus.MISSING_CITATION;
        if (hasCitation)             return CitationStatus.MISSING_QUOTATIONS;
        return CitationStatus.NOT_CITED_OR_QUOTED;
    }

    /**
     * Classify without position (fallback when we don't have char offsets).
     */
    public CitationStatus classifyMatchByContext(String surroundingContext) {
        if (surroundingContext == null) return CitationStatus.NOT_CITED_OR_QUOTED;

        boolean hasQuote    = QUOTES.matcher(surroundingContext).find();
        boolean hasCitation = hasCitationNearby(surroundingContext);

        if (hasQuote && hasCitation) return CitationStatus.CITED_AND_QUOTED;
        if (hasQuote)                return CitationStatus.MISSING_CITATION;
        if (hasCitation)             return CitationStatus.MISSING_QUOTATIONS;
        return CitationStatus.NOT_CITED_OR_QUOTED;
    }

    /**
     * Check whether the overall text contains a bibliography/references section.
     * Returns true if it does (so we know the student is citing sources generally).
     */
    public boolean hasBibliographySection(String text) {
        if (text == null) return false;
        return text.matches("(?is).*\\b(references|bibliography|works cited|sources)\\b.*");
    }

    /**
     * Estimate what fraction of the text is in quotation marks.
     */
    public double quotedFraction(String text) {
        if (text == null || text.isEmpty()) return 0.0;
        long quotedChars = 0;
        var m = QUOTES.matcher(text);
        while (m.find()) quotedChars += m.end() - m.start();
        return (double) quotedChars / text.length();
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private boolean isInQuotes(String fullText, int matchStart, String matchedText) {
        if (matchStart < 0) {
            // Try to find the text
            int idx = fullText.indexOf(matchedText);
            if (idx < 0) return false;
            matchStart = idx;
        }

        // Check if the character before the match is a quote or if text is wrapped
        String before = fullText.substring(0, matchStart);
        long openQuotes  = before.chars().filter(c -> c == '"').count();
        return (openQuotes % 2) == 1; // odd open quotes = inside a quote
    }

    private boolean hasCitationNearby(String context) {
        return APA.matcher(context).find()
                || NUMERIC.matcher(context).find()
                || ATTRIBUTION.matcher(context).find()
                || SUPERSCRIPT.matcher(context).find();
    }
}
