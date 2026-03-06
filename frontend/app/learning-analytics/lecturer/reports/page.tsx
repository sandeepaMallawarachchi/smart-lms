'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, RefreshCcw } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

interface LecturerReportData {
  generatedAt: string;
  summary: {
    totalStudents: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    averageRiskProbability?: number;
    highRiskRatio?: number;
  };
  livePrediction?: {
    enabled: boolean;
    error: string | null;
  };
  classGuidance: string[];
  courses: Array<{
    courseId: string;
    courseName: string;
    students: number;
    avgRiskProbability: number;
    avgCompletionRate: number;
  }>;
  topStudentsByRisk: Array<{
    studentId: string;
    studentIdNumber: string;
    name: string;
    riskLevel: string;
    riskProbability: number;
    completionRate: number;
    engagement: number;
  }>;
  personalizedRecommendations: Array<{
    studentId: string;
    studentIdNumber: string;
    name: string;
    riskLevel: string;
    riskProbability: number;
    recommendation: string;
  }>;
}

export default function LecturerReportsPage() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<LecturerReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  const query = useMemo(() => searchParams.toString(), [searchParams]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const res = await fetch(`/api/learning-analytics/lecturer/reports${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to load lecturer report');
      }
      const json = await res.json();
      setReport(json.data || null);
    } catch (err) {
      console.error('Lecturer report fetch error:', err);
      setError('Failed to load lecturer report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const exportCsv = async () => {
    try {
      setExportingCsv(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const res = await fetch(
        `/api/learning-analytics/lecturer/reports/export/csv${query ? `?${query}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('CSV export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lecturer-analytics-report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export error:', err);
      setError('CSV export failed');
    } finally {
      setExportingCsv(false);
    }
  };

  const exportPdf = () => {
    if (!report) return;
    const popup = window.open('', '_blank', 'width=1100,height=850');
    if (!popup) return;

    const logoUrl = `${window.location.origin}/logo1.png`;
    const courseRows = report.courses
      .map(
        (course) => `<tr>
          <td>${course.courseName}</td>
          <td>${course.students}</td>
          <td>${course.avgRiskProbability}%</td>
          <td>${course.avgCompletionRate}%</td>
        </tr>`
      )
      .join('');

    const topStudentsRows = report.topStudentsByRisk
      .slice(0, 10)
      .map(
        (student) => `<tr>
          <td>${student.name}</td>
          <td>${student.studentIdNumber}</td>
          <td>${String(student.riskLevel).toUpperCase()}</td>
          <td>${student.riskProbability}%</td>
          <td>${student.completionRate}%</td>
        </tr>`
      )
      .join('');

    popup.document.write(`
      <!doctype html>
      <html><head><title>Lecturer Analytics Report</title>
      <style>
        body{font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0}
        .page{max-width:980px;margin:0 auto;padding:24px}
        .hero{background:linear-gradient(135deg,#0f172a,#1d4ed8,#0f766e);color:#fff;border-radius:14px;padding:20px}
        .hero-top{display:flex;justify-content:space-between;align-items:center}
        .logo{height:42px;background:rgba(255,255,255,.12);padding:4px;border-radius:6px}
        .grid{margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px}
        .card h4{margin:0;font-size:12px;color:#64748b;text-transform:uppercase}
        .card p{margin:4px 0 0;font-size:22px;font-weight:700}
        h3{font-size:15px;color:#334155;margin:16px 0 8px}
        table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
        th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:left}
        th{background:#f1f5f9}
      </style>
      </head><body>
      <div class="page">
        <div class="hero">
          <div class="hero-top">
            <div>
              <h1 style="margin:0;font-size:28px">Lecturer Analytics Report</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:.9">Generated: ${new Date(
                report.generatedAt
              ).toLocaleString()}</p>
            </div>
            <img class="logo" src="${logoUrl}" alt="logo"/>
          </div>
        </div>
        <div class="grid">
          <div class="card"><h4>Total Students</h4><p>${report.summary.totalStudents || 0}</p></div>
          <div class="card"><h4>High Risk</h4><p>${report.summary.highRisk || 0}</p></div>
          <div class="card"><h4>Avg Risk</h4><p>${report.summary.averageRiskProbability || 0}%</p></div>
          <div class="card"><h4>High Risk Ratio</h4><p>${report.summary.highRiskRatio || 0}%</p></div>
        </div>
        <h3>Course Summary</h3>
        <table><thead><tr><th>Course</th><th>Students</th><th>Avg Risk</th><th>Avg Completion</th></tr></thead>
          <tbody>${courseRows || '<tr><td colspan="4">No data</td></tr>'}</tbody></table>
        <h3>Top Students By Risk</h3>
        <table><thead><tr><th>Name</th><th>Student ID</th><th>Risk Level</th><th>Risk %</th><th>Completion %</th></tr></thead>
          <tbody>${topStudentsRows || '<tr><td colspan="5">No data</td></tr>'}</tbody></table>
      </div>
      </body></html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading report...</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  if (!report) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No report data available.</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Lecturer Reports</h1>
            <p className="mt-1 text-sm text-blue-100">Class-level predictive analytics and interventions report.</p>
            <p className={`mt-2 text-sm font-semibold ${report.livePrediction?.enabled ? 'text-emerald-200' : 'text-amber-200'}`}>
              {report.livePrediction?.enabled
                ? 'Live prediction is ON.'
                : `Live prediction is OFF (${report.livePrediction?.error || 'ML API not connected'}).`}
            </p>
          </div>
          <Image src="/logo1.png" alt="logo" width={180} height={50} className="h-12 w-auto rounded-md bg-white/20 p-1" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={fetchReport} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
            <RefreshCcw size={16} /> Refresh
          </button>
          <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-200">
            <FileText size={16} /> Export PDF
          </button>
          <button
            onClick={exportCsv}
            disabled={exportingCsv}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-100 px-3 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-200 disabled:opacity-60"
          >
            <FileSpreadsheet size={16} /> {exportingCsv ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Total Students" value={report.summary.totalStudents || 0} />
        <Card label="High Risk" value={report.summary.highRisk || 0} />
        <Card label="Avg Risk" value={`${report.summary.averageRiskProbability || 0}%`} />
        <Card label="High Risk Ratio" value={`${report.summary.highRiskRatio || 0}%`} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Class Guidance</h2>
        <div className="mt-3 space-y-2">
          {(report.classGuidance || []).map((tip, index) => (
            <div key={`${tip}-${index}`} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              {tip}
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Course Summary</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Course</th>
              <th className="px-4 py-3 font-semibold">Students</th>
              <th className="px-4 py-3 font-semibold">Avg Risk</th>
              <th className="px-4 py-3 font-semibold">Avg Completion</th>
            </tr>
          </thead>
          <tbody>
            {report.courses.length === 0 ? (
              <tr><td className="px-4 py-4 text-slate-500" colSpan={4}>No course data available.</td></tr>
            ) : (
              report.courses.map((course) => (
                <tr key={course.courseId} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-800">{course.courseName}</td>
                  <td className="px-4 py-3 text-slate-700">{course.students}</td>
                  <td className="px-4 py-3 text-slate-700">{course.avgRiskProbability}%</td>
                  <td className="px-4 py-3 text-slate-700">{course.avgCompletionRate}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

