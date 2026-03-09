package com.smartlms.submission_management_service.repository;

import com.smartlms.submission_management_service.model.VersionPlagiarismSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VersionPlagiarismSourceRepository extends JpaRepository<VersionPlagiarismSource, Long> {

    /** All sources for a specific version answer row. */
    List<VersionPlagiarismSource> findByVersionAnswerId(Long versionAnswerId);

    /** Delete all sources for a version answer (used before re-saving). */
    void deleteByVersionAnswerId(Long versionAnswerId);
}
