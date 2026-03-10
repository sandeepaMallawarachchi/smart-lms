'use client';

import { useState, useEffect } from 'react';

export interface SelectedCourse {
    id: string;
    name: string;
    courseCode?: string;
}

function readFromStorage(role: 'lecture' | 'student'): SelectedCourse | null {
    if (typeof window === 'undefined') return null;
    const key = role === 'lecture' ? 'selectedCourse' : 'selectedStudentCourse';
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const p = JSON.parse(raw);
        if (!p?._id || !p?.courseName) return null;
        return { id: String(p._id), name: p.courseName, courseCode: p.courseCode };
    } catch {
        return null;
    }
}

/**
 * Returns the course currently selected in the UnifiedHeader for the given role.
 * Null means "no filter" (show everything).
 * Reacts to courseSelected / studentCourseSelected CustomEvents fired by the header.
 */
export function useSelectedCourse(role: 'lecture' | 'student'): SelectedCourse | null {
    const [selected, setSelected] = useState<SelectedCourse | null>(null);

    useEffect(() => {
        // Read initial value from localStorage
        setSelected(readFromStorage(role));

        const eventName = role === 'lecture' ? 'courseSelected' : 'studentCourseSelected';

        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ _id: string; courseName: string; courseCode?: string }>).detail;
            if (detail?._id && detail?.courseName) {
                setSelected({ id: String(detail._id), name: detail.courseName, courseCode: detail.courseCode });
            }
        };

        window.addEventListener(eventName, handler);
        return () => window.removeEventListener(eventName, handler);
    }, [role]);

    return selected;
}
