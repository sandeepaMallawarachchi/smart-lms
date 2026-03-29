package com.example.integrity_monitoring_service.contoller;

import com.example.integrity_monitoring_service.dto.response.PlagiarismReportData;
import com.example.integrity_monitoring_service.service.PdfReportGeneratorService;
import com.example.integrity_monitoring_service.service.PlagiarismReportDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
     * Download a plagiarism-only PDF report for a submission.
     * GET /api/integrity/reports/{submissionId}/plagiarism
     */
    @GetMapping("/{submissionId}/plagiarism")
    public ResponseEntity<byte[]> downloadPlagiarismReport(@PathVariable Long submissionId) {
        log.info("[ReportController] Generating plagiarism report for submission {}", submissionId);

        PlagiarismReportData data = reportDataService.buildReportData(submissionId);
        byte[] pdf = pdfGenerator.generatePlagiarismReport(data);

        String filename = "Plagiarism_Report_Submission_" + submissionId + ".pdf";
        return pdfResponse(pdf, filename);
    }

    /**
     * Download a combined plagiarism + AI feedback PDF report.
     * GET /api/integrity/reports/{submissionId}/feedback
     */
    @GetMapping("/{submissionId}/feedback")
    public ResponseEntity<byte[]> downloadFeedbackReport(@PathVariable Long submissionId) {
        log.info("[ReportController] Generating feedback report for submission {}", submissionId);

        PlagiarismReportData data = reportDataService.buildReportData(submissionId);
        byte[] pdf = pdfGenerator.generateFeedbackReport(data);

        String filename = "Complete_Report_Submission_" + submissionId + ".pdf";
        return pdfResponse(pdf, filename);
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
