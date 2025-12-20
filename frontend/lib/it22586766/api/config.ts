export const API_CONFIG = {
    submission: process.env.NEXT_PUBLIC_SUBMISSION_API || 'http://localhost:8081',
    version: process.env.NEXT_PUBLIC_VERSION_API || 'http://localhost:8082',
    feedback: process.env.NEXT_PUBLIC_FEEDBACK_API || 'http://localhost:8083',
    integrity: process.env.NEXT_PUBLIC_INTEGRITY_API || 'http://localhost:8084',
};

export const API_ENDPOINTS = {
    // Submission endpoints
    submissions: {
        list: '/api/submissions',
        create: '/api/submissions',
        get: (id: number) => `/api/submissions/${id}`,
        update: (id: number) => `/api/submissions/${id}`,
        delete: (id: number) => `/api/submissions/${id}`,
        submit: (id: number) => `/api/submissions/${id}/submit`,
        grade: (id: number) => `/api/submissions/${id}/grade`,
        files: {
            upload: (id: number) => `/api/submissions/${id}/files`,
            list: (id: number) => `/api/submissions/${id}/files`,
            download: (id: number, fileId: number) => `/api/submissions/${id}/files/${fileId}`,
            delete: (id: number, fileId: number) => `/api/submissions/${id}/files/${fileId}`,
        },
    },
    // Version control endpoints
    versions: {
        list: (submissionId: number) => `/api/versions/submission/${submissionId}`,
        get: (id: number) => `/api/versions/${id}`,
        latest: (submissionId: number) => `/api/versions/submission/${submissionId}/latest`,
        diff: '/api/versions/diff',
        file: (versionId: number, filePath: string) =>
            `/api/versions/${versionId}/file?filePath=${encodeURIComponent(filePath)}`,
    },
    // Feedback endpoints
    feedback: {
        generate: '/api/feedback/generate',
        generateAsync: '/api/feedback/generate-async',
        get: (id: number) => `/api/feedback/${id}`,
        bySubmission: (submissionId: number) => `/api/feedback/submission/${submissionId}`,
        byStudent: (studentId: string) => `/api/feedback/student/${studentId}`,
    },
    // Rubric endpoints
    rubrics: {
        list: '/api/rubrics',
        create: '/api/rubrics',
        get: (id: number) => `/api/rubrics/${id}`,
        update: (id: number) => `/api/rubrics/${id}`,
        delete: (id: number) => `/api/rubrics/${id}`,
    },
    // Integrity endpoints
    integrity: {
        check: '/api/integrity/checks',
        checkAsync: '/api/integrity/checks/async',
        get: (id: number) => `/api/integrity/checks/${id}`,
        bySubmission: (submissionId: number) => `/api/integrity/checks/submission/${submissionId}`,
        byStudent: (studentId: string) => `/api/integrity/checks/student/${studentId}`,
        flagged: '/api/integrity/checks/flagged',
    },
};