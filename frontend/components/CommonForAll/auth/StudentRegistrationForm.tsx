'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeClosed } from 'lucide-react';

export default function StudentRegistrationForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    studentIdNumber: '',
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    nicNumber: '',
    academicYear: '',
    semester: '',
    specialization: '',
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
      const response = await fetch('/api/auth/register/student', {
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
      
      // Show success message before redirecting
      setSuccessMessage('Registration successful! Redirecting to dashboard...');

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/login');
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

      {/* Student ID and Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="studentIdNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Student ID Number *
          </label>
          <input
            id="studentIdNumber"
            name="studentIdNumber"
            type="text"
            value={formData.studentIdNumber}
            onChange={handleChange}
            placeholder="e.g., IT001, ENG123"
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.studentIdNumber ? 'border-red-500' : 'border-gray-300'
              }`}
          />
          {errors.studentIdNumber && (
            <p className="text-xs text-red-600 mt-1">{errors.studentIdNumber}</p>
          )}
        </div>

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
            placeholder="John Doe"
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>
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
          placeholder="it1001@my.example.com"
          disabled={isLoading}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.email ? 'border-red-500' : 'border-gray-300'
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
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.gender ? 'border-red-500' : 'border-gray-300'
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
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
              }`}
          />
          {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth}</p>}
        </div>
      </div>

      {/* academic year and semester */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-2">
            Academic Year *
          </label>
          <select
            id="academicYear"
            name="academicYear"
            value={formData.academicYear}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.academicYear ? 'border-red-500' : 'border-gray-300'
              }`}
          >
            <option value="">Select Year</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
          {errors.academicYear && <p className="text-xs text-red-600 mt-1">{errors.academicYear}</p>}
        </div>

        <div>
          <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
            Semester *
          </label>
          <select
            id="semester"
            name="semester"
            value={formData.semester}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.specialization ? 'border-red-500' : 'border-gray-300'
              }`}
          >
            <option value="">Select Semester</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>
          {errors.semester && <p className="text-xs text-red-600 mt-1">{errors.semester}</p>}
        </div>
      </div>

      {/* Specialization */}
      <div>
        <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-2">
          Specialization *
        </label>
        <select
          id="specialization"
          name="specialization"
          value={formData.specialization}
          onChange={handleChange}
          disabled={isLoading}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.specialization ? 'border-red-500' : 'border-gray-300'
            }`}
        >
          <option value="">Select Specialization</option>
          <option value="IT">Information Technology</option>
          <option value="SE">Software Engineering</option>
          <option value="DS">Data Science</option>
          <option value="CSNE">Computer System Networking & Engineering</option>
          <option value="CS">Cyber Security</option>
          <option value="IM">Interactive Media</option>
        </select>
        {errors.specialization && <p className="text-xs text-red-600 mt-1">{errors.specialization}</p>}
      </div>

      {/* NIC Number */}
      <div>
        <label htmlFor="nicNumber" className="block text-sm font-medium text-gray-700 mb-2">
          NIC Number *
        </label>
        <input
          id="nicNumber"
          name="nicNumber"
          type="text"
          value={formData.nicNumber}
          onChange={handleChange}
          placeholder="e.g., 123456789V"
          disabled={isLoading}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.nicNumber ? 'border-red-500' : 'border-gray-300'
            }`}
        />
        {errors.nicNumber && <p className="text-xs text-red-600 mt-1">{errors.nicNumber}</p>}
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
          Address *
        </label>
        <input
          id="address"
          name="address"
          type="text"
          value={formData.address}
          onChange={handleChange}
          placeholder="123 Main Street, City, Country"
          disabled={isLoading}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.address ? 'border-red-500' : 'border-gray-300'
            }`}
        />
        {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
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
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {showPassword ? (
                <EyeClosed />
              ) : (
                <Eye />
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
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.passwordConfirmation ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {showPassword ? (
                <EyeClosed />
              ) : (
                <Eye />
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
        className="w-full cursor-pointer py-2.5 rounded-lg font-medium transition duration-200 disabled:cursor-not-allowed mt-6"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </button>

      {/* Login Link */}
      <div className="text-center pt-4">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-yellow-600 hover:text-yellow-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}