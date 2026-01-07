package com.example.integrity_monitoring_service.service;

import com.example.integrity_monitoring_service.dto.request.PlagiarismCheckRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service to fetch submissions from Submission Management Service
 */
@Service
@Slf4j
public class SubmissionFetchService {

    @Value("${submission-service.url:http://localhost:8081}")
    private String submissionServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Fetch code submissions for comparison
     */
    public List<Map<String, String>> fetchSubmissionsForComparison(PlagiarismCheckRequest request) {
        List<Map<String, String>> submissions = new ArrayList<>();

        try {
            // If specific submission IDs provided
            if (request.getCompareWithSubmissionIds() != null &&
                    !request.getCompareWithSubmissionIds().isEmpty()) {

                for (Long submissionId : request.getCompareWithSubmissionIds()) {
                    Map<String, String> submission = fetchSubmissionById(submissionId);
                    if (submission != null) {
                        submissions.add(submission);
                    }
                }
            }
            // If check all in assignment
            else if (request.getCheckAllInAssignment() && request.getAssignmentId() != null) {
                submissions = fetchSubmissionsByAssignment(
                        request.getAssignmentId(),
                        request.getStudentId()
                );
            }

        } catch (Exception e) {
            log.error("Error fetching submissions: {}", e.getMessage(), e);
        }

        return submissions;
    }

    /**
     * Fetch text submissions for comparison
     */
    public List<Map<String, String>> fetchTextSubmissionsForComparison(PlagiarismCheckRequest request) {
        // Similar to code submissions but for text content
        return fetchSubmissionsForComparison(request);
    }

    /**
     * Fetch submission by ID
     */
    private Map<String, String> fetchSubmissionById(Long submissionId) {
        try {
            String url = submissionServiceUrl + "/api/submissions/" + submissionId;

            // Mock response for now (replace with actual API call)
            Map<String, String> submission = new HashMap<>();
            submission.put("submissionId", submissionId.toString());
            submission.put("studentId", "STUDENT_" + submissionId);
            submission.put("content", "// Sample code content");

            return submission;

        } catch (Exception e) {
            log.error("Error fetching submission {}: {}", submissionId, e.getMessage());
            return null;
        }
    }

    /**
     * Fetch all submissions for an assignment (excluding current student)
     */
    private List<Map<String, String>> fetchSubmissionsByAssignment(
            String assignmentId,
            String excludeStudentId) {

        List<Map<String, String>> submissions = new ArrayList<>();

        try {
            String url = submissionServiceUrl + "/api/submissions/assignment/" + assignmentId;

            // Mock response for now (replace with actual API call)
            // In production, this would call the Submission Management Service
            for (int i = 1; i <= 5; i++) {
                if (!("STUDENT_" + i).equals(excludeStudentId)) {
                    Map<String, String> submission = new HashMap<>();
                    submission.put("submissionId", String.valueOf(i));
                    submission.put("studentId", "STUDENT_" + i);
                    submission.put("content", "// Sample code content " + i);
                    submissions.add(submission);
                }
            }

        } catch (Exception e) {
            log.error("Error fetching submissions for assignment {}: {}",
                    assignmentId, e.getMessage());
        }

        return submissions;
    }
}