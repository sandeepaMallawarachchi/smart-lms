'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Brain, ChevronDown, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

interface PredictiveResponse {
  summary: {
    totalStudents: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    unknownRisk: number;
    averageRiskProbability: number;
    highRiskRatio: number;
  };
  riskBands: {
    high: number;
    medium: number;
    low: number;
  };
  livePrediction: {
    requested: boolean;
    enabled: boolean;
    error: string | null;
  };
  classGuidance: string[];
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
    completionRate: number;
    engagement: number;
    recommendation: string;
  }>;
}

export default function LecturerPredictivePage() {
  const [data, setData] = useState<PredictiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRecommendationId, setExpandedRecommendationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPredictive = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const res = await fetch('/api/learning-analytics/lecturer/predictive', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('Failed to load predictive analytics');
        }
        const json = await res.json();
        setData(json.data || null);
      } catch (err) {
        console.error('Predictive fetch error:', err);
        setError('Failed to load predictive analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictive();
  }, []);

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading predictive analytics...</div>;
  }
  if (error || !data) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error || 'No data'}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-blue-900 to-cyan-800 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Brain size={26} />
          <h1 className="text-3xl font-bold">Predictive Analytics</h1>
        </div>
        <p className="mt-2 text-sm text-blue-100">
          ML risk scoring + NLP personalized recommendations for intervention planning.
        </p>
        <p className={`mt-3 text-sm font-semibold ${data.livePrediction.enabled ? 'text-emerald-200' : 'text-amber-200'}`}>
          {data.livePrediction.enabled
            ? 'Live ML prediction is ON.'
            : `Live ML prediction is OFF (${data.livePrediction.error || 'service unavailable'}).`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Total Students" value={data.summary.totalStudents} />
        <Metric label="High Risk" value={data.summary.highRisk} tone="red" />
        <Metric label="Avg Risk" value={`${data.summary.averageRiskProbability}%`} tone="amber" />
        <Metric label="High Risk Ratio" value={`${data.summary.highRiskRatio}%`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Class Guidance</h2>
          <div className="mt-3 space-y-2">
            {data.classGuidance.map((tip, idx) => (
              <div key={`${tip}-${idx}`} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                {tip}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Top Risk Students</h2>
          <div className="mt-3 space-y-2">
            {data.topStudentsByRisk.slice(0, 6).map((student) => (
              <div key={student.studentId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{student.name}</p>
                  <p className="text-xs text-slate-500">{student.studentIdNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-700">{student.riskProbability}%</p>
                  <p className="text-xs text-slate-500">{student.riskLevel.toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-700" />
          <h2 className="text-lg font-semibold text-slate-900">Personalized Recommendations</h2>
        </div>
        <div className="space-y-4">
          {data.personalizedRecommendations.length === 0 ? (
            <p className="text-sm text-slate-500">No recommendations available.</p>
          ) : (
            data.personalizedRecommendations.map((item) => (
              <article key={item.studentId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div
                  onClick={() =>
                    setExpandedRecommendationId((prev) =>
                      prev === item.studentId ? null : item.studentId
                    )
                  }
                  className="mb-2 flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-100"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <span className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">{item.studentIdNumber}</span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                      <AlertTriangle size={12} />
                      {item.riskLevel.toUpperCase()} {item.riskProbability}%
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-500 transition-transform ${
                      expandedRecommendationId === item.studentId ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                {expandedRecommendationId === item.studentId && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    {renderRecommendation(item.recommendation)}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function renderRecommendation(text: string): ReactNode {
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    if (/^[-*]\s+/.test(lines[i])) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(
          <li key={`b-${i}`} className="ml-5 list-disc">
            {renderInline(lines[i].replace(/^[-*]\s+/, ''))}
          </li>
        );
        i += 1;
      }
      blocks.push(
        <ul key={`blk-${key++}`} className="space-y-1">
          {items}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(lines[i])) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(
          <li key={`n-${i}`} className="ml-5 list-decimal">
            {renderInline(lines[i].replace(/^\d+\.\s+/, ''))}
          </li>
        );
        i += 1;
      }
      blocks.push(
        <ol key={`blk-${key++}`} className="space-y-1">
          {items}
        </ol>
      );
      continue;
    }

    blocks.push(
      <p key={`blk-${key++}`} className="mb-1">
        {renderInline(lines[i])}
      </p>
    );
    i += 1;
  }

  return <div className="space-y-2">{blocks}</div>;
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, idx) => {
        const isDouble = /^\*\*[^*]+\*\*$/.test(part);
        const isSingle = /^\*[^*]+\*$/.test(part);
        if (isDouble || isSingle) {
          const value = part.replace(/^\*+|\*+$/g, '');
          return <strong key={`i-${idx}`}>{value}</strong>;
        }
        return <span key={`i-${idx}`}>{part}</span>;
      })}
    </>
  );
}

function Metric({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  tone?: 'slate' | 'red' | 'amber';
}) {
  const cls =
    tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-white text-slate-800';
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
