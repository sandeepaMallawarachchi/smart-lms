'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
  AlertCircle,
  ArrowLeft,
  Activity,
  Target,
  Clock,
  BarChart3,
  Download,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StudentData {
  _id: string;
  studentIdNumber: string;
  name: string;
  specialization: string;
  semester: string;
  academicYear: string;
}

interface PredictionData {
  _id: string;
  prediction: {
    risk_level: string;
    risk_probability: number;
    confidence: number;
    at_risk: boolean;
  };
  inputData: {
    avg_score: number;
    completion_rate: number;
    total_clicks: number;
    late_submission_count: number;
    avg_clicks_per_day: number;
    score_improvement: number;
    engagement_regularity: number;
  };
  createdAt: string;
}

export default function MonthlyReportPage() {
  const router = useRouter();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [monthlyData, setMonthlyData] = useState<PredictionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        const token = localStorage.getItem('authToken');

        if (!token) {
          setError('Not authenticated');
          setIsLoading(false);
          return;
        }

        // Verify user
        const verifyResponse = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!verifyResponse.ok) {
          setError('Failed to verify user');
          setIsLoading(false);
          return;
        }

        const verifyData = await verifyResponse.json();
        const userId = verifyData.data?.user?._id;

        if (!userId) {
          setError('User ID not found');
          setIsLoading(false);
          return;
        }

        // Fetch student details
        const studentResponse = await fetch(`/api/student/${userId}`);

        if (!studentResponse.ok) {
          setError('Failed to fetch student data');
          setIsLoading(false);
          return;
        }

        const studentResult = await studentResponse.json();
        setStudentData(studentResult.data.student);

        // Calculate date range for last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        // Fetch predictions from the last 30 days
        const predictionsResponse = await fetch(
          `/api/predictions?studentId=${userId}&limit=100`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!predictionsResponse.ok) {
          setError('Failed to fetch predictions');
          setIsLoading(false);
          return;
        }

        const predictionsResult = await predictionsResponse.json();

        // Filter predictions from last 30 days
        const filteredPredictions = predictionsResult.data.predictions.filter(
          (pred: PredictionData) => {
            const predDate = new Date(pred.createdAt);
            return predDate >= startDate && predDate <= endDate;
          }
        );

        setMonthlyData(filteredPredictions);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching monthly data:', err);
        setError('An error occurred while fetching data');
        setIsLoading(false);
      }
    };

    fetchMonthlyData();
  }, []);

  // Calculate monthly statistics
  const getMonthlyStats = () => {
    if (monthlyData.length === 0) {
      return {
        avgScore: 0,
        avgCompletion: 0,
        totalEngagement: 0,
        avgRiskProbability: 0,
        totalLateSubmissions: 0,
        avgScoreImprovement: 0,
        avgEngagementRegularity: 0,
        scoreChange: 0,
        completionChange: 0,
        engagementChange: 0,
        riskChange: 0,
      };
    }

    const halfPoint = Math.ceil(monthlyData.length / 2);
    const recentHalf = monthlyData.slice(0, halfPoint);
    const olderHalf = monthlyData.slice(halfPoint);

    const avgScore =
      recentHalf.reduce((sum, pred) => sum + pred.inputData.avg_score, 0) /
      recentHalf.length;

    const avgCompletion =
      recentHalf.reduce((sum, pred) => sum + pred.inputData.completion_rate * 100, 0) /
      recentHalf.length;

    const totalEngagement = monthlyData.reduce(
      (sum, pred) => sum + pred.inputData.total_clicks,
      0
    );

    const avgRiskProbability =
      recentHalf.reduce((sum, pred) => sum + pred.prediction.risk_probability * 100, 0) /
      recentHalf.length;

    const totalLateSubmissions = monthlyData.reduce(
      (sum, pred) => sum + pred.inputData.late_submission_count,
      0
    );

    const avgScoreImprovement =
      monthlyData.reduce((sum, pred) => sum + pred.inputData.score_improvement, 0) /
      monthlyData.length;

    const avgEngagementRegularity =
      monthlyData.reduce((sum, pred) => sum + pred.inputData.engagement_regularity, 0) /
      monthlyData.length;

    // Calculate changes
    const prevAvgScore =
      olderHalf.length > 0
        ? olderHalf.reduce((sum, pred) => sum + pred.inputData.avg_score, 0) /
          olderHalf.length
        : avgScore;

    const prevAvgCompletion =
      olderHalf.length > 0
        ? olderHalf.reduce((sum, pred) => sum + pred.inputData.completion_rate * 100, 0) /
          olderHalf.length
        : avgCompletion;

    const prevTotalEngagement =
      olderHalf.length > 0
        ? olderHalf.reduce((sum, pred) => sum + pred.inputData.total_clicks, 0)
        : totalEngagement / 2;

    const prevAvgRisk =
      olderHalf.length > 0
        ? olderHalf.reduce((sum, pred) => sum + pred.prediction.risk_probability * 100, 0) /
          olderHalf.length
        : avgRiskProbability;

    return {
      avgScore,
      avgCompletion,
      totalEngagement,
      avgRiskProbability,
      totalLateSubmissions,
      avgScoreImprovement,
      avgEngagementRegularity,
      scoreChange: avgScore - prevAvgScore,
      completionChange: avgCompletion - prevAvgCompletion,
      engagementChange: totalEngagement - prevTotalEngagement,
      riskChange: avgRiskProbability - prevAvgRisk,
    };
  };

  const stats = getMonthlyStats();

  // Group data by week for monthly trend
  const getWeeklyAverages = () => {
    const weeks: { [key: string]: PredictionData[] } = {
      'Week 1': [],
      'Week 2': [],
      'Week 3': [],
      'Week 4': [],
    };

    monthlyData.forEach((pred) => {
      const date = new Date(pred.createdAt);
      const dayOfMonth = date.getDate();

      if (dayOfMonth <= 7) weeks['Week 1'].push(pred);
      else if (dayOfMonth <= 14) weeks['Week 2'].push(pred);
      else if (dayOfMonth <= 21) weeks['Week 3'].push(pred);
      else weeks['Week 4'].push(pred);
    });

    return weeks;
  };

  const weeklyData = getWeeklyAverages();

  // Monthly trend chart
  const monthlyTrendData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Average Score',
        data: Object.values(weeklyData).map((week) =>
          week.length > 0
            ? week.reduce((sum, p) => sum + p.inputData.avg_score, 0) / week.length
            : 0
        ),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Completion Rate',
        data: Object.values(weeklyData).map((week) =>
          week.length > 0
            ? week.reduce((sum, p) => sum + p.inputData.completion_rate * 100, 0) /
              week.length
            : 0
        ),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Engagement comparison
  const engagementComparisonData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Total Clicks',
        data: Object.values(weeklyData).map((week) =>
          week.reduce((sum, p) => sum + p.inputData.total_clicks, 0)
        ),
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
        borderColor: 'rgb(251, 191, 36)',
        borderWidth: 1,
      },
    ],
  };

  // Risk level distribution
  const riskDistributionData = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [
      {
        data: [
          monthlyData.filter((p) => p.prediction.risk_level === 'low').length,
          monthlyData.filter((p) => p.prediction.risk_level === 'medium').length,
          monthlyData.filter((p) => p.prediction.risk_level === 'high').length,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: ['rgb(34, 197, 94)', 'rgb(251, 191, 36)', 'rgb(239, 68, 68)'],
        borderWidth: 2,
      },
    ],
  };

  // Performance radar chart
  const performanceRadarData = {
    labels: [
      'Avg Score',
      'Completion',
      'Engagement',
      'Regularity',
      'Improvement',
      'Risk Control',
    ],
    datasets: [
      {
        label: 'Your Performance',
        data: [
          stats.avgScore,
          stats.avgCompletion,
          Math.min((stats.totalEngagement / 10000) * 100, 100),
          stats.avgEngagementRegularity * 100,
          Math.min(stats.avgScoreImprovement * 5, 100),
          100 - stats.avgRiskProbability,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading monthly report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Monthly Report</h1>
            <p className="text-gray-600">Comprehensive performance analysis for the past 30 days</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download size={20} />
              Export PDF
            </button>
            <div className="text-right">
              <p className="text-sm text-gray-500">Month Ending</p>
              <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={20} />
                {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Average Score */}
        <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-blue-100 mb-1">Monthly Avg Score</p>
              <p className="text-4xl font-bold">{stats.avgScore.toFixed(1)}%</p>
            </div>
            <BarChart3 size={40} className="text-blue-200" />
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            {stats.scoreChange >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            {Math.abs(stats.scoreChange).toFixed(1)}% vs previous period
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-linear-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-green-100 mb-1">Completion Rate</p>
              <p className="text-4xl font-bold">{stats.avgCompletion.toFixed(1)}%</p>
            </div>
            <Target size={40} className="text-green-200" />
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            {stats.completionChange >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            {Math.abs(stats.completionChange).toFixed(1)}% vs previous period
          </div>
        </div>

        {/* Total Engagement */}
        <div className="bg-linear-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-amber-100 mb-1">Total Engagement</p>
              <p className="text-4xl font-bold">
                {(stats.totalEngagement / 1000).toFixed(1)}K
              </p>
            </div>
            <Activity size={40} className="text-amber-200" />
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            {stats.engagementChange >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            {(Math.abs(stats.engagementChange) / 1000).toFixed(1)}K clicks
          </div>
        </div>

        {/* Late Submissions */}
        <div className="bg-linear-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-red-100 mb-1">Late Submissions</p>
              <p className="text-4xl font-bold">{stats.totalLateSubmissions}</p>
            </div>
            <Clock size={40} className="text-red-200" />
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            <AlertCircle size={16} />
            {stats.totalLateSubmissions === 0 ? 'Perfect!' : 'Needs improvement'}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Monthly Performance Trend */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={24} />
            Monthly Performance Trend
          </h3>
          <div className="h-80">
            <Line data={monthlyTrendData} options={chartOptions} />
          </div>
        </div>

        {/* Performance Radar */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="text-purple-600" size={24} />
            Performance Overview
          </h3>
          <div className="h-80 flex items-center justify-center">
            <Radar data={performanceRadarData} options={radarOptions} />
          </div>
        </div>

        {/* Weekly Engagement */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="text-amber-600" size={24} />
            Weekly Engagement Comparison
          </h3>
          <div className="h-80">
            <Bar data={engagementComparisonData} options={chartOptions} />
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="text-green-600" size={24} />
            Monthly Risk Distribution
          </h3>
          <div className="h-80 flex items-center justify-center">
            <Doughnut data={riskDistributionData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Strengths */}
        <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-6 border-2 border-green-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="text-green-600" size={24} />
            Key Strengths
          </h3>
          <ul className="space-y-3">
            {stats.avgScore >= 75 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
                <p className="text-gray-700">Strong academic performance ({stats.avgScore.toFixed(1)}%)</p>
              </li>
            )}
            {stats.avgCompletion >= 80 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
                <p className="text-gray-700">Excellent completion rate</p>
              </li>
            )}
            {stats.totalLateSubmissions <= 2 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
                <p className="text-gray-700">Good time management</p>
              </li>
            )}
            {stats.avgEngagementRegularity >= 0.6 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
                <p className="text-gray-700">Consistent engagement pattern</p>
              </li>
            )}
          </ul>
        </div>

        {/* Areas for Growth */}
        <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="text-amber-600" size={24} />
            Growth Opportunities
          </h3>
          <ul className="space-y-3">
            {stats.avgScore < 75 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm">
                  !
                </div>
                <p className="text-gray-700">Focus on improving test scores</p>
              </li>
            )}
            {stats.avgCompletion < 80 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm">
                  !
                </div>
                <p className="text-gray-700">Work on assignment completion</p>
              </li>
            )}
            {stats.totalLateSubmissions > 2 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm">
                  !
                </div>
                <p className="text-gray-700">Reduce late submissions</p>
              </li>
            )}
            {stats.avgRiskProbability > 50 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm">
                  !
                </div>
                <p className="text-gray-700">Address high risk indicators</p>
              </li>
            )}
          </ul>
        </div>

        {/* Next Steps */}
        <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border-2 border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="text-blue-600" size={24} />
            Recommended Actions
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                1
              </div>
              <p className="text-gray-700">Review your full analytics report for detailed insights</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                2
              </div>
              <p className="text-gray-700">Set specific goals for the next month</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                3
              </div>
              <p className="text-gray-700">Maintain consistent study schedule</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                4
              </div>
              <p className="text-gray-700">Seek help early if struggling</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}