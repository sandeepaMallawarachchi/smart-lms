package com.smartlms.version_control_service.service;


import com.github.difflib.DiffUtils;
import com.github.difflib.patch.AbstractDelta;
import com.github.difflib.patch.Patch;
import com.smartlms.version_control_service.dto.*;
import com.smartlms.version_control_service.dto.request.DiffRequest;
import com.smartlms.version_control_service.dto.response.DiffResponse;
import com.smartlms.version_control_service.exception.ResourceNotFoundException;
import com.smartlms.version_control_service.model.SubmissionVersion;
import com.smartlms.version_control_service.model.VersionFile;
import com.smartlms.version_control_service.repository.SubmissionVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiffService {

    private final SubmissionVersionRepository versionRepository;
    private final VersionControlService versionControlService;

    @Transactional(readOnly = true)
    public DiffResponse generateDiff(DiffRequest request) {
        log.info("Generating diff between versions: {} and {}",
                request.getSourceVersionId(), request.getTargetVersionId());

        SubmissionVersion sourceVersion = versionRepository.findById(request.getSourceVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Source version not found"));

        SubmissionVersion targetVersion = versionRepository.findById(request.getTargetVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Target version not found"));

        List<FileDiff> fileDiffs = new ArrayList<>();
        DiffSummary summary = DiffSummary.builder()
                .totalFiles(0)
                .filesAdded(0)
                .filesModified(0)
                .filesDeleted(0)
                .totalLinesAdded(0)
                .totalLinesDeleted(0)
                .totalLinesModified(0)
                .build();

        // Compare files
        for (VersionFile targetFile : targetVersion.getFiles()) {
            VersionFile sourceFile = findFileInVersion(sourceVersion, targetFile.getFilePath());

            if (sourceFile == null) {
                // File was added
                FileDiff fileDiff = createAddedFileDiff(targetFile);
                fileDiffs.add(fileDiff);
                summary.setFilesAdded(summary.getFilesAdded() + 1);
                summary.setTotalLinesAdded(summary.getTotalLinesAdded() + fileDiff.getLinesAdded());
            } else if (!sourceFile.getBlob().getContentHash().equals(targetFile.getBlob().getContentHash())) {
                // File was modified
                FileDiff fileDiff = generateFileDiff(sourceFile, targetFile);
                fileDiffs.add(fileDiff);
                summary.setFilesModified(summary.getFilesModified() + 1);
                summary.setTotalLinesAdded(summary.getTotalLinesAdded() + fileDiff.getLinesAdded());
                summary.setTotalLinesDeleted(summary.getTotalLinesDeleted() + fileDiff.getLinesDeleted());
                summary.setTotalLinesModified(summary.getTotalLinesModified() + fileDiff.getLinesModified());
            }
        }

        // Check for deleted files
        for (VersionFile sourceFile : sourceVersion.getFiles()) {
            VersionFile targetFile = findFileInVersion(targetVersion, sourceFile.getFilePath());
            if (targetFile == null) {
                FileDiff fileDiff = createDeletedFileDiff(sourceFile);
                fileDiffs.add(fileDiff);
                summary.setFilesDeleted(summary.getFilesDeleted() + 1);
                summary.setTotalLinesDeleted(summary.getTotalLinesDeleted() + fileDiff.getLinesDeleted());
            }
        }

        summary.setTotalFiles(fileDiffs.size());

        return DiffResponse.builder()
                .sourceVersionId(sourceVersion.getId())
                .sourceVersionNumber(sourceVersion.getVersionNumber())
                .targetVersionId(targetVersion.getId())
                .targetVersionNumber(targetVersion.getVersionNumber())
                .fileDiffs(fileDiffs)
                .summary(summary)
                .build();
    }

    private FileDiff generateFileDiff(VersionFile sourceFile, VersionFile targetFile) {
        try {
            byte[] sourceContent = versionControlService.getFileContent(
                    sourceFile.getVersion().getId(), sourceFile.getFilePath());
            byte[] targetContent = versionControlService.getFileContent(
                    targetFile.getVersion().getId(), targetFile.getFilePath());

            List<String> sourceLines = Arrays.asList(new String(sourceContent).split("\n"));
            List<String> targetLines = Arrays.asList(new String(targetContent).split("\n"));

            Patch<String> patch = DiffUtils.diff(sourceLines, targetLines);

            int linesAdded = 0;
            int linesDeleted = 0;
            int linesModified = 0;
            List<DiffLine> diffLines = new ArrayList<>();

            for (AbstractDelta<String> delta : patch.getDeltas()) {
                switch (delta.getType()) {
                    case INSERT:
                        linesAdded += delta.getTarget().getLines().size();
                        addDiffLines(diffLines, delta.getTarget().getLines(), DiffLineType.ADDED,
                                delta.getTarget().getPosition());
                        break;
                    case DELETE:
                        linesDeleted += delta.getSource().getLines().size();
                        addDiffLines(diffLines, delta.getSource().getLines(), DiffLineType.DELETED,
                                delta.getSource().getPosition());
                        break;
                    case CHANGE:
                        linesModified += Math.max(delta.getSource().getLines().size(),
                                delta.getTarget().getLines().size());
                        addDiffLines(diffLines, delta.getSource().getLines(), DiffLineType.DELETED,
                                delta.getSource().getPosition());
                        addDiffLines(diffLines, delta.getTarget().getLines(), DiffLineType.ADDED,
                                delta.getTarget().getPosition());
                        break;
                }
            }

            String unifiedDiff = generateUnifiedDiff(patch, sourceLines, targetLines);

            return FileDiff.builder()
                    .filePath(targetFile.getFilePath())
                    .changeType(FileChangeType.MODIFIED)
                    .unifiedDiff(unifiedDiff)
                    .diffLines(diffLines)
                    .linesAdded(linesAdded)
                    .linesDeleted(linesDeleted)
                    .linesModified(linesModified)
                    .build();

        } catch (Exception e) {
            log.error("Error generating diff for file: {}", targetFile.getFilePath(), e);
            return FileDiff.builder()
                    .filePath(targetFile.getFilePath())
                    .changeType(FileChangeType.MODIFIED)
                    .unifiedDiff("Error generating diff")
                    .diffLines(new ArrayList<>())
                    .linesAdded(0)
                    .linesDeleted(0)
                    .linesModified(0)
                    .build();
        }
    }

    private FileDiff createAddedFileDiff(VersionFile file) {
        try {
            byte[] content = versionControlService.getFileContent(
                    file.getVersion().getId(), file.getFilePath());
            List<String> lines = Arrays.asList(new String(content).split("\n"));

            List<DiffLine> diffLines = new ArrayList<>();
            for (int i = 0; i < lines.size(); i++) {
                diffLines.add(DiffLine.builder()
                        .type(DiffLineType.ADDED)
                        .lineNumber(i + 1)
                        .content(lines.get(i))
                        .build());
            }

            return FileDiff.builder()
                    .filePath(file.getFilePath())
                    .changeType(FileChangeType.ADDED)
                    .diffLines(diffLines)
                    .linesAdded(lines.size())
                    .linesDeleted(0)
                    .linesModified(0)
                    .build();
        } catch (Exception e) {
            log.error("Error creating added file diff: {}", file.getFilePath(), e);
            return FileDiff.builder()
                    .filePath(file.getFilePath())
                    .changeType(FileChangeType.ADDED)
                    .diffLines(new ArrayList<>())
                    .linesAdded(0)
                    .linesDeleted(0)
                    .linesModified(0)
                    .build();
        }
    }

    private FileDiff createDeletedFileDiff(VersionFile file) {
        try {
            byte[] content = versionControlService.getFileContent(
                    file.getVersion().getId(), file.getFilePath());
            List<String> lines = Arrays.asList(new String(content).split("\n"));

            List<DiffLine> diffLines = new ArrayList<>();
            for (int i = 0; i < lines.size(); i++) {
                diffLines.add(DiffLine.builder()
                        .type(DiffLineType.DELETED)
                        .lineNumber(i + 1)
                        .content(lines.get(i))
                        .build());
            }

            return FileDiff.builder()
                    .filePath(file.getFilePath())
                    .changeType(FileChangeType.DELETED)
                    .diffLines(diffLines)
                    .linesAdded(0)
                    .linesDeleted(lines.size())
                    .linesModified(0)
                    .build();
        } catch (Exception e) {
            log.error("Error creating deleted file diff: {}", file.getFilePath(), e);
            return FileDiff.builder()
                    .filePath(file.getFilePath())
                    .changeType(FileChangeType.DELETED)
                    .diffLines(new ArrayList<>())
                    .linesAdded(0)
                    .linesDeleted(0)
                    .linesModified(0)
                    .build();
        }
    }

    private void addDiffLines(List<DiffLine> diffLines, List<String> lines,
                              DiffLineType type, int startPosition) {
        for (int i = 0; i < lines.size(); i++) {
            diffLines.add(DiffLine.builder()
                    .type(type)
                    .lineNumber(startPosition + i + 1)
                    .content(lines.get(i))
                    .build());
        }
    }

    private String generateUnifiedDiff(Patch<String> patch, List<String> sourceLines,
                                       List<String> targetLines) {
        StringBuilder unifiedDiff = new StringBuilder();

        for (AbstractDelta<String> delta : patch.getDeltas()) {
            unifiedDiff.append("@@ -")
                    .append(delta.getSource().getPosition() + 1)
                    .append(",")
                    .append(delta.getSource().size())
                    .append(" +")
                    .append(delta.getTarget().getPosition() + 1)
                    .append(",")
                    .append(delta.getTarget().size())
                    .append(" @@\n");

            for (String line : delta.getSource().getLines()) {
                unifiedDiff.append("- ").append(line).append("\n");
            }
            for (String line : delta.getTarget().getLines()) {
                unifiedDiff.append("+ ").append(line).append("\n");
            }
        }

        return unifiedDiff.toString();
    }

    private VersionFile findFileInVersion(SubmissionVersion version, String filePath) {
        return version.getFiles().stream()
                .filter(f -> f.getFilePath().equals(filePath))
                .findFirst()
                .orElse(null);
    }

    /**
     * Generate a per-question text diff between two text-snapshot versions.
     *
     * Both versions must have been created via POST /api/versions/text-snapshot,
     * so their metadata map contains an "answers" list. For each question present
     * in the target snapshot, the method diffs the answer text line-by-line against
     * the same question in the source snapshot (or treats it as fully added if new).
     *
     * The result reuses the same DiffResponse / FileDiff structure as file diffs,
     * where each "filePath" is actually the questionId.
     */
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public DiffResponse generateTextDiff(DiffRequest request) {
        log.info("Generating text diff between versions: {} and {}",
                request.getSourceVersionId(), request.getTargetVersionId());

        SubmissionVersion sourceVersion = versionRepository.findById(request.getSourceVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Source version not found"));
        SubmissionVersion targetVersion = versionRepository.findById(request.getTargetVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Target version not found"));

        List<java.util.Map<String, Object>> sourceAnswers = extractAnswers(sourceVersion);
        List<java.util.Map<String, Object>> targetAnswers = extractAnswers(targetVersion);

        // Index source answers by questionId for O(1) lookup
        java.util.Map<String, String> sourceTexts = new java.util.HashMap<>();
        for (java.util.Map<String, Object> a : sourceAnswers) {
            String qId = String.valueOf(a.getOrDefault("questionId", ""));
            String text = a.getOrDefault("answerText", "") instanceof String s ? s : "";
            sourceTexts.put(qId, text);
        }

        List<FileDiff> fileDiffs = new ArrayList<>();
        DiffSummary summary = DiffSummary.builder()
                .totalFiles(0).filesAdded(0).filesModified(0).filesDeleted(0)
                .totalLinesAdded(0).totalLinesDeleted(0).totalLinesModified(0)
                .build();

        for (java.util.Map<String, Object> targetAnswer : targetAnswers) {
            String qId        = String.valueOf(targetAnswer.getOrDefault("questionId", "unknown"));
            String targetText = targetAnswer.getOrDefault("answerText", "") instanceof String s ? s : "";
            String sourceText = sourceTexts.getOrDefault(qId, "");

            List<String> sourceLines = Arrays.asList(sourceText.split("\n"));
            List<String> targetLines = Arrays.asList(targetText.split("\n"));

            if (sourceText.isEmpty() && !targetText.isEmpty()) {
                // Entirely new answer for this question
                List<DiffLine> diffLines = new ArrayList<>();
                for (int i = 0; i < targetLines.size(); i++) {
                    diffLines.add(DiffLine.builder()
                            .type(DiffLineType.ADDED).lineNumber(i + 1).content(targetLines.get(i)).build());
                }
                fileDiffs.add(FileDiff.builder()
                        .filePath(qId).changeType(FileChangeType.ADDED)
                        .diffLines(diffLines).linesAdded(targetLines.size())
                        .linesDeleted(0).linesModified(0).build());
                summary.setFilesAdded(summary.getFilesAdded() + 1);
                summary.setTotalLinesAdded(summary.getTotalLinesAdded() + targetLines.size());
            } else {
                Patch<String> patch = DiffUtils.diff(sourceLines, targetLines);
                if (patch.getDeltas().isEmpty()) continue; // unchanged — skip

                int linesAdded = 0, linesDeleted = 0, linesModified = 0;
                List<DiffLine> diffLines = new ArrayList<>();

                for (AbstractDelta<String> delta : patch.getDeltas()) {
                    switch (delta.getType()) {
                        case INSERT -> {
                            linesAdded += delta.getTarget().getLines().size();
                            addDiffLines(diffLines, delta.getTarget().getLines(),
                                    DiffLineType.ADDED, delta.getTarget().getPosition());
                        }
                        case DELETE -> {
                            linesDeleted += delta.getSource().getLines().size();
                            addDiffLines(diffLines, delta.getSource().getLines(),
                                    DiffLineType.DELETED, delta.getSource().getPosition());
                        }
                        case CHANGE -> {
                            linesModified += Math.max(delta.getSource().getLines().size(),
                                    delta.getTarget().getLines().size());
                            addDiffLines(diffLines, delta.getSource().getLines(),
                                    DiffLineType.DELETED, delta.getSource().getPosition());
                            addDiffLines(diffLines, delta.getTarget().getLines(),
                                    DiffLineType.ADDED, delta.getTarget().getPosition());
                        }
                        case EQUAL -> { /* no change — skip */ }
                    }
                }

                String unifiedDiff = generateUnifiedDiff(patch, sourceLines, targetLines);
                fileDiffs.add(FileDiff.builder()
                        .filePath(qId).changeType(FileChangeType.MODIFIED)
                        .unifiedDiff(unifiedDiff).diffLines(diffLines)
                        .linesAdded(linesAdded).linesDeleted(linesDeleted)
                        .linesModified(linesModified).build());
                summary.setFilesModified(summary.getFilesModified() + 1);
                summary.setTotalLinesAdded(summary.getTotalLinesAdded() + linesAdded);
                summary.setTotalLinesDeleted(summary.getTotalLinesDeleted() + linesDeleted);
                summary.setTotalLinesModified(summary.getTotalLinesModified() + linesModified);
            }
        }

        summary.setTotalFiles(fileDiffs.size());

        return DiffResponse.builder()
                .sourceVersionId(sourceVersion.getId())
                .sourceVersionNumber(sourceVersion.getVersionNumber())
                .targetVersionId(targetVersion.getId())
                .targetVersionNumber(targetVersion.getVersionNumber())
                .fileDiffs(fileDiffs)
                .summary(summary)
                .build();
    }

    private List<java.util.Map<String, Object>> extractAnswers(SubmissionVersion version) {
        if (version.getMetadata() == null) return List.of();
        Object answers = version.getMetadata().get("answers");
        if (answers instanceof List<?> list) {
            return (List<java.util.Map<String, Object>>) list;
        }
        return List.of();
    }
}
