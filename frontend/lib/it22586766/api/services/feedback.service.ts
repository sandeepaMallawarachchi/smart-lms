import { feedbackApi } from '../client';
import { API_ENDPOINTS } from '../config';
import { Feedback, FeedbackRequestData, Rubric, RubricCriterion } from '@/types/it22586766';

export const feedbackService = {
    // Generate feedback
    generate: async (data: FeedbackRequestData) => {
        return feedbackApi.post<Feedback>(API_ENDPOINTS.feedback.generate, data);
    },

    // Generate feedback async
    generateAsync: async (data: FeedbackRequestData) => {
        return feedbackApi.post<string>(API_ENDPOINTS.feedback.generateAsync, data);
    },

    // Get feedback by ID
    getById: async (id: number) => {
        return feedbackApi.get<Feedback>(API_ENDPOINTS.feedback.get(id));
    },

    // Get feedback by submission
    getBySubmissionId: async (submissionId: number) => {
        return feedbackApi.get<Feedback[]>(API_ENDPOINTS.feedback.bySubmission(submissionId));
    },

    // Get feedback by student
    getByStudentId: async (studentId: string) => {
        return feedbackApi.get<Feedback[]>(API_ENDPOINTS.feedback.byStudent(studentId));
    },
};

export const rubricService = {
    // Get all rubrics
    getAll: async () => {
        return feedbackApi.get<Rubric[]>(API_ENDPOINTS.rubrics.list);
    },

    // Get rubric by ID
    getById: async (id: number) => {
        return feedbackApi.get<Rubric>(API_ENDPOINTS.rubrics.get(id));
    },

    // Create rubric
    create: async (data: {
        title: string;
        description?: string;
        assignmentType?: string;
        createdBy?: string;
        criteria: RubricCriterion[];
    }) => {
        return feedbackApi.post<Rubric>(API_ENDPOINTS.rubrics.create, data);
    },

    // Update rubric
    update: async (id: number, data: {
        title: string;
        description?: string;
        assignmentType?: string;
        criteria: RubricCriterion[];
    }) => {
        return feedbackApi.put<Rubric>(API_ENDPOINTS.rubrics.update(id), data);
    },

    // Delete rubric
    delete: async (id: number) => {
        return feedbackApi.delete<void>(API_ENDPOINTS.rubrics.delete(id));
    },
};