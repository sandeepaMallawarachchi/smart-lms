'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  BookOpen,
  Calendar,
  Users,
  Award,
  Archive,
  Trash2,
  Edit,
  ArchiveRestore,
  X,
} from 'lucide-react';

interface Lecturer {
  _id: string;
  name: string;
  email: string;
  position?: string;
}

interface Course {
  _id: string;
  courseName: string;
  credits: number;
  year: number;
  semester: number;
  lecturerInCharge: Lecturer;
  lecturers: Lecturer[];
  isArchived: boolean;
  createdAt: string;
}

export default function CoursesPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'archived'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [formData, setFormData] = useState({
    courseName: '',
    credits: 3,
    year: 1,
    semester: 1,
    lecturerInCharge: '',
    lecturers: [] as string[],
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    archived: 0,
  });

  useEffect(() => {
    if (filterParam === 'archived') {
      setFilterType('archived');
    } else if (filterParam === 'active') {
      setFilterType('active');
    } else {
      setFilterType('all');
    }
  }, [filterParam]);

  useEffect(() => {
    fetchCourses();
    fetchLecturers();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, searchQuery, filterType]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.data.courses);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLecturers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/lecturers/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLecturers(data.data.lecturers);
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  };

  const filterCourses = () => {
    let filtered = courses;

    if (filterType === 'active') {
      filtered = filtered.filter(course => !course.isArchived);
    } else if (filterType === 'archived') {
      filtered = filtered.filter(course => course.isArchived);
    }

    if (searchQuery) {
      filtered = filtered.filter(course =>
        course.courseName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCourses(filtered);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setCourses([data.data.course, ...courses]);
        setShowCreateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating course:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleArchiveToggle = async (courseId: string, isArchived: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/courses/archive', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          isArchived: !isArchived,
        }),
      });

      if (response.ok) {
        setCourses(courses.map(c =>
          c._id === courseId ? { ...c, isArchived: !isArchived } : c
        ));
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;

    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/courses/${selectedCourse._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setCourses(courses.filter(c => c._id !== selectedCourse._id));
        setShowDeleteModal(false);
        setSelectedCourse(null);
      }
    } catch (error) {
      console.error('Error deleting course:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      courseName: '',
      credits: 3,
      year: 1,
      semester: 1,
      lecturerInCharge: '',
      lecturers: [],
    });
  };

  const handleLecturerToggle = (lecturerId: string) => {
    setFormData(prev => ({
      ...prev,
      lecturers: prev.lecturers.includes(lecturerId)
        ? prev.lecturers.filter(id => id !== lecturerId)
        : [...prev.lecturers, lecturerId],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Course Management</h1>
          <p className="text-gray-600">Manage all courses and assignments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={20} />
          Create Course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">Total Courses</h3>
            <BookOpen size={24} className="text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">Active</h3>
            <Calendar size={24} className="text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">Archived</h3>
            <Archive size={24} className="text-gray-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.archived}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('active')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'active'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterType('archived')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'archived'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Archived
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year/Semester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lecturer in Charge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  All Lecturers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCourses.map((course) => (
                <tr key={course._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <BookOpen size={20} className="text-purple-600" />
                      </div>
                      <div className="text-sm font-medium text-gray-900">{course.courseName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Year {course.year} - Semester {course.semester}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      <Award size={14} />
                      {course.credits} Credits
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {course.lecturerInCharge.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Users size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{course.lecturers.length} lecturer(s)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {course.isArchived ? (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        Archived
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleArchiveToggle(course._id, course.isArchived)}
                        className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
                          course.isArchived ? 'text-green-600' : 'text-gray-600'
                        }`}
                        title={course.isArchived ? 'Unarchive' : 'Archive'}
                      >
                        {course.isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No courses found</p>
              <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Create New Course</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Name *
                </label>
                <input
                  type="text"
                  value={formData.courseName}
                  onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Software Engineering Principles"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credits *
                  </label>
                  <select
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year *
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[1, 2, 3, 4].map(num => (
                      <option key={num} value={num}>Year {num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semester *
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lecturer in Charge *
                </label>
                <select
                  value={formData.lecturerInCharge}
                  onChange={(e) => setFormData({ ...formData, lecturerInCharge: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select Lecturer in Charge</option>
                  {lecturers.map(lecturer => (
                    <option key={lecturer._id} value={lecturer._id}>
                      {lecturer.name} {lecturer.position ? `- ${lecturer.position}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Lecturers (Optional)
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                  {lecturers.map(lecturer => (
                    <label key={lecturer._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.lecturers.includes(lecturer._id)}
                        onChange={() => handleLecturerToggle(lecturer._id)}
                        disabled={lecturer._id === formData.lecturerInCharge}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{lecturer.name}</div>
                        <div className="text-xs text-gray-500">{lecturer.position || 'Lecturer'}</div>
                      </div>
                      {lecturer._id === formData.lecturerInCharge && (
                        <span className="text-xs text-purple-600 font-medium">In Charge</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  disabled={createLoading}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {createLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Course
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Course</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">{selectedCourse.courseName}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCourse(null);
                }}
                disabled={deleteLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourse}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}