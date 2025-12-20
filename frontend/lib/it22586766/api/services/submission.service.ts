import { submissionApi } from '../client';
import { API_ENDPOINTS } from '../config';
import {FileInfo, Submission, SubmissionFormData} from "@/types/it22586766";

export const submissionService = {
    // Get all submissions
    getAll: async (params?: { studentId?: string; assignmentId?: string }) => {
        const queryParams = new URLSearchParams();
        if (params?.studentId) queryParams.append('studentId', params.studentId);
        if (params?.assignmentId) queryParams.append('assignmentId', params.assignmentId);

        const url = `${API_ENDPOINTS.submissions.list}${queryParams.toString() ? `?${queryParams}` : ''}`;
        return submissionApi.get<Submission[]>(url);
    },

    // Get submission by ID
    getById: async (id: number) => {
        return submissionApi.get<Submission>(API_ENDPOINTS.submissions.get(id));
    },

    // Create submission
    create: async (data: SubmissionFormData) => {
        return submissionApi.post<Submission>(API_ENDPOINTS.submissions.create, data);
    },

    // Update submission
    update: async (id: number, data: Partial<SubmissionFormData>) => {
        return submissionApi.put<Submission>(API_ENDPOINTS.submissions.update(id), data);
    },

    // Delete submission
    delete: async (id: number) => {
        return submissionApi.delete<void>(API_ENDPOINTS.submissions.delete(id));
    },

    // Submit submission
    submit: async (id: number) => {
        return submissionApi.post<Submission>(API_ENDPOINTS.submissions.submit(id));
    },

    // Grade submission
    grade: async (id: number, grade: number, feedback?: string) => {
        return submissionApi.post<Submission>(API_ENDPOINTS.submissions.grade(id), null, {
            params: {
                grade,
                feedback
            }
        });
    },

    // Upload file
    uploadFile: async (submissionId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return submissionApi.upload<FileInfo>(
            API_ENDPOINTS.submissions.files.upload(submissionId),
            formData
        );
    },

    // Get files
    getFiles: async (submissionId: number) => {
        return submissionApi.get<FileInfo[]>(
            API_ENDPOINTS.submissions.files.list(submissionId)
        );
    },

    // Download file
    downloadFile: async (submissionId: number, fileId: number) => {
        return submissionApi.download(
            API_ENDPOINTS.submissions.files.download(submissionId, fileId)
        );
    },

    // Delete file
    deleteFile: async (submissionId: number, fileId: number) => {
        return submissionApi.delete<void>(
            API_ENDPOINTS.submissions.files.delete(submissionId, fileId)
        );
    },
};