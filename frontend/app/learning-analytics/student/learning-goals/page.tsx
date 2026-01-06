'use client';

import React, { useEffect, useState } from 'react';
import {
  Target,
  Plus,
  Filter,
  Calendar,
  Flag,
  Tag,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Edit,
  Trash2,
  ChevronRight,
} from 'lucide-react';

interface Goal {
  _id: string;
  title: string;
  description: string;
  category: 'academic' | 'skill' | 'project' | 'career' | 'personal';
  targetDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  progress: number;
  milestones: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  tags: string[];
  courseId?: { _id: string; courseName: string };
  completedAt?: string;
  createdAt: string;
}

export default function LearningGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterCategory, setFilterCategory] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0,
    avgProgress: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'academic' as Goal['category'],
    targetDate: '',
    priority: 'medium' as Goal['priority'],
    milestones: [] as Array<{ id: string; title: string; completed: boolean }>,
    tags: [] as string[],
  });

  useEffect(() => {
    fetchGoals();
  }, [filterStatus, filterCategory]);

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const queryParams = new URLSearchParams();
      if (filterStatus) queryParams.append('status', filterStatus);
      if (filterCategory !== 'all') queryParams.append('category', filterCategory);

      const response = await fetch(`/api/student/learning-goals?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setGoals(data.data.goals);
        setStats(data.data.stats);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/student/learning-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          category: 'academic',
          targetDate: '',
          priority: 'medium',
          milestones: [],
          tags: [],
        });
        fetchGoals();
      }
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleUpdateProgress = async (goalId: string, newProgress: number) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`/api/student/learning-goals/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ progress: newProgress }),
      });

      if (response.ok) {
        fetchGoals();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`/api/student/learning-goals/${goalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchGoals();
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [
        ...formData.milestones,
        { id: Date.now().toString(), title: '', completed: false },
      ],
    });
  };

  const removeMilestone = (id: string) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((m) => m.id !== id),
    });
  };

  const updateMilestone = (id: string, title: string) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.map((m) =>
        m.id === id ? { ...m, title } : m
      ),
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-green-600" size={20} />;
      case 'overdue':
        return <AlertCircle className="text-red-600" size={20} />;
      case 'active':
        return <Clock className="text-blue-600" size={20} />;
      default:
        return <Target className="text-gray-600" size={20} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'academic':
        return 'bg-blue-100 text-blue-700';
      case 'skill':
        return 'bg-purple-100 text-purple-700';
      case 'project':
        return 'bg-green-100 text-green-700';
      case 'career':
        return 'bg-amber-100 text-amber-700';
      case 'personal':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Target className="text-amber-500" size={40} />
          Learning Goals
        </h1>
        <p className="text-gray-600">Set and track goals</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Goals</p>
              <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <Clock className="text-blue-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
            </div>
            <CheckCircle2 className="text-green-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Overdue</p>
              <p className="text-3xl font-bold text-gray-900">{stats.overdue}</p>
            </div>
            <AlertCircle className="text-red-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-amber-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Progress</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.avgProgress.toFixed(0)}%
              </p>
            </div>
            <Target className="text-amber-600" size={40} />
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="academic">Academic</option>
            <option value="skill">Skill</option>
            <option value="project">Project</option>
            <option value="career">Career</option>
            <option value="personal">Personal</option>
          </select>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus size={20} />
          Create New Goal
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal) => (
          <div
            key={goal._id}
            className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(goal.status)}
                    <h3 className="text-xl font-bold text-gray-900">{goal.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{goal.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                        goal.category
                      )}`}
                    >
                      {goal.category}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
                        goal.priority
                      )}`}
                    >
                      {goal.priority} priority
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-bold text-gray-900">
                    {goal.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      goal.progress === 100
                        ? 'bg-green-600'
                        : goal.status === 'overdue'
                        ? 'bg-red-600'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                </div>

                {/* Progress Control */}
                {goal.status !== 'completed' && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={goal.progress}
                      onChange={(e) =>
                        handleUpdateProgress(goal._id, parseInt(e.target.value))
                      }
                      className="flex-1"
                    />
                  </div>
                )}
              </div>

              {/* Milestones */}
              {goal.milestones.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Milestones</p>
                  <div className="space-y-1">
                    {goal.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <CheckCircle2
                          size={16}
                          className={milestone.completed ? 'text-green-600' : 'text-gray-400'}
                        />
                        <span
                          className={milestone.completed ? 'line-through text-gray-400' : ''}
                        >
                          {milestone.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {goal.tags.length > 0 && (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  {goal.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} />
                  <span>
                    Due: {new Date(goal.targetDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteGoal(goal._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-lg">
          <Target size={64} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No goals found</h3>
          <p className="text-gray-600 mb-4">Start setting your learning goals!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Create Your First Goal
          </button>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Target className="text-amber-500" size={28} />
                  Create New Goal
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateGoal} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Master React Hooks"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe your goal..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value as Goal['category'],
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="academic">Academic</option>
                      <option value="skill">Skill</option>
                      <option value="project">Project</option>
                      <option value="career">Career</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value as Goal['priority'],
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                {/* Target Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.targetDate}
                    onChange={(e) =>
                      setFormData({ ...formData, targetDate: e.target.value })
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Milestones */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Milestones (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                    >
                      + Add Milestone
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.milestones.map((milestone) => (
                      <div key={milestone.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={(e) => updateMilestone(milestone.id, e.target.value)}
                          placeholder="Milestone title"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeMilestone(milestone.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Create Goal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}