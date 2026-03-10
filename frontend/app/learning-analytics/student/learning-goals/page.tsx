'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Trash2,
  Sparkles,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  BookOpen,
  Youtube,
  Linkedin,
  Search,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface Goal {
  _id: string;
  title: string;
  description: string;
  category: 'academic' | 'skill' | 'project' | 'career' | 'personal';
  targetDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'inprogress' | 'done';
  milestones: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  tags: string[];
  courseId?: { _id: string; courseName: string };
  createdAt: string;
}

interface GoalSuggestion {
  title: string;
  description: string;
  category: Goal['category'];
  targetDate: string;
  priority: Goal['priority'];
  milestones: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  tags: string[];
}

interface GoalResource {
  title: string;
  provider: 'youtube' | 'google' | 'linkedin';
  resourceType: 'video' | 'article' | 'course' | 'documentation' | 'practice';
  query: string;
  url: string;
  reason: string;
  tags: string[];
}

function LearningGoalsPageContent() {
  const searchParams = useSearchParams();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [expandedGoalResources, setExpandedGoalResources] = useState<Record<string, boolean>>({});
  const [goalResources, setGoalResources] = useState<Record<string, GoalResource[]>>({});
  const [goalResourceLoading, setGoalResourceLoading] = useState<Record<string, boolean>>({});
  const [goalResourceError, setGoalResourceError] = useState<Record<string, string | null>>({});
  const [stats, setStats] = useState({
    total: 0,
    todo: 0,
    inprogress: 0,
    done: 0,
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

  const fetchGoals = useCallback(async () => {
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
  }, [filterCategory, filterStatus]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && ['all', 'todo', 'inprogress', 'done'].includes(statusParam)) {
      setFilterStatus(statusParam);
    }
    if (!statusParam) {
      setFilterStatus('all');
    }

    const actionParam = searchParams.get('action');
    setShowCreateModal(actionParam === 'create');
  }, [searchParams]);

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
        setSuggestions([]);
        setSuggestionError(null);
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

  const handleSuggestGoals = async () => {
    try {
      setIsSuggesting(true);
      setSuggestionError(null);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setSuggestionError('Not authenticated');
        return;
      }

      const response = await fetch('/api/student/learning-goals/suggestions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        setSuggestionError(`Failed to generate AI suggestions: ${errorText}`);
        return;
      }

      const data = await response.json();
      setSuggestions(Array.isArray(data.data?.goals) ? data.data.goals : []);
    } catch (error) {
      console.error('Error generating AI goal suggestions:', error);
      setSuggestionError('Failed to generate AI suggestions');
    } finally {
      setIsSuggesting(false);
    }
  };

  const applySuggestionToForm = (suggestion: GoalSuggestion) => {
    setFormData({
      title: suggestion.title || '',
      description: suggestion.description || '',
      category: suggestion.category || 'academic',
      targetDate: suggestion.targetDate || '',
      priority: suggestion.priority || 'medium',
      milestones: Array.isArray(suggestion.milestones) ? suggestion.milestones : [],
      tags: Array.isArray(suggestion.tags) ? suggestion.tags : [],
    });
    setShowCreateModal(true);
  };

  const getProviderLabel = (provider: GoalResource['provider']) => {
    switch (provider) {
      case 'youtube':
        return 'YouTube';
      case 'linkedin':
        return 'LinkedIn';
      default:
        return 'Google';
    }
  };

  const getProviderIcon = (provider: GoalResource['provider']) => {
    if (provider === 'youtube') {
      return <Youtube size={14} />;
    }
    if (provider === 'linkedin') {
      return <Linkedin size={14} />;
    }
    return <Search size={14} />;
  };

  const getProviderBadge = (provider: GoalResource['provider']) => {
    switch (provider) {
      case 'youtube':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'linkedin':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getResourceTypeBadge = (resourceType: GoalResource['resourceType']) => {
    switch (resourceType) {
      case 'video':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'course':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'documentation':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'practice':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const fetchGoalResources = async (goalId: string) => {
    try {
      setGoalResourceLoading((prev) => ({ ...prev, [goalId]: true }));
      setGoalResourceError((prev) => ({ ...prev, [goalId]: null }));

      const token = localStorage.getItem('authToken');
      if (!token) {
        setGoalResourceError((prev) => ({ ...prev, [goalId]: 'Not authenticated' }));
        return;
      }

      const response = await fetch(`/api/student/learning-goals/${goalId}/resources`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        setGoalResourceError((prev) => ({ ...prev, [goalId]: `Failed to load resources: ${errorText}` }));
        return;
      }

      const data = await response.json();
      setGoalResources((prev) => ({
        ...prev,
        [goalId]: Array.isArray(data.data?.resources) ? data.data.resources : [],
      }));
    } catch (error) {
      console.error('Error fetching goal resources:', error);
      setGoalResourceError((prev) => ({ ...prev, [goalId]: 'Failed to load resources' }));
    } finally {
      setGoalResourceLoading((prev) => ({ ...prev, [goalId]: false }));
    }
  };

  const handleToggleResources = async (goalId: string) => {
    const nextExpanded = !expandedGoalResources[goalId];
    setExpandedGoalResources((prev) => ({ ...prev, [goalId]: nextExpanded }));

    if (nextExpanded && !goalResources[goalId] && !goalResourceLoading[goalId]) {
      await fetchGoalResources(goalId);
    }
  };

  const handleUpdateStatus = async (goalId: string, newStatus: Goal['status']) => {
    try {
      setActionError(null);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setActionError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/student/learning-goals/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchGoals();
      } else {
        const errorText = await response.text();
        setActionError(`Failed to update status: ${errorText}`);
        console.error('Failed to update goal status', errorText);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setActionError('Error updating status');
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
      case 'done':
      case 'completed':
        return <CheckCircle2 className="text-green-600" size={20} />;
      case 'inprogress':
        return <Clock className="text-blue-600" size={20} />;
      case 'todo':
      case 'active':
        return <AlertCircle className="text-amber-600" size={20} />;
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

  const normalizeGoalStatus = (status: string): Goal['status'] => {
    if (status === 'active') return 'todo';
    if (status === 'completed') return 'done';
    if (status === 'inprogress') return 'inprogress';
    if (status === 'done') return 'done';
    return 'todo';
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
              <p className="text-sm text-gray-600 mb-1">To Do</p>
              <p className="text-3xl font-bold text-gray-900">{stats.todo}</p>
            </div>
            <AlertCircle className="text-amber-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Done</p>
              <p className="text-3xl font-bold text-gray-900">{stats.done}</p>
            </div>
            <CheckCircle2 className="text-green-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-gray-900">{stats.inprogress}</p>
            </div>
            <Clock className="text-blue-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Goals</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Target className="text-gray-600" size={40} />
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
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="done">Done</option>
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

        <button
          onClick={handleSuggestGoals}
          disabled={isSuggesting}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
        >
          <Sparkles size={20} />
          {isSuggesting ? 'Generating...' : 'AI Suggest Goals'}
        </button>
      </div>

      {actionError && (
        <div className="mb-6 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {actionError}
        </div>
      )}

      {suggestionError && (
        <div className="mb-6 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {suggestionError}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="text-amber-500" size={22} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Goal Suggestions</h2>
              <p className="text-sm text-gray-600">
                Built from your recent coursework, current progress, and saved learning analytics.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {suggestions.map((suggestion, index) => (
              <div key={`${suggestion.title}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">{suggestion.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(suggestion.priority)}`}>
                    {suggestion.priority}
                  </span>
                </div>

                <p className="mb-3 text-sm text-slate-600">{suggestion.description}</p>

                <div className="mb-3 flex flex-wrap gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(suggestion.category)}`}>
                    {suggestion.category}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200">
                    due {new Date(suggestion.targetDate).toLocaleDateString()}
                  </span>
                </div>

                {suggestion.milestones.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Milestones</p>
                    <div className="space-y-1">
                      {suggestion.milestones.map((milestone) => (
                        <div key={milestone.id} className="text-sm text-slate-700">
                          - {milestone.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {suggestion.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {suggestion.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-white text-slate-600 rounded text-xs border border-slate-200">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => applySuggestionToForm(suggestion)}
                  className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  Create Goal
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

              {/* Status */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                </div>
                <select
                  value={normalizeGoalStatus(goal.status)}
                  onChange={(e) => handleUpdateStatus(goal._id, e.target.value as Goal['status'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="todo">To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
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

              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50">
                <button
                  onClick={() => handleToggleResources(goal._id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-slate-700" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Suggested Resources</p>
                      <p className="text-xs text-slate-500">
                        AI-curated search links for YouTube, Google, and LinkedIn.
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-slate-500 transition-transform ${expandedGoalResources[goal._id] ? 'rotate-180' : ''}`}
                  />
                </button>

                {expandedGoalResources[goal._id] && (
                  <div className="border-t border-slate-200 px-4 py-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-600">
                        Open a resource search directly or refresh suggestions for this goal.
                      </p>
                      <button
                        onClick={() => fetchGoalResources(goal._id)}
                        disabled={goalResourceLoading[goal._id]}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        <RefreshCw size={14} className={goalResourceLoading[goal._id] ? 'animate-spin' : ''} />
                        {goalResources[goal._id]?.length ? 'Refresh' : 'Generate'}
                      </button>
                    </div>

                    {goalResourceError[goal._id] && (
                      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {goalResourceError[goal._id]}
                      </div>
                    )}

                    {goalResourceLoading[goal._id] ? (
                      <div className="space-y-3">
                        {[0, 1, 2].map((item) => (
                          <div key={item} className="rounded-lg border border-slate-200 bg-white p-4">
                            <div className="mb-3 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                            <div className="mb-2 h-3 w-full animate-pulse rounded bg-slate-100" />
                            <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
                          </div>
                        ))}
                      </div>
                    ) : goalResources[goal._id]?.length ? (
                      <div className="space-y-3">
                        {goalResources[goal._id].map((resource, index) => (
                          <div key={`${resource.url}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${getProviderBadge(resource.provider)}`}>
                                {getProviderIcon(resource.provider)}
                                {getProviderLabel(resource.provider)}
                              </span>
                              <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getResourceTypeBadge(resource.resourceType)}`}>
                                {resource.resourceType}
                              </span>
                            </div>

                            <h4 className="mb-2 text-sm font-semibold text-slate-900">{resource.title}</h4>
                            <p className="mb-3 text-sm text-slate-600">{resource.reason}</p>

                            <div className="mb-3 flex flex-wrap gap-2">
                              {resource.tags.map((tag) => (
                                <span key={tag} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800"
                            >
                              Open search
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                        No resources generated yet. Use the button above to get suggestions for this goal.
                      </div>
                    )}
                  </div>
                )}
              </div>

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

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.tags.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tags: e.target.value
                          .split(',')
                          .map((tag) => tag.trim().toLowerCase())
                          .filter(Boolean),
                      })
                    }
                    placeholder="study-plan, react, time-management"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate tags with commas.</p>
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

export default function LearningGoalsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LearningGoalsPageContent />
    </Suspense>
  );
}
