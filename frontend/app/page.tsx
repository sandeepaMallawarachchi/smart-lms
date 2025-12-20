'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  GitBranch,
  Brain,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Navbar } from '@/components/it22586766/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/it22586766/ui/Card';
import { Button } from '@/components/it22586766/ui/Button';
import { LoadingSpinner } from '@/components/it22586766/ui/LoadingSpinner';
import { useAuthStore } from '@/store/it22586766/useAuthStore';
import { submissionService } from '@/lib/it22586766/api/services/submission.service';
import { feedbackService } from '@/lib/it22586766/api/services/feedback.service';
import { integrityService } from '@/lib/it22586766/api/services/integrity.service';
import { Submission, Feedback, PlagiarismCheck } from '@/types/it22586766';
import { formatRelativeTime } from '@/lib/it22586766/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    draftSubmissions: 0,
    gradedSubmissions: 0,
    flaggedChecks: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    // if (!user) {
    //   router.push('/login');
    //   return;
    // }

    loadDashboardData();
  }, [user, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load submissions
      const submissionsResponse = await submissionService.getAll({
        studentId: user?.id,
      });
      const submissions = submissionsResponse.data;

      // Calculate stats
      setStats({
        totalSubmissions: submissions.length,
        draftSubmissions: submissions.filter((s) => s.status === 'DRAFT').length,
        gradedSubmissions: submissions.filter((s) => s.status === 'GRADED').length,
        flaggedChecks: 0, // Will be updated below
      });

      // Get recent submissions
      setRecentSubmissions(submissions.slice(0, 5));

      // Load recent feedback
      if (user?.id) {
        const feedbackResponse = await feedbackService.getByStudentId(user.id);
        setRecentFeedback(feedbackResponse.data.slice(0, 3));
      }

      // Load flagged checks count
      const flaggedResponse = await integrityService.getFlagged();
      setStats((prev) => ({
        ...prev,
        flaggedChecks: flaggedResponse.data.length,
      }));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <LoadingSpinner size="lg" text="Loading dashboard..." />
          </div>
        </div>
    );
  }

  const statCards = [
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Drafts',
      value: stats.draftSubmissions,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Graded',
      value: stats.gradedSubmissions,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Flagged Checks',
      value: stats.flaggedChecks,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="mt-2 text-gray-600">
              Here's an overview of your academic progress
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                  <Card key={stat.title}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            {stat.title}
                          </p>
                          <p className="mt-2 text-3xl font-bold text-gray-900">
                            {stat.value}
                          </p>
                        </div>
                        <div className={`p-3 rounded-full ${stat.bgColor}`}>
                          <Icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Submissions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Submissions</CardTitle>
                  <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push('/submissions')}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentSubmissions.length > 0 ? (
                    <div className="space-y-4">
                      {recentSubmissions.map((submission) => (
                          <div
                              key={submission.id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => router.push(`/submissions/${submission.id}`)}
                          >
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {submission.title}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {formatRelativeTime(submission.createdAt)}
                              </p>
                            </div>
                            <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                    submission.status === 'GRADED'
                                        ? 'bg-green-100 text-green-800'
                                        : submission.status === 'SUBMITTED'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                        {submission.status}
                      </span>
                          </div>
                      ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No submissions yet</p>
                      <Button
                          size="sm"
                          className="mt-4"
                          onClick={() => router.push('/submissions/create')}
                      >
                        Create Submission
                      </Button>
                    </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Feedback */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Feedback</CardTitle>
                  <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push('/feedback')}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentFeedback.length > 0 ? (
                    <div className="space-y-4">
                      {recentFeedback.map((feedback) => (
                          <div
                              key={feedback.id}
                              className="p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          Submission #{feedback.submissionId}
                        </span>
                              {feedback.overallScore !== undefined && (
                                  <span className="text-sm font-bold text-primary-600">
                            {feedback.overallScore.toFixed(1)}/{feedback.maxScore}
                          </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {feedback.overallFeedback}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatRelativeTime(feedback.createdAt)}
                            </p>
                          </div>
                      ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No feedback available yet</p>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                    className="w-full"
                    onClick={() => router.push('/submissions/create')}
                    icon={<FileText className="h-5 w-5" />}
                >
                  New Submission
                </Button>
                <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => router.push('/versions')}
                    icon={<GitBranch className="h-5 w-5" />}
                >
                  View Versions
                </Button>
                <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => router.push('/feedback')}
                    icon={<Brain className="h-5 w-5" />}
                >
                  Get Feedback
                </Button>
                <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => router.push('/integrity')}
                    icon={<Shield className="h-5 w-5" />}
                >
                  Check Integrity
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
  );
}