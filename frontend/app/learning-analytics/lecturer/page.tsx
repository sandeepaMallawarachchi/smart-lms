'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LecturerLearningAnalyticsRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/learning-analytics/lecturer/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center text-slate-600">
      Loading lecturer dashboard...
    </div>
  );
}
