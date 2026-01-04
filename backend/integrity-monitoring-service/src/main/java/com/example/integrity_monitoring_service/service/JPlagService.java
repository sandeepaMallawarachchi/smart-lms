package com.example.integrity_monitoring_service.service;

import com.example.integrity_monitoring_service.exception.IntegrityCheckException;
import de.jplag.JPlag;
import de.jplag.JPlagComparison;
import de.jplag.JPlagResult;
import de.jplag.Language;
import de.jplag.options.JPlagOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * JPlag integration for code plagiarism detection
 * Using JPlag 5.1.0+ with language-specific classes
 */
@Service
@Slf4j
public class JPlagService {

    @Value("${jplag.temp-dir:./temp/integrity}")
    private String tempDir;

    @Value("${jplag.min-token-match:9}")
    private int minTokenMatch;

    /**
     * Check code plagiarism using JPlag
     */
    public List<Map<String, Object>> checkCodePlagiarism(
            Map<String, String> studentCode,
            List<Map<String, String>> otherStudentsCodes,
            String language) {

        List<Map<String, Object>> matches = new ArrayList<>();

        try {
            // Create temporary directory structure
            File tempDirectory = createTempDirectory();

            // Determine language
            Language jplagLanguage = determineLanguage(language);

            // Write student's code
            File studentDir = new File(tempDirectory, "student_current");
            writeCodeToDirectory(studentCode, studentDir);

            // Write other students' codes
            int index = 0;
            for (Map<String, String> otherCode : otherStudentsCodes) {
                File otherDir = new File(tempDirectory, "student_" + index);
                writeCodeToDirectory(otherCode, otherDir);
                index++;
            }

            // Configure JPlag
            JPlagOptions options = new JPlagOptions(
                    jplagLanguage,
                    Set.of(tempDirectory),
                    Set.of()
            );
            options = options.withMinimumTokenMatch(minTokenMatch);

            // Run JPlag
            log.debug("Running JPlag comparison for {} submissions", otherStudentsCodes.size());
            JPlagResult result = JPlag.run(options);

            // Extract comparisons involving the current student
            for (JPlagComparison comparison : result.getComparisons(100)) {
                String name1 = comparison.firstSubmission().getName();
                String name2 = comparison.secondSubmission().getName();

                // Only include comparisons with the current student
                if (name1.equals("student_current") || name2.equals("student_current")) {
                    Map<String, Object> match = new HashMap<>();
                    match.put("similarity", comparison.similarity());
                    match.put("matchedStudent", name1.equals("student_current") ? name2 : name1);
                    match.put("tokensMatched", comparison.matches().size());
                    match.put("details", "JPlag similarity: " +
                            String.format("%.2f%%", comparison.similarity() * 100));

                    matches.add(match);
                }
            }

            // Cleanup
            deleteDirectory(tempDirectory);

            log.debug("JPlag found {} matches", matches.size());

        } catch (Exception e) {
            log.error("Error running JPlag: {}", e.getMessage(), e);
            throw new IntegrityCheckException("JPlag execution failed", e);
        }

        return matches;
    }

    /**
     * Determine JPlag language from file extension
     * JPlag 5.1.0+ uses language-specific classes
     */
    private Language determineLanguage(String languageHint) {
        if (languageHint == null) {
            return new de.jplag.java.JavaLanguage();
        }

        String hint = languageHint.toLowerCase();

        try {
            return switch (hint) {
                case "java" -> new de.jplag.java.JavaLanguage();
                case "python", "py" -> new de.jplag.python3.PythonLanguage();
                case "c" -> new de.jplag.c.CLanguage();
                case "cpp", "c++" -> new de.jplag.cpp.CPPLanguage();
                case "csharp", "c#", "cs" -> new de.jplag.csharp.CSharpLanguage();
                case "javascript", "js" -> new de.jplag.javascript.JavaScriptLanguage();
                case "typescript", "ts" -> new de.jplag.typescript.TypeScriptLanguage();
                case "kotlin", "kt" -> new de.jplag.kotlin.KotlinLanguage();
                case "scala" -> new de.jplag.scala.ScalaLanguage();
                case "swift" -> new de.jplag.swift.SwiftLanguage();
                case "go", "golang" -> new de.jplag.golang.GoLanguage();
                case "rust", "rs" -> new de.jplag.rust.RustLanguage();
                case "r" -> new de.jplag.rlang.RLanguage();
                case "scheme" -> new de.jplag.scheme.SchemeLanguage();
                default -> new de.jplag.java.JavaLanguage();
            };
        } catch (Exception e) {
            log.warn("Error loading language {}, defaulting to Java: {}", hint, e.getMessage());
            return new de.jplag.java.JavaLanguage();
        }
    }

    /**
     * Create temporary directory for JPlag
     */
    private File createTempDirectory() throws IOException {
        Path path = Files.createTempDirectory("jplag_");
        File dir = path.toFile();
        dir.deleteOnExit();
        return dir;
    }

    /**
     * Write code files to directory
     */
    private void writeCodeToDirectory(Map<String, String> codeFiles, File directory) throws IOException {
        if (!directory.exists()) {
            boolean created = directory.mkdirs();
            if (!created) {
                throw new IOException("Failed to create directory: " + directory.getAbsolutePath());
            }
        }

        for (Map.Entry<String, String> entry : codeFiles.entrySet()) {
            String fileName = entry.getKey();
            String content = entry.getValue();

            File file = new File(directory, fileName);
            Files.writeString(file.toPath(), content);
        }
    }

    /**
     * Delete directory recursively
     */
    private void deleteDirectory(File directory) {
        if (directory.exists()) {
            File[] files = directory.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isDirectory()) {
                        deleteDirectory(file);
                    } else {
                        boolean deleted = file.delete();
                        if (!deleted) {
                            log.warn("Failed to delete file: {}", file.getAbsolutePath());
                        }
                    }
                }
            }
            boolean deleted = directory.delete();
            if (!deleted) {
                log.warn("Failed to delete directory: {}", directory.getAbsolutePath());
            }
        }
    }
}