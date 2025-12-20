import { integrityApi } from '../client';
import { API_ENDPOINTS } from '../config';
import { PlagiarismCheck, PlagiarismCheckRequest } from '@/types/it22586766';

export const integrityService = {
    // Run plagiarism check
    runCheck: async (data: PlagiarismCheckRequest) => {
        return integrityApi.post<PlagiarismCheck>(API_ENDPOINTS.integrity.check, data);
    },

    // Run check async
    runCheckAsync: async (data: PlagiarismCheckRequest) => {
        return integrityApi.post<string>(API_ENDPOINTS.integrity.checkAsync, data);
    },

    // Get check by ID
    getById: async (id: number) => {
        return integrityApi.get<PlagiarismCheck>(API_ENDPOINTS.integrity.get(id));
    },

    // Get checks by submission
    getBySubmissionId: async (submissionId: number) => {
        return integrityApi.get<PlagiarismCheck[]>(
            API_ENDPOINTS.integrity.bySubmission(submissionId)
        );
    },

    // Get checks by student
    getByStudentId: async (studentId: string) => {
        return integrityApi.get<PlagiarismCheck[]>(
            API_ENDPOINTS.integrity.byStudent(studentId)
        );
    },

    // Get flagged checks
    getFlagged: async () => {
        return integrityApi.get<PlagiarismCheck[]>(API_ENDPOINTS.integrity.flagged);
    },
};