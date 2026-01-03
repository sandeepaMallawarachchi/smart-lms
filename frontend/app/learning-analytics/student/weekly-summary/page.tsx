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
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
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
  };
  createdAt: string;
}

export default function WeeklySummaryPage() {
  const router = useRouter();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [weeklyData, setWeeklyData] = useState<PredictionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeeklyData = async () => {
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

        // Calculate date range for last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        // Fetch predictions from the last 7 days
        const predictionsResponse = await fetch(
          `/api/predictions?studentId=${userId}&limit=50`,
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
        
        // Filter predictions from last 7 days
        const filteredPredictions = predictionsResult.data.predictions.filter(
          (pred: PredictionData) => {
            const predDate = new Date(pred.createdAt);
            return predDate >= startDate && predDate <= endDate;
          }
        );

        setWeeklyData(filteredPredictions);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching weekly data:', err);
        setError('An error occurred while fetching data');
        setIsLoading(false);
      }
    };

    fetchWeeklyData();
  }, []);

  // Calculate weekly statistics
  const getWeeklyStats = () => {
    if (weeklyData.length === 0) {
      return {
        avgScore: 0,
        avgCompletion: 0,
        totalEngagement: 0,
        avgRiskProbability: 0,
        scoreChange: 0,
        completionChange: 0,
        engagementChange: 0,
        riskChange: 0,
      };
    }

    const currentWeek = weeklyData.slice(0, Math.ceil(weeklyData.length / 2));
    const previousWeek = weeklyData.slice(Math.ceil(weeklyData.length / 2));

    const avgScore =
      currentWeek.reduce((sum, pred) => sum + pred.inputData.avg_score, 0) /
      currentWeek.length;

    const avgCompletion =
      currentWeek.reduce((sum, pred) => sum + pred.inputData.completion_rate * 100, 0) /
      currentWeek.length;

    const totalEngagement = currentWeek.reduce(
      (sum, pred) => sum + pred.inputData.total_clicks,
      0
    );

    const avgRiskProbability =
      currentWeek.reduce((sum, pred) => sum + pred.prediction.risk_probability * 100, 0) /
      currentWeek.length;

    // Calculate changes
    const prevAvgScore =
      previousWeek.length > 0
        ? previousWeek.reduce((sum, pred) => sum + pred.inputData.avg_score, 0) /
          previousWeek.length
        : avgScore;

    const prevAvgCompletion =
      previousWeek.length > 0
        ? previousWeek.reduce(
            (sum, pred) => sum + pred.inputData.completion_rate * 100,
            0
          ) / previousWeek.length
        : avgCompletion;

    const prevTotalEngagement =
      previousWeek.length > 0
        ? previousWeek.reduce((sum, pred) => sum + pred.inputData.total_clicks, 0)
        : totalEngagement;

    const prevAvgRisk =
      previousWeek.length > 0
        ? previousWeek.reduce(
            (sum, pred) => sum + pred.prediction.risk_probability * 100,
            0
          ) / previousWeek.length
        : avgRiskProbability;

    return {
      avgScore,
      avgCompletion,
      totalEngagement,
      avgRiskProbability,
      scoreChange: avgScore - prevAvgScore,
      completionChange: avgCompletion - prevAvgCompletion,
      engagementChange: totalEngagement - prevTotalEngagement,
      riskChange: avgRiskProbability - prevAvgRisk,
    };
  };

  const stats = getWeeklyStats();

  // Prepare chart data
  const dailyScoreData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Average Score',
        data: weeklyData.slice(0, 7).map((pred) => pred.inputData.avg_score),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const engagementData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Daily Clicks',
        data: weeklyData.slice(0, 7).map((pred) => pred.inputData.avg_clicks_per_day),
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
        borderColor: 'rgb(251, 191, 36)',
        borderWidth: 1,
      },
    ],
  };

  const riskDistributionData = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [
      {
        data: [
          weeklyData.filter((p) => p.prediction.risk_level === 'low').length,
          weeklyData.filter((p) => p.prediction.risk_level === 'medium').length,
          weeklyData.filter((p) => p.prediction.risk_level === 'high').length,
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
          <p className="text-gray-600 text-lg">Loading weekly summary...</p>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Weekly Summary</h1>
            <p className="text-gray-600">Your performance overview for the past 7 days</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Week Ending</p>
            <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={20} />
              {new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Average Score */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Score</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.avgScore.toFixed(1)}%
              </p>
            </div>
            <BarChart3 className="text-blue-600" size={40} />
          </div>
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              stats.scoreChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {stats.scoreChange >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            {Math.abs(stats.scoreChange).toFixed(1)}% from last week
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.avgCompletion.toFixed(1)}%
              </p>
            </div>
            <Target className="text-green-600" size={40} />
          </div>
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              stats.completionChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {stats.completionChange >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            {Math.abs(stats.completionChange).toFixed(1)}% from last week
          </div>
        </div>

        {/* Total Engagement */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-amber-600">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Engagement</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalEngagement.toLocaleString()}
              </p>
            </div>
            <Activity className="text-amber-600" size={40} />
          </div>
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              stats.engagementChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {stats.engagementChange >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            {Math.abs(stats.engagementChange).toLocaleString()} clicks
          </div>
        </div>

        {/* Risk Level */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Risk Probability</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.avgRiskProbability.toFixed(1)}%
              </p>
            </div>
            <AlertCircle className="text-red-600" size={40} />
          </div>
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              stats.riskChange <= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {stats.riskChange <= 0 ? (
              <TrendingDown size={16} />
            ) : (
              <TrendingUp size={16} />
            )}
            {Math.abs(stats.riskChange).toFixed(1)}% from last week
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Daily Score Trend */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={24} />
            Daily Score Trend
          </h3>
          <div className="h-80">
            <Line data={dailyScoreData} options={chartOptions} />
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="text-purple-600" size={24} />
            Risk Distribution
          </h3>
          <div className="h-80 flex items-center justify-center">
            <Doughnut data={riskDistributionData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Engagement Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="text-amber-600" size={24} />
          Daily Engagement Activity
        </h3>
        <div className="h-80">
          <Bar data={engagementData} options={chartOptions} />
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Achievements */}
        <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-6 border-2 border-green-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="text-green-600" size={24} />
            This Week's Achievements
          </h3>
          <ul className="space-y-3">
            {stats.scoreChange > 0 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
                <p className="text-gray-700">
                  Improved average score by {stats.scoreChange.toFixed(1)}%
                </p>
              </li>
            )}
            {stats.completionChange > 0 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
                <p className="text-gray-700">
                  Increased completion rate by {stats.completionChange.toFixed(1)}%
                </p>
              </li>
            )}
            {stats.engagementChange > 0 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
                <p className="text-gray-700">
                  Boosted engagement by {stats.engagementChange.toLocaleString()} clicks
                </p>
              </li>
            )}
            {stats.riskChange < 0 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
                <p className="text-gray-700">
                  Reduced risk probability by {Math.abs(stats.riskChange).toFixed(1)}%
                </p>
              </li>
            )}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="text-amber-600" size={24} />
            Focus Areas
          </h3>
          <ul className="space-y-3">
            {stats.scoreChange <= 0 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm">
                  !
                </div>
                <p className="text-gray-700">
                  Work on improving your average score (currently {stats.avgScore.toFixed(1)}%)
                </p>
              </li>
            )}
            {stats.completionChange <= 0 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm">
                  !
                </div>
                <p className="text-gray-700">
                  Focus on completing more assignments on time
                </p>
              </li>
            )}
            {stats.avgRiskProbability > 50 && (
              <li className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm">
                  !
                </div>
                <p className="text-gray-700">
                  High risk level detected - review recommended action steps
                </p>
              </li>
            )}
            <li className="flex items-start gap-3">
              <div className="shrink-0 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm">
                💡
              </div>
              <p className="text-gray-700">
                Maintain consistent daily engagement for better results
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}