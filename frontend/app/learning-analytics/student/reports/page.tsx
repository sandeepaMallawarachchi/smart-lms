'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, FileSpreadsheet, FileText, RefreshCcw } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

type ReportRange = 'weekly' | 'monthly' | 'all';

interface ReportData {
  generatedAt: string;
  range: ReportRange;
  student: {
    studentIdNumber: string;
    name: string;
    email: string;
    specialization: string;
    semester: string;
    academicYear: string;
  };
  overview: {
    totalCourses: number;
    overallProgress: number;
    completionRate: number;
    achievements: number;
    latestRiskLevel: string;
    latestRiskProbability: number;
  };
  metrics: {
    averageScore: number;
    averageCompletionRate: number;
    averageEngagement: number;
    averageRiskProbability: number;
    lateSubmissionCount: number;
    activeDays: number;
    studiedCredits: number;
  };
  goals: {
    total: number;
    todo: number;
    inprogress: number;
    done: number;
    items: Array<{
      id: string;
      title: string;
      status: string;
      category: string;
      priority: string;
      targetDate?: string;
    }>;
  };
  courses: Array<{
    courseId: string;
    courseName: string;
    credits: number;
    completionRate: number;
    tasksTotal: number;
    tasksCompleted: number;
  }>;
  recentPredictions: Array<{
    date: string;
    riskLevel: string;
    riskProbability: number;
    avgScore: number;
    completionRate: number;
    engagement: number;
  }>;
}

const labelForRange = (range: ReportRange) => {
  if (range === 'weekly') return 'Last 7 Days';
  if (range === 'all') return 'All Time';
  return 'Last 30 Days';
};

const riskColor = (risk: string) => {
  const normalized = risk.toLowerCase();
  if (normalized === 'high') return 'text-red-700 bg-red-50 border-red-200';
  if (normalized === 'medium') return 'text-amber-700 bg-amber-50 border-amber-200';
  if (normalized === 'low') return 'text-green-700 bg-green-50 border-green-200';
  return 'text-gray-700 bg-gray-50 border-gray-200';
};

