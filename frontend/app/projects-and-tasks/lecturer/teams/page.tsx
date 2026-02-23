'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Users, User, AlertCircle, Loader, Edit, Trash2, X } from 'lucide-react';

interface SelectedCourse {
  _id: string;
  courseName: string;
  courseCode: string;
  year: number;
  semester: number;
  credits: number;
}

interface GroupStudent {
  _id: string;
  name: string;
  studentIdNumber: string;
  email?: string;
  specialization?: string;
}

interface CourseGroup {
  _id: string;
  groupName: string;
  studentIds: string[];
  students?: GroupStudent[];
}

export default function LecturerTeamsPage() {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [eligibleStudents, setEligibleStudents] = useState<GroupStudent[]>([]);
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({
    groupName: '',
    studentIds: [] as string[],
  });

  useEffect(() => {
    try {
      const savedCourse = localStorage.getItem('selectedCourse');
      if (savedCourse) {
        setSelectedCourse(JSON.parse(savedCourse));
      }
    } catch (err) {
      console.error('Failed to read selected course:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleCourseSelected = (event: Event) => {
      const customEvent = event as CustomEvent<SelectedCourse>;
      setSelectedCourse(customEvent.detail);
      setError(null);
    };

    window.addEventListener('courseSelected', handleCourseSelected);
    return () => window.removeEventListener('courseSelected', handleCourseSelected);
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!selectedCourse?._id) {
        setEligibleStudents([]);
        setGroups([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(
          `/api/projects-and-tasks/lecturer/course-groups?courseId=${selectedCourse._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data?.message || 'Failed to fetch groups');
        }

        const data = await response.json();
        setGroups(data?.data?.groups || []);
        setEligibleStudents(data?.data?.eligibleStudents || []);
      } catch (err) {
        console.error('Fetch groups error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch groups');
        setEligibleStudents([]);
        setGroups([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [selectedCourse?._id]);

  const totalStudents = useMemo(
    () => groups.reduce((sum, group) => sum + (group.students?.length || 0), 0),
    [groups]
  );

  const toggleStudent = (studentId: string) => {
    setGroupForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter((id) => id !== studentId)
        : [...prev.studentIds, studentId],
    }));
  };

  const resetForm = () => {
    setEditingGroupId(null);
    setGroupForm({
      groupName: '',
      studentIds: [],
    });
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse?._id) return;
    if (!groupForm.groupName.trim() || groupForm.studentIds.length === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const endpoint = editingGroupId
        ? `/api/projects-and-tasks/lecturer/course-groups/${editingGroupId}`
        : '/api/projects-and-tasks/lecturer/course-groups';
      const method = editingGroupId ? 'PUT' : 'POST';
      const body = editingGroupId
        ? {
            groupName: groupForm.groupName.trim(),
            studentIds: groupForm.studentIds,
          }
        : {
            courseId: selectedCourse._id,
            groupName: groupForm.groupName.trim(),
            studentIds: groupForm.studentIds,
          };

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message || 'Failed to save group');
      }

      resetForm();

      const refresh = await fetch(
        `/api/projects-and-tasks/lecturer/course-groups?courseId=${selectedCourse._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const refreshData = await refresh.json();
      setGroups(refreshData?.data?.groups || []);
      setEligibleStudents(refreshData?.data?.eligibleStudents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (group: CourseGroup) => {
    setEditingGroupId(group._id);
    setGroupForm({
      groupName: group.groupName,
      studentIds: group.studentIds || [],
    });
  };

  const handleDelete = async (groupId: string) => {
    if (!selectedCourse?._id) return;

    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/projects-and-tasks/lecturer/course-groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message || 'Failed to delete group');
      }

      setGroups((prev) => prev.filter((group) => group._id !== groupId));
      if (editingGroupId === groupId) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
    }
  };

  if (isLoading && !selectedCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-brand-blue" size={30} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-600 mt-2">
            {selectedCourse
              ? `${selectedCourse.courseName} - Group assignments`
              : 'Select a course from the header dropdown to view groups'}
          </p>
        </div>

        {!selectedCourse ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-600">
            No course selected.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Course</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{selectedCourse.courseCode}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Groups</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{groups.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Grouped Students</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{totalStudents}</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
                <AlertCircle className="text-red-600" size={18} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center gap-3 text-gray-600">
                <Loader className="animate-spin" size={18} />
                Loading groups...
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 bg-white border border-gray-200 rounded-xl p-5 h-fit">
                  <h2 className="font-semibold text-gray-900 mb-4">
                    {editingGroupId ? 'Edit Group' : 'Create Group'}
                  </h2>
                  <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Group Name
                      </label>
                      <input
                        type="text"
                        value={groupForm.groupName}
                        onChange={(e) =>
                          setGroupForm((prev) => ({ ...prev, groupName: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        placeholder="e.g., Group 1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Students ({groupForm.studentIds.length} selected)
                      </label>
                      <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
                        {eligibleStudents.map((student) => (
                          <label
                            key={student._id}
                            className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={groupForm.studentIds.includes(student._id)}
                              onChange={() => toggleStudent(student._id)}
                              className="mt-1 h-4 w-4 accent-brand-blue"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{student.name}</p>
                              <p className="text-xs text-gray-600">
                                {student.studentIdNumber} {student.specialization ? `• ${student.specialization}` : ''}
                              </p>
                            </div>
                          </label>
                        ))}
                        {eligibleStudents.length === 0 && (
                          <p className="p-3 text-sm text-gray-500">No eligible students found.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingGroupId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSaving || !groupForm.groupName.trim() || groupForm.studentIds.length === 0}
                        className="px-3 py-2 text-sm rounded-lg bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : editingGroupId ? 'Update Group' : 'Create Group'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="xl:col-span-2 space-y-4">
                  {groups.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                      No groups found for this course. Create your first group.
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div key={group._id} className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Users size={18} className="text-brand-blue" />
                            <h2 className="font-semibold text-gray-900">{group.groupName}</h2>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(group)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Edit group"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(group._id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Delete group"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {(group.students || []).length} students
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                          {(group.students || []).map((student) => (
                            <div
                              key={student._id}
                              className="rounded-lg border border-gray-200 p-3 bg-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-gray-500" />
                                <p className="text-sm font-medium text-gray-900">{student.name}</p>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{student.studentIdNumber}</p>
                              {student.specialization && (
                                <p className="text-xs text-gray-500 mt-1">{student.specialization}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
