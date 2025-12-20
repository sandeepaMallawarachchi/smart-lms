import { versionApi } from '../client';
import { API_ENDPOINTS } from '../config';
import { Version, FileDiff } from '@/types/it22586766';

export const versionService = {
    // Get all versions for a submission
    getBySubmissionId: async (submissionId: number) => {
        return versionApi.get<Version[]>(API_ENDPOINTS.versions.list(submissionId));
    },

    // Get version by ID
    getById: async (id: number) => {
        return versionApi.get<Version>(API_ENDPOINTS.versions.get(id));
    },

    // Get latest version
    getLatest: async (submissionId: number) => {
        return versionApi.get<Version>(API_ENDPOINTS.versions.latest(submissionId));
    },

    // Get diff between two versions
    getDiff: async (sourceVersionId: number, targetVersionId: number, filePath?: string) => {
        return versionApi.post<{
            sourceVersionId: number;
            targetVersionId: number;
            fileDiffs: FileDiff[];
            summary: {
                totalFiles: number;
                filesAdded: number;
                filesModified: number;
                filesDeleted: number;
                totalLinesAdded: number;
                totalLinesDeleted: number;
                totalLinesModified: number;
            };
        }>(API_ENDPOINTS.versions.diff, {
            sourceVersionId,
            targetVersionId,
            filePath,
        });
    },

    // Get file content from version
    getFileContent: async (versionId: number, filePath: string) => {
        return versionApi.download(API_ENDPOINTS.versions.file(versionId, filePath));
    },
};