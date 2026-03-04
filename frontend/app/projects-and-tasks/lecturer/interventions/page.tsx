'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader, Pencil, Trash2, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type AlertLevel = 'low' | 'medium' | 'high';
type TargetMode = 'student' | 'students' | 'group' | 'filter';
type FilterType = 'all_students' | 'at_risk' | 'low_activity';
type TabMode = 'create' | 'all';

interface SelectedCourse {
  _id: string;
  courseName: string;
}

interface StudentOption {
  _id: string;
  name: string;
  studentIdNumber: string;
}

interface GroupOption {
  _id: string;
  groupName: string;
}

interface RecipientStudent {
  _id: string;
  name: string;
  studentIdNumber: string;
}

interface AlertItem {
  _id: string;
  level: AlertLevel;
  message: string;
  targetMode: TargetMode;
  filterType?: FilterType;
  groupId?: string;
  groupName?: string;
  recipientStudents?: RecipientStudent[];
  createdAt: string;
}

const LEVEL_BADGE: Record<AlertLevel, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
};
const LEVEL_LABEL: Record<AlertLevel, string> = {
  low: 'General Guidance',
  medium: 'Priority Review',
  high: 'Immediate Action',
};

const TARGET_LABEL: Record<TargetMode, string> = {
  student: 'Single Student',
  students: 'Multiple Students',
  group: 'Group',
  filter: 'Filter',
};

const FILTER_LABEL: Record<FilterType, string> = {
  all_students: 'All Students',
  at_risk: 'At-Risk Students',
  low_activity: 'Low Activity Students',
};

