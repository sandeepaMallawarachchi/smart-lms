package com.smartlms.version_control_service.repository;

import java.util.List;
import java.util.Optional;

import com.smartlms.version_control_service.model.VersionFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface VersionFileRepository extends JpaRepository<VersionFile, Long> {

    List<VersionFile> findByVersionId(Long versionId);

    @Query("SELECT vf FROM VersionFile vf WHERE vf.version.id = :versionId AND vf.filePath = :filePath")
    Optional<VersionFile> findByVersionIdAndFilePath(
            @Param("versionId") Long versionId,
            @Param("filePath") String filePath);

    void deleteByVersionId(Long versionId);
}