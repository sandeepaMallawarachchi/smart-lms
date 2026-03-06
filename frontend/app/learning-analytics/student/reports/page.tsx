'use client';

import { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, RefreshCcw } from 'lucide-react';
import Image from 'next/image';

interface StudentProgressReport {
  generatedAt: string;
  student: {
    studentIdNumber: string;
    name: string;
    email: string;
    specialization: string;
    academicYear: string;
    semester: string;
  };
  summary: {
    totalPredictions: number;
    latestRiskLevel: string;
    latestRiskProbability: number;
    latestCompletionRate: number;
    latestScore: number;
    latestEngagement: number;
  };
  averages: {
    riskProbability: number;
    completionRate: number;
    score: number;
    engagement: number;
    lateSubmissions: number;
  };
  recentPredictions: Array<{
    createdAt: string;
    riskLevel: string;
    riskProbability: number;
    completionRate: number;
    avgScore: number;
    engagement: number;
    confidence: number;
  }>;
  recommendations: {
    explanation: string;
    motivation: string;
    action_steps: string[];
  } | null;
}

export default function StudentReportsPage() {
  const [report, setReport] = useState<StudentProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }
      const res = await fetch('/api/learning-analytics/student/reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to load progress report');
      }
      const json = await res.json();
      setReport(json.data || null);
    } catch (err) {
      console.error('Student report fetch error:', err);
      setError('Failed to load progress report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const exportCsv = async () => {
    try {
      setExportingCsv(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }
      const res = await fetch('/api/learning-analytics/student/reports/export/csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('CSV export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student-progress-report.csv';
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
    const rows = report.recentPredictions
      .slice(0, 12)
      .map(
        (item) => `<tr>
          <td>${new Date(item.createdAt).toLocaleString()}</td>
          <td>${String(item.riskLevel).toUpperCase()}</td>
          <td>${item.riskProbability}%</td>
          <td>${item.completionRate}%</td>
          <td>${item.avgScore}%</td>
          <td>${item.engagement}</td>
        </tr>`
      )
      .join('');

    popup.document.write(`
      <!doctype html><html><head><title>Student Progress Report</title>
      <style>
      body{font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0}
      .page{max-width:980px;margin:0 auto;padding:24px}
      .hero{background:linear-gradient(135deg,#1d4ed8,#0f766e);color:#fff;border-radius:14px;padding:20px}
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
      </style></head><body><div class="page">
      <div class="hero"><div class="hero-top"><div>
      <h1 style="margin:0;font-size:28px">Student Progress Report</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:.9">${report.student.name} (${report.student.studentIdNumber})</p>
      </div><img class="logo" src="${logoUrl}" alt="logo"/></div></div>
      <div class="grid">
        <div class="card"><h4>Latest Risk</h4><p>${String(report.summary.latestRiskLevel).toUpperCase()}</p></div>
        <div class="card"><h4>Risk Probability</h4><p>${report.summary.latestRiskProbability}%</p></div>
        <div class="card"><h4>Completion</h4><p>${report.summary.latestCompletionRate}%</p></div>
        <div class="card"><h4>Avg Score</h4><p>${report.averages.score}%</p></div>
      </div>
      <h3>Recent Prediction Timeline</h3>
      <table><thead><tr><th>Date</th><th>Risk</th><th>Risk %</th><th>Completion %</th><th>Score %</th><th>Engagement</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No prediction history found.</td></tr>'}</tbody></table>
      </div></body></html>
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
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-cyan-700 to-emerald-700 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Progress Report</h1>
            <p className="mt-1 text-sm text-blue-100">
              {report.student.name} • {report.student.studentIdNumber}
            </p>
            <p className="mt-1 text-sm text-blue-100">
              Generated: {new Date(report.generatedAt).toLocaleString()}
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
        <Metric label="Latest Risk" value={String(report.summary.latestRiskLevel).toUpperCase()} />
        <Metric label="Risk Probability" value={`${report.summary.latestRiskProbability}%`} />
        <Metric label="Completion Rate" value={`${report.summary.latestCompletionRate}%`} />
        <Metric label="Average Score" value={`${report.averages.score}%`} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">AI Recommendations</h2>
        {report.recommendations ? (
          <div className="mt-3 space-y-3 text-sm text-slate-700">
            <p>{report.recommendations.explanation}</p>
            <ul className="space-y-1">
              {(report.recommendations.action_steps || []).map((step, index) => (
                <li key={`${step}-${index}`} className="ml-5 list-disc">{step}</li>
              ))}
            </ul>
            <p className="font-semibold text-slate-900">{report.recommendations.motivation}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No recommendation found yet.</p>
        )}
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Predictions</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Risk</th>
              <th className="px-4 py-3 font-semibold">Risk %</th>
              <th className="px-4 py-3 font-semibold">Completion %</th>
              <th className="px-4 py-3 font-semibold">Score %</th>
              <th className="px-4 py-3 font-semibold">Engagement</th>
            </tr>
          </thead>
          <tbody>
            {report.recentPredictions.length === 0 ? (
              <tr><td className="px-4 py-4 text-slate-500" colSpan={6}>No predictions found.</td></tr>
            ) : (
              report.recentPredictions.map((item, index) => (
                <tr key={`${item.createdAt}-${index}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{String(item.riskLevel).toUpperCase()}</td>
                  <td className="px-4 py-3 text-slate-700">{item.riskProbability}%</td>
                  <td className="px-4 py-3 text-slate-700">{item.completionRate}%</td>
                  <td className="px-4 py-3 text-slate-700">{item.avgScore}%</td>
                  <td className="px-4 py-3 text-slate-700">{item.engagement}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