function LecturerAlertsPageContent() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') === 'all' ? 'all' : 'create';

  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [activeTab, setActiveTab] = useState<TabMode>(urlTab);

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);

  const [level, setLevel] = useState<AlertLevel>('medium');
  const [message, setMessage] = useState('');
  const [targetMode, setTargetMode] = useState<TargetMode>('student');
  const [studentId, setStudentId] = useState('');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [groupId, setGroupId] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all_students');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  useEffect(() => {
    try {
      const savedCourse = localStorage.getItem('selectedCourse');
      if (savedCourse) {
        setSelectedCourse(JSON.parse(savedCourse));
      }
    } catch (err) {
      console.error('Error reading selected module:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const onCourseSelected = (event: Event) => {
      const customEvent = event as CustomEvent<SelectedCourse>;
      setSelectedCourse(customEvent.detail);
      setError(null);
      setSuccess(null);
      setEditingAlertId(null);
      setStudentId('');
      setStudentIds([]);
      setGroupId('');
    };

    window.addEventListener('courseSelected', onCourseSelected);
    return () => window.removeEventListener('courseSelected', onCourseSelected);
  }, []);

  const fetchAlerts = useCallback(async () => {
    if (!selectedCourse?._id) {
      setStudents([]);
      setGroups([]);
      setAlerts([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/projects-and-tasks/lecturer/alerts?courseId=${selectedCourse._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch alerts');
      }

      setStudents(data.data?.students || []);
      setGroups(data.data?.groups || []);
      setAlerts(data.data?.alerts || []);
    } catch (err) {
      console.error('Fetch alerts error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      setStudents([]);
      setGroups([]);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCourse?._id]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const studentMap = useMemo(
    () => new Map(students.map((student) => [student._id, student])),
    [students]
  );

  const selectedRecipientsCount = useMemo(() => {
    if (targetMode === 'student') return studentId ? 1 : 0;
    if (targetMode === 'students') return studentIds.length;
    if (targetMode === 'group') return groupId ? null : 0;
    return null;
  }, [targetMode, studentId, studentIds, groupId]);

  const toggleMultiStudent = (id: string) => {
    setStudentIds((prev) =>
      prev.includes(id) ? prev.filter((studentIdValue) => studentIdValue !== id) : [...prev, id]
    );
  };

  const resetTargetValues = (mode: TargetMode) => {
    setTargetMode(mode);
    setStudentId('');
    setStudentIds([]);
    setGroupId('');
    setFilterType('all_students');
  };

  const resetForm = () => {
    setEditingAlertId(null);
    setLevel('medium');
    setMessage('');
    setTargetMode('student');
    setStudentId('');
    setStudentIds([]);
    setGroupId('');
    setFilterType('all_students');
  };

  const startEditAlert = (alert: AlertItem) => {
    setEditingAlertId(alert._id);
    setLevel(alert.level);
    setMessage(alert.message);
    setTargetMode(alert.targetMode);
    setStudentId('');
    setStudentIds([]);
    setGroupId(alert.groupId || '');
    setFilterType(alert.filterType || 'all_students');

    if (alert.targetMode === 'student') {
      setStudentId(alert.recipientStudents?.[0]?._id || '');
    } else if (alert.targetMode === 'students') {
      setStudentIds((alert.recipientStudents || []).map((student) => student._id));
    }

    setError(null);
    setSuccess(null);
    setActiveTab('create');
  };

  const handleDeleteAlert = async (alertId: string) => {
    const shouldDelete = window.confirm('Delete this alert?');
    if (!shouldDelete) return;

    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/projects-and-tasks/lecturer/alerts/${alertId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete alert');
      }

      setAlerts((prev) => prev.filter((alert) => alert._id !== alertId));
      if (editingAlertId === alertId) {
        resetForm();
      }
      setSuccess('Alert deleted successfully');
    } catch (err) {
      console.error('Delete alert error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
    }
  };

  const handleCreateOrUpdateAlert = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCourse?._id) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      const body: Record<string, unknown> = {
        courseId: selectedCourse._id,
        level,
        message: message.trim(),
        targetMode,
      };

      if (targetMode === 'student') body.studentId = studentId;
      if (targetMode === 'students') body.studentIds = studentIds;
      if (targetMode === 'group') body.groupId = groupId;
      if (targetMode === 'filter') body.filterType = filterType;

      const isEditing = Boolean(editingAlertId);
      const response = await fetch(
        isEditing ? `/api/projects-and-tasks/lecturer/alerts/${editingAlertId}` : '/api/projects-and-tasks/lecturer/alerts',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} alert`);
      }

      setSuccess(isEditing ? 'Alert updated successfully' : 'Alert created successfully');
      resetForm();
      await fetchAlerts();
      setActiveTab('all');
    } catch (err) {
      console.error('Create alert error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTargetFields = () => {
    if (targetMode === 'student') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
          <select
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            required
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student._id} value={student._id}>
                {student.name} ({student.studentIdNumber})
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (targetMode === 'students') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Students</label>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 bg-gray-50">
            {students.map((student) => (
              <label key={student._id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="text-gray-800">
                  {student.name} <span className="text-gray-500">({student.studentIdNumber})</span>
                </span>
                <input
                  type="checkbox"
                  checked={studentIds.includes(student._id)}
                  onChange={() => toggleMultiStudent(student._id)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                />
              </label>
            ))}
            {students.length === 0 && (
              <p className="px-3 py-3 text-sm text-gray-500">No students available in this module.</p>
            )}
          </div>
        </div>
      );
    }

    if (targetMode === 'group') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
          <select
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            required
          >
            <option value="">Select group</option>
            {groups.map((group) => (
              <option key={group._id} value={group._id}>
                {group.groupName}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
        <select
          value={filterType}
          onChange={(event) => setFilterType(event.target.value as FilterType)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          <option value="all_students">All Students</option>
          <option value="at_risk">All Students At Risk</option>
          <option value="low_activity">All Students With Low Activity</option>
        </select>
      </div>
    );
  };

  const formTitle = editingAlertId ? 'Edit Alert' : 'Create Alert';
  const formSubmitLabel = editingAlertId ? 'Update Alert' : 'Create Alert';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-sm text-gray-600 mt-1">
            {selectedCourse ? selectedCourse.courseName : 'Select a module from header dropdown'}
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-3 py-2 text-sm rounded-lg ${
              activeTab === 'create' ? 'bg-brand-blue text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Create Alert
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 text-sm rounded-lg ${
              activeTab === 'all' ? 'bg-brand-blue text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Alerts
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 inline-flex items-center gap-2">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {!selectedCourse ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
          Select a module from the top dropdown to create or view alerts.
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 flex justify-center">
          <Loader className="animate-spin text-brand-blue" size={28} />
        </div>
      ) : activeTab === 'create' ? (
        <form onSubmit={handleCreateOrUpdateAlert} className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{formTitle}</h2>
            {editingAlertId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as AlertLevel[]).map((currentLevel) => (
                  <button
                    key={currentLevel}
                    type="button"
                    onClick={() => setLevel(currentLevel)}
                    className={`rounded-lg border px-3 py-2 text-sm capitalize ${
                      level === currentLevel
                        ? LEVEL_BADGE[currentLevel]
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {LEVEL_LABEL[currentLevel]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Type</label>
              <select
                value={targetMode}
                onChange={(event) => resetTargetValues(event.target.value as TargetMode)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="student">Single Student</option>
                <option value="students">Multiple Students</option>
                <option value="group">Group</option>
                <option value="filter">Filter</option>
              </select>
            </div>
          </div>

          {renderTargetFields()}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              maxLength={1000}
              required
              placeholder="Write alert message for selected recipients"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>
                {selectedRecipientsCount === null
                  ? 'Recipients will be resolved from selected group/filter.'
                  : `${selectedRecipientsCount} recipient(s) selected.`}
              </span>
              <span>{message.length}/1000</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? <Loader className="animate-spin" size={16} /> : <AlertCircle size={16} />}
              {formSubmitLabel}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-500">No alerts created yet for this module.</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert._id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${LEVEL_BADGE[alert.level]}`}>
                      {LEVEL_LABEL[alert.level]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">
                    {TARGET_LABEL[alert.targetMode]}
                    {alert.targetMode === 'group' && alert.groupName ? `: ${alert.groupName}` : ''}
                    {alert.targetMode === 'filter' && alert.filterType ? `: ${FILTER_LABEL[alert.filterType]}` : ''}
                  </span>
                </div>

                <p className="text-sm text-gray-900 mt-3 whitespace-pre-wrap">{alert.message}</p>

                <div className="mt-3 flex items-start gap-2 text-xs text-gray-600">
                  <Users size={14} className="mt-0.5" />
                  <div>
                    <p>{alert.recipientStudents?.length || 0} recipient(s)</p>
                    {alert.recipientStudents && alert.recipientStudents.length > 0 && (
                      <p className="text-gray-500 mt-1">
                        {alert.recipientStudents
                          .slice(0, 5)
                          .map((student) => {
                            const fallback = studentMap.get(student._id);
                            const studentName = student.name || fallback?.name || 'Student';
                            const number = student.studentIdNumber || fallback?.studentIdNumber || '-';
                            return `${studentName} (${number})`;
                          })
                          .join(', ')}
                        {alert.recipientStudents.length > 5 ? ' ...' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => startEditAlert(alert)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAlert(alert._id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function LecturerAlertsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LecturerAlertsPageContent />
    </Suspense>
  );
}
