'use client';

import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Target, 
  Lightbulb,
  Activity,
  Calendar,
  Award,
  BookOpen,
  Clock,
  ArrowLeft,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StudentData {
  studentIdNumber: string;
  name: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  specialization: string;
  semester: string;
  academicYear: string;
}

interface PredictionResponse {
  success: boolean;
  student_id: string;
  prediction: {
    at_risk: boolean;
    confidence: number;
    risk_level: string;
    risk_probability: number;
    recommendations: {
      explanation: string;
      motivation: string;
      action_steps: string[];
      model: string;
      source: string;
      generated_at: string;
    };
    risk_factors: string[];
  };
  timestamp: string;
}

export default function FullReportPage() {
  const router = useRouter();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper: Convert gender to API format
  const convertGender = (gender: string): string => {
    const genderMap: { [key: string]: string } = {
      'male': 'M',
      'female': 'F',
      'other': 'O'
    };
    return genderMap[gender.toLowerCase()] || 'M';
  };

  // Helper: Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Helper: Get age band
  const getAgeBand = (age: number): string => {
    if (age <= 35) return '0-35';
    if (age <= 55) return '35-55';
    return '55<=';
  };

  useEffect(() => {
    const fetchDataAndPredict = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setError('Not authenticated');
          setIsLoading(false);
          return;
        }

        // Verify user to get student ID
        const verifyResponse = await fetch('/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${token}` },
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
        const student = studentResult.data.student;
        setStudentData(student);

        // Calculate age and age band
        const age = calculateAge(student.dateOfBirth);
        const ageBand = getAgeBand(age);
        const gender = convertGender(student.gender);

        // Prepare prediction payload (hardcoded for now)
        const predictionPayload = {
          student_id: student.studentIdNumber,
          total_clicks: 5000,
          avg_clicks_per_day: 50,
          clicks_std: 25,
          max_clicks_single_day: 150,
          days_active: 100,
          study_span_days: 120,
          engagement_regularity: 0.5,
          pre_course_clicks: 200,
          avg_score: 75,
          score_std: 10,
          min_score: 60,
          max_score: 90,
          completion_rate: 0.9,
          first_score: 70,
          score_improvement: 20,
          avg_days_early: 2,
          timing_consistency: 3,
          worst_delay: -1,
          late_submission_count: 1,
          num_of_prev_attempts: 0,
          studied_credits: 60,
          early_registration: 1,
          withdrew: 0,
          gender: gender,
          age_band: ageBand,
          highest_education: "A Level or Equivalent",
          disability: "N"
        };

        // Call prediction API
        const predictionResponse = await fetch('http://127.0.0.1:5000/api/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(predictionPayload),
        });

        if (!predictionResponse.ok) {
          setError('Failed to get prediction');
          setIsLoading(false);
          return;
        }

        const predictionData = await predictionResponse.json();
        setPrediction(predictionData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('An error occurred while generating report');
        setIsLoading(false);
      }
    };

    fetchDataAndPredict();
  }, []);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'text-red-600'
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          icon: 'text-amber-600'
        };
      case 'low':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          icon: 'text-green-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: 'text-gray-600'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Generating your personalized report...</p>
          <p className="text-gray-500 text-sm mt-2">Analyzing learning patterns with AI</p>
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

  const riskColors = getRiskColor(prediction?.prediction.risk_level || 'low');

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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Academic Performance Report
            </h1>
            <p className="text-gray-600">
              AI-Powered Learning Analytics & Personalized Recommendations
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Generated on</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{studentData?.name}</h2>
            <div className="flex items-center gap-4 text-blue-100">
              <span className="flex items-center gap-1">
                <BookOpen size={16} />
                {studentData?.studentIdNumber}
              </span>
              <span>•</span>
              <span>{studentData?.specialization}</span>
              <span>•</span>
              <span>Semester {studentData?.semester}</span>
              <span>•</span>
              <span>Year {studentData?.academicYear}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Age Band</p>
            <p className="text-2xl font-bold">
              {getAgeBand(calculateAge(studentData?.dateOfBirth || ''))}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Assessment Card */}
      <div className={`${riskColors.bg} border-2 ${riskColors.border} rounded-lg shadow-lg p-8 mb-8`}>
        <div className="flex items-start gap-6">
          <div className={`p-4 bg-white rounded-full ${riskColors.icon}`}>
            {prediction?.prediction.at_risk ? (
              <AlertTriangle size={48} />
            ) : (
              <CheckCircle size={48} />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Risk Level: <span className={riskColors.text}>
                {prediction?.prediction.risk_level.toUpperCase()}
              </span>
            </h2>
            <div className="grid grid-cols-3 gap-6 mt-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">At Risk Status</p>
                <p className="text-2xl font-bold text-gray-900">
                  {prediction?.prediction.at_risk ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Risk Probability</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((prediction?.prediction.risk_probability || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Confidence Level</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((prediction?.prediction.confidence || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Explanation & Motivation */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Explanation */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="text-blue-600" size={24} />
              <h3 className="text-2xl font-bold text-gray-900">AI Analysis</h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              {prediction?.prediction.recommendations.explanation}
            </p>
          </div>

          {/* Motivation */}
          <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-lg shadow-lg p-6 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <Award className="text-green-600" size={24} />
              <h3 className="text-2xl font-bold text-gray-900">Motivation</h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              {prediction?.prediction.recommendations.motivation}
            </p>
          </div>

          {/* Action Steps */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Target className="text-purple-600" size={24} />
              <h3 className="text-2xl font-bold text-gray-900">Recommended Action Steps</h3>
            </div>
            <div className="space-y-4">
              {prediction?.prediction.recommendations.action_steps.map((step, index) => (
                <div key={index} className="flex gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Stats & Insights */}
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Engagement</span>
                  <span className="text-sm font-semibold text-gray-900">5,000 clicks</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="text-sm font-semibold text-gray-900">90%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Average Score</span>
                  <span className="text-sm font-semibold text-gray-900">75%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Key Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Days Active</span>
                <span className="font-bold text-gray-900">100 days</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Score Improvement</span>
                <span className="font-bold text-green-600">+20%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Late Submissions</span>
                <span className="font-bold text-red-600">1</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Credits Studied</span>
                <span className="font-bold text-gray-900">60</span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="text-amber-600" size={24} />
              <h3 className="text-xl font-bold text-gray-900">Quick Tip</h3>
            </div>
            <p className="text-sm text-gray-700">
              Regular engagement with course materials correlates with better performance. Try to maintain consistent study habits!
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>
              Report generated at {new Date(prediction?.timestamp || '').toLocaleString()}
            </span>
          </div>
          <div/>
        </div>
      </div>
    </div>
  );
}