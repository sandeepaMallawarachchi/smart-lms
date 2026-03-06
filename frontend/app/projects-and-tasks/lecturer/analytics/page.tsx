'use client';

import Link from 'next/link';

const cards = [
  {
    title: 'Activity Heatmap',
    description: 'Track module activity day-by-day for all students or one student.',
    href: '/projects-and-tasks/lecturer/analytics/heatmap',
  },
  {
    title: 'Workload',
    description: 'View how work is distributed across students and tasks.',
    href: '/projects-and-tasks/lecturer/analytics/workload',
  },
  {
    title: 'Trends',
    description: 'Observe completion and engagement trends over time.',
    href: '/projects-and-tasks/lecturer/analytics/trends',
  },
  {
    title: 'Deadlines',
    description: 'Analyze submissions and progress around deadlines.',
    href: '/projects-and-tasks/lecturer/analytics/deadlines',
  },
];

export default function LecturerAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-600 mt-1">Lecturer analytics tools for the selected module</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-blue hover:shadow-sm transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900">{card.title}</h2>
            <p className="text-sm text-gray-600 mt-2">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