export default function LearningAnalyticsReportsPage() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<ReportData | null>(null);
  const [range, setRange] = useState<ReportRange>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (nextRange: ReportRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/learning-analytics/reports?range=${nextRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to fetch report');
      }

      const json = await response.json();
      setReport(json.data || null);
    } catch (err: unknown) {
      console.error('Report fetch error:', err);
      setError('Failed to load analytics report');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const qpRange = searchParams.get('range');
    if (qpRange === 'weekly' || qpRange === 'monthly' || qpRange === 'all') {
      setRange(qpRange);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchReport(range);
  }, [range]);

  const exportedAt = useMemo(() => {
    if (!report?.generatedAt) return '-';
    return new Date(report.generatedAt).toLocaleString();
  }, [report?.generatedAt]);

  const handleCsvExport = async () => {
    try {
      setIsExportingCsv(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }
      const response = await fetch(`/api/learning-analytics/reports/export/csv?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `learning-analytics-${range}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export error:', err);
      setError('CSV export failed');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handlePdfExport = () => {
    if (!report) return;
    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) {
      setError('Popup blocked. Please allow popups and try again.');
      return;
    }

    const logoUrl = `${window.location.origin}/logo1.png`;

    const goalRows = report.goals.items
      .slice(0, 8)
      .map(
        (goal) => `
          <tr>
            <td>${goal.title}</td>
            <td>${goal.status}</td>
            <td>${goal.category}</td>
            <td>${goal.priority}</td>
            <td>${goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : '-'}</td>
          </tr>
        `
      )
      .join('');

    const courseRows = report.courses
      .map(
        (course) => `
          <tr>
            <td>${course.courseName}</td>
            <td>${course.credits}</td>
            <td>${course.tasksCompleted}/${course.tasksTotal}</td>
            <td>${course.completionRate}%</td>
          </tr>
        `
      )
      .join('');

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Learning Analytics Report</title>
          <style>
            body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; color: #0f172a; background: #f8fafc; }
            .page { max-width: 980px; margin: 0 auto; padding: 28px; }
            .hero { background: linear-gradient(135deg, #1d4ed8, #0f766e); color: white; border-radius: 16px; padding: 22px 24px; }
            .hero-top { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
            .logo { height: 44px; width: auto; border-radius: 6px; background: rgba(255,255,255,0.12); padding: 4px; }
            .title { font-size: 28px; font-weight: 700; margin: 0; }
            .sub { margin-top: 4px; font-size: 14px; opacity: 0.92; }
            .chips { margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; }
            .chip { background: rgba(255,255,255,0.18); padding: 6px 10px; border-radius: 999px; font-size: 12px; }
            .grid { margin-top: 18px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
            .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
            .card h4 { margin: 0; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }
            .card p { margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #0f172a; }
            .section { margin-top: 16px; }
            .section h3 { margin: 0 0 8px; font-size: 15px; color: #334155; text-transform: uppercase; letter-spacing: 0.04em; }
            table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
            th, td { padding: 9px 10px; font-size: 13px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            th { background: #f1f5f9; color: #334155; font-weight: 700; }
            tr:last-child td { border-bottom: none; }
            .footer { margin-top: 18px; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }
            @media print { .page { padding: 12mm; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="hero">
              <div class="hero-top">
                <div>
                  <h1 class="title">Student Analytics Report</h1>
                  <div class="sub">${report.student.name} (${report.student.studentIdNumber})</div>
                </div>
                <img class="logo" src="${logoUrl}" alt="Logo" />
              </div>
              <div class="chips">
                <span class="chip">${report.student.specialization}</span>
                <span class="chip">Semester ${report.student.semester}</span>
                <span class="chip">Year ${report.student.academicYear}</span>
                <span class="chip">${labelForRange(report.range)}</span>
              </div>
            </div>

            <div class="grid">
              <div class="card"><h4>Overall Progress</h4><p>${report.overview.overallProgress}%</p></div>
              <div class="card"><h4>Completion Rate</h4><p>${report.overview.completionRate}%</p></div>
              <div class="card"><h4>Avg Score</h4><p>${report.metrics.averageScore}%</p></div>
              <div class="card"><h4>Risk Level</h4><p>${report.overview.latestRiskLevel.toUpperCase()}</p></div>
            </div>

            <div class="section">
              <h3>Course Summary</h3>
              <table>
                <thead>
                  <tr><th>Course</th><th>Credits</th><th>Completed</th><th>Completion Rate</th></tr>
                </thead>
                <tbody>${courseRows || '<tr><td colspan="4">No course data</td></tr>'}</tbody>
              </table>
            </div>

            <div class="section">
              <h3>Learning Goals</h3>
              <table>
                <thead>
                  <tr><th>Title</th><th>Status</th><th>Category</th><th>Priority</th><th>Target Date</th></tr>
                </thead>
                <tbody>${goalRows || '<tr><td colspan="5">No goals available</td></tr>'}</tbody>
              </table>
            </div>

            <div class="footer">
              <span>Generated: ${new Date(report.generatedAt).toLocaleString()}</span>
              <span>Smart LMS Learning Analytics</span>
            </div>
          </div>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-700">
        Loading analytics report...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-700">
        No report data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-cyan-700 to-emerald-700 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Analytics Reports</h1>
            <p className="mt-1 text-sm text-blue-100">
              {report.student.name} - {report.student.studentIdNumber}
            </p>
            <p className="mt-1 text-sm text-blue-100">Generated at: {exportedAt}</p>
          </div>
          <Image
            src="/logo1.png"
            alt="Smart LMS Logo"
            width={180}
            height={48}
            className="h-12 w-auto rounded-md bg-white/20 p-1"
            priority
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as ReportRange)}
            className="rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm text-white outline-none backdrop-blur"
          >
            <option value="weekly" className="text-slate-900">Last 7 Days</option>
            <option value="monthly" className="text-slate-900">Last 30 Days</option>
            <option value="all" className="text-slate-900">All Time</option>
          </select>
          <button
            type="button"
            onClick={() => fetchReport(range)}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handlePdfExport}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-200"
          >
            <FileText size={16} />
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleCsvExport}
            disabled={isExportingCsv}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-100 px-3 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileSpreadsheet size={16} />
            {isExportingCsv ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Overall Progress" value={`${report.overview.overallProgress}%`} />
        <StatCard label="Avg Score" value={`${report.metrics.averageScore}%`} />
        <StatCard label="Avg Completion" value={`${report.metrics.averageCompletionRate}%`} />
        <div className={`rounded-xl border p-4 ${riskColor(report.overview.latestRiskLevel)}`}>
          <p className="text-xs font-semibold uppercase tracking-wide">Latest Risk</p>
          <p className="mt-1 text-2xl font-bold">{report.overview.latestRiskLevel.toUpperCase()}</p>
          <p className="text-xs">Probability {report.overview.latestRiskProbability}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Course Completion</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Credits</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                  <th className="px-4 py-3 font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {report.courses.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>No course data available.</td>
                  </tr>
                ) : (
                  report.courses.map((course) => (
                    <tr key={course.courseId} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-800">{course.courseName}</td>
                      <td className="px-4 py-3 text-slate-700">{course.credits}</td>
                      <td className="px-4 py-3 text-slate-700">{course.tasksCompleted}/{course.tasksTotal}</td>
                      <td className="px-4 py-3 text-slate-700">{course.completionRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Goal Status Snapshot</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            <MiniStat label="To Do" value={report.goals.todo} tone="slate" />
            <MiniStat label="In Progress" value={report.goals.inprogress} tone="amber" />
            <MiniStat label="Done" value={report.goals.done} tone="green" />
          </div>
          <div className="border-t border-slate-200 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent Goals</h3>
            <div className="space-y-2">
              {report.goals.items.slice(0, 5).map((goal) => (
                <div key={goal.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="truncate pr-3 text-sm text-slate-800">{goal.title}</p>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold uppercase text-slate-600">{goal.status}</span>
                </div>
              ))}
              {report.goals.items.length === 0 && (
                <p className="text-sm text-slate-500">No goals found.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Prediction History</h2>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <ArrowDownToLine size={14} />
            Included in PDF/CSV
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Risk</th>
                <th className="px-4 py-3 font-semibold">Risk Probability</th>
                <th className="px-4 py-3 font-semibold">Avg Score</th>
                <th className="px-4 py-3 font-semibold">Completion</th>
                <th className="px-4 py-3 font-semibold">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {report.recentPredictions.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    No predictions available for this range.
                  </td>
                </tr>
              ) : (
                report.recentPredictions.map((item, index) => (
                  <tr key={`${item.date}-${index}`} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">{new Date(item.date).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${riskColor(item.riskLevel)}`}>
                        {item.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.riskProbability}%</td>
                    <td className="px-4 py-3 text-slate-700">{item.avgScore}%</td>
                    <td className="px-4 py-3 text-slate-700">{item.completionRate}%</td>
                    <td className="px-4 py-3 text-slate-700">{item.engagement.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'amber' | 'green';
}) {
  const toneClass =
    tone === 'green'
      ? 'border-green-200 bg-green-50 text-green-800'
      : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-slate-200 bg-slate-50 text-slate-800';
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
