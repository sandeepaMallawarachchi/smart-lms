'use client';

import Link from 'next/link';

export default function LecturerReportsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">Lecturer Reports</h1>
        <p className="text-sm text-slate-600">
          Class export reports can be generated from student insights and class performance.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-700">
          For now, use these pages to review and validate class analytics before export.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/learning-analytics/lecturer/class-performance" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Open Class Performance
          </Link>
          <Link href="/learning-analytics/lecturer/student-insights" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
            Open Student Insights
          </Link>
        </div>
      </div>
    </div>
  );
}
