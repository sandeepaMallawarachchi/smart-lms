'use client';

import { useState, useEffect } from 'react';

export interface LecturerCourse {
    id: string;
    name: string;
}

export function useLecturerCourses() {
    const [courses, setCourses] = useState<LecturerCourse[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) return;

        setLoading(true);
        fetch('/api/lecturer/courses', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                const raw: Array<{ _id: unknown; courseName?: string }> =
                    json?.data?.courses ?? [];
                setCourses(
                    raw.map((c) => ({
                        id: String(c._id),
                        name: c.courseName ?? String(c._id),
                    }))
                );
            })
            .catch(() => {/* silent */})
            .finally(() => setLoading(false));
    }, []);

    return { courses, loading };
}
