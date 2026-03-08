'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type RiskFilter = 'all' | 'high' | 'medium' | 'low' | 'unknown';

interface StudentInsight {
  studentId: string;
  studentIdNumber: string;
  name: string;
  email: string;
  specialization: string;
  academicYear: string;
  semester: string;
  riskLevel: string;
  riskProbability: number;
  completionRate: number;
  engagement: number;
  avgScore: number;
  lateSubmissionCount: number;
  confidence?: number;
  predictionSource?: 'stored_prediction' | 'live_prediction' | 'none' | string;
}

interface LivePredictionStatus {
  requested: boolean;
  enabled: boolean;
  error: string | null;
}

function LecturerStudentInsightsPageContent() {
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();
  const [students, setStudents] = useState<StudentInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [risk, setRisk] = useState<RiskFilter>('all');
  const [livePrediction, setLivePrediction] = useState<LivePredictionStatus>({
    requested: true,
    enabled: true,
    error: null,
  });

  const fetchStudents = async (
    searchQuery: string,
    nextRisk: RiskFilter,
    sortBy: 'risk' | 'completion' | 'engagement' | 'score' | 'name' = 'risk',
    order: 'asc' | 'desc' = 'desc',
    nextIncludeLivePrediction = true
  ) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const params = new URLSearchParams({
        q: searchQuery,
        risk: nextRisk,
        sortBy,
        order,
        includeLivePrediction: String(nextIncludeLivePrediction),
      });
      const response = await fetch(`/api/learning-analytics/lecturer/students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load student insights');
      }

      const json = await response.json();
      setStudents(json.data?.students || []);
      setLivePrediction(
        json.data?.livePrediction || {
          requested: true,
          enabled: false,
          error: 'No live prediction status received',
        }
      );
      setError(null);
    } catch (err) {
      console.error('Student insights fetch error:', err);
      setError('Failed to load student insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(queryKey);
    const qpRisk = params.get('risk');
    const qpSortBy = params.get('sortBy');
    const qpOrder = params.get('order');

    const safeRisk: RiskFilter =
      qpRisk === 'high' || qpRisk === 'medium' || qpRisk === 'low' || qpRisk === 'unknown' || qpRisk === 'all'
        ? qpRisk
        : 'all';
    const safeSortBy =
      qpSortBy === 'risk' || qpSortBy === 'completion' || qpSortBy === 'engagement' || qpSortBy === 'score' || qpSortBy === 'name'
        ? qpSortBy
        : 'risk';
    const safeOrder = qpOrder === 'asc' ? 'asc' : 'desc';

    setRisk(safeRisk);
    fetchStudents('', safeRisk, safeSortBy, safeOrder, true);
  }, [queryKey]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchStudents(q, risk, 'risk', 'desc', true);
    }, 300);

    return () => clearTimeout(timeout);
  }, [q, risk]);

  const summary = useMemo(() => {
    return {
      total: students.length,
      high: students.filter((student) => student.riskLevel === 'high').length,
      medium: students.filter((student) => student.riskLevel === 'medium').length,
      low: students.filter((student) => student.riskLevel === 'low').length,
    };
  }, [students]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">Student Insights</h1>
        <p className="text-sm text-slate-600">Search and filter students by estimated risk, completion, engagement, and score trends.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total" value={summary.total} />
        <Stat label="High Risk" value={summary.high} tone="red" />
        <Stat label="Medium Risk" value={summary.medium} tone="amber" />
        <Stat label="Low Risk" value={summary.low} tone="green" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search by name, ID or email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none md:w-80"
          />
          <select
            value={risk}
            onChange={(event) => setRisk(event.target.value as RiskFilter)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All Risks</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
            <option value="unknown">Unknown</option>
          </select>

          <p className={`text-sm font-medium ${livePrediction.enabled ? 'text-emerald-700' : 'text-amber-700'}`}>
            {livePrediction.enabled
              ? 'Live prediction is ON.'
              : `Live prediction is OFF (${livePrediction.error || 'ML API not connected'}). Showing stored data.`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading students...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Estimated Risk</th>
                <th className="px-4 py-3 font-semibold">Completion</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Engagement</th>
                <th className="px-4 py-3 font-semibold">Late Count</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td className="px-4 py-4 text-slate-500" colSpan={7}>No students found for current filters.</td></tr>
              ) : (
                students.map((student) => (
                  <tr key={student.studentId} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.studentIdNumber} • {student.specialization}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p>{student.riskLevel.toUpperCase()} ({student.riskProbability}%)</p>
                      {typeof student.confidence === 'number' && student.confidence > 0 && (
                        <p className="text-xs text-slate-500">Model certainty: {student.confidence}%</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{student.completionRate}%</td>
                    <td className="px-4 py-3 text-slate-700">{student.avgScore}%</td>
                    <td className="px-4 py-3 text-slate-700">{student.engagement}</td>
                    <td className="px-4 py-3 text-slate-700">{student.lateSubmissionCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function LecturerStudentInsightsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LecturerStudentInsightsPageContent />
    </Suspense>
  );
}

function Stat({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'red' | 'amber' | 'green';
}) {
  const toneClass =
    tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : tone === 'green'
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-slate-200 bg-white text-slate-700';
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
