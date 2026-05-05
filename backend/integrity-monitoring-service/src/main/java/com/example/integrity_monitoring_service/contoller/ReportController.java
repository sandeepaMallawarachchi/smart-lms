package com.example.integrity_monitoring_service.contoller;

import com.example.integrity_monitoring_service.dto.response.PlagiarismReportData;
import com.example.integrity_monitoring_service.service.PdfReportGeneratorService;
import com.example.integrity_monitoring_service.service.PlagiarismReportDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.CompletableFuture;

/**
 * Endpoints for downloading PDF plagiarism and feedback reports.
 */
@RestController
@RequestMapping("/api/integrity/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController {

    private final PlagiarismReportDataService reportDataService;
    private final PdfReportGeneratorService pdfGenerator;

    /**
     * Download the combined Integrity & Feedback PDF report for a submission.
     * GET /api/integrity/reports/{submissionId}
     */
    @GetMapping("/{submissionId}")
    public CompletableFuture<ResponseEntity<byte[]>> downloadReport(@PathVariable Long submissionId) {
        log.info("[ReportController] Generating report for submission {}", submissionId);

        PlagiarismReportData data = reportDataService.buildReportData(submissionId);
        String filename = "Integrity_Feedback_Report_Submission_" + submissionId + ".pdf";

        return pdfGenerator.generateReport(data)
                .thenApply(pdf -> pdfResponse(pdf, filename))
                .exceptionally(ex -> {
                    log.error("[ReportController] Report failed for submission {}: {}",
                            submissionId, ex.getMessage());
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .<byte[]>build();
                });
    }

    /**
     * Download a plagiarism-only PDF report for a submission.
     * GET /api/integrity/reports/{submissionId}/plagiarism
     */
    @GetMapping("/{submissionId}/plagiarism")
    public CompletableFuture<ResponseEntity<byte[]>> downloadPlagiarismReport(@PathVariable Long submissionId) {
        log.info("[ReportController] Generating plagiarism report for submission {}", submissionId);

        PlagiarismReportData data = reportDataService.buildReportData(submissionId);
        String filename = "Plagiarism_Report_Submission_" + submissionId + ".pdf";

        return pdfGenerator.generatePlagiarismReport(data)
                .thenApply(pdf -> pdfResponse(pdf, filename))
                .exceptionally(ex -> {
                    log.error("[ReportController] Plagiarism report failed for submission {}: {}",
                            submissionId, ex.getMessage());
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .<byte[]>build();
                });
    }

    /**
     * Download a combined plagiarism + AI feedback PDF report.
     * GET /api/integrity/reports/{submissionId}/feedback
     */
    @GetMapping("/{submissionId}/feedback")
    public CompletableFuture<ResponseEntity<byte[]>> downloadFeedbackReport(@PathVariable Long submissionId) {
        log.info("[ReportController] Generating feedback report for submission {}", submissionId);

        PlagiarismReportData data = reportDataService.buildReportData(submissionId);
        String filename = "Complete_Report_Submission_" + submissionId + ".pdf";

        return pdfGenerator.generateFeedbackReport(data)
                .thenApply(pdf -> pdfResponse(pdf, filename))
                .exceptionally(ex -> {
                    log.error("[ReportController] Feedback report failed for submission {}: {}",
                            submissionId, ex.getMessage());
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .<byte[]>build();
                });
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] pdf, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
            ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(pdf.length);
        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
