'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LecturerRegistrationForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    gender: '',
    dateOfBirth: '',
    position: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/projects-and-tasks/auth/register/lecturer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const errorObj: Record<string, string> = {};
          for (const [key, messages] of Object.entries(data.errors)) {
            errorObj[key] = Array.isArray(messages) ? messages[0] : String(messages);
          }
          setErrors(errorObj);
        } else {
          setErrors({ general: data.message || 'Registration failed' });
        }
        setIsLoading(false);
        return;
      }

      // Store token
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('userRole', 'lecture');

      // Show success message before redirecting
      setSuccessMessage('Registration successful! Redirecting to dashboard...');

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/projects-and-tasks/lecture');
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
      setErrors({ general: 'An error occurred. Please try again.' });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error Messages */}
      {errors.general && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Full Name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="Dr. Jane Smith"
          disabled={isLoading}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="lecturer@sliit.lk"
          disabled={isLoading}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
      </div>

      {/* Gender and Date of Birth */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
            Gender *
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
              errors.gender ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && <p className="text-xs text-red-600 mt-1">{errors.gender}</p>}
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
            Date of Birth *
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
              errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth}</p>}
        </div>
      </div>

      {/* Position */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Position *</label>
        <div className="space-y-2">
          {[
            { value: 'lecture', label: 'Lecture' },
            { value: 'instructure', label: 'Instructor' },
            { value: 'lic', label: 'Lecturer in Charge' },
          ].map((option) => (
            <label key={option.value} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="position"
                value={option.value}
                checked={formData.position === option.value}
                onChange={handleChange}
                disabled={isLoading}
                className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
              />
              <span className="ml-3 text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.position && <p className="text-xs text-red-600 mt-2">{errors.position}</p>}
      </div>

      {/* Password and Confirm Password */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password *
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="passwordConfirmation" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password *
          </label>
          <div className="relative">
            <input
              id="passwordConfirmation"
              name="passwordConfirmation"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.passwordConfirmation}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.passwordConfirmation ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {showConfirmPassword ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
          {errors.passwordConfirmation && (
            <p className="text-xs text-red-600 mt-1">{errors.passwordConfirmation}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          background: isLoading
            ? '#d1d5db'
            : 'linear-gradient(135deg, #efa300 0%, #242d66 100%)',
          color: 'white',
        }}
        className="w-full py-2.5 rounded-lg font-medium transition duration-200 disabled:cursor-not-allowed mt-6"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </button>

      {/* Login Link */}
      <div className="text-center pt-4">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/projects-and-tasks/login" className="text-yellow-600 hover:text-yellow-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}