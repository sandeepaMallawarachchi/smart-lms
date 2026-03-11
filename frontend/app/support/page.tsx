'use client';

import { FormEvent, useEffect, useState } from 'react';
import Footer from '@/components/CommonForAll/Layouts/Footer';
import Header from '@/components/CommonForAll/Layouts/Header';
import { Mail, MessageSquareText, Send, UserRound } from 'lucide-react';

const mainNavItems = [
  { label: 'Home', href: '/' },
  {
    label: 'Main Components',
    href: '/code-engine/ide',
    hasDropdown: true,
    dropdownItems: [
      { label: 'Code Engine', href: '/code-engine/ide' },
      { label: 'Submission & Feedback', href: '/submissions' },
      { label: 'Projects & Tasks', href: '/projects-and-tasks' },
      { label: 'Learning Progress & Insights', href: '/learning-analytics' },
    ],
  },
  { label: 'About Us', href: '/about-us' },
  { label: 'Support', href: '/support' },
];

type FormState = {
  name: string;
  studentId: string;
  email: string;
  subject: string;
  message: string;
};

const initialState: FormState = {
  name: '',
  studentId: '',
  email: '',
  subject: '',
  message: '',
};

type AuthUser = {
  name?: string;
  studentIdNumber?: string;
  email?: string;
};

export default function SupportPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const prefillStudentDetails = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userRole = localStorage.getItem('userRole');
        if (!token || userRole !== 'student') return;

        const response = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const payload = await response.json();
        const user = (payload?.data?.user || {}) as AuthUser;

        setForm((prev) => ({
          ...prev,
          name: prev.name || user.name || '',
          studentId: prev.studentId || user.studentIdNumber || '',
          email: prev.email || user.email || '',
        }));
      } catch (error) {
        console.error('Failed to prefill support form:', error);
      }
    };

    void prefillStudentDetails();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to send support request');
      }

      setSuccessMessage('Your support request has been sent. A confirmation email is on its way.');
      setForm(initialState);
    } catch (error) {
      console.error('Support form submission error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send support request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <Header
        logoText="Smart Learning Management System"
        navItems={mainNavItems}
      />

      <section className="bg-linear-to-br from-brand-blue via-brand-blue to-cyan-700 text-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-16 py-20">
          <p className="text-brand-yellow text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            Support
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-4xl leading-tight">
            Reach the Smart LMS team when you need help, clarification, or a follow-up.
          </h1>
          <p className="mt-6 max-w-3xl text-white/80 text-lg leading-relaxed">
            Send your message through the form below. We will deliver it to the admin email and send a confirmation
            copy back to you automatically.
          </p>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-16 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-blue-50 p-8">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-brand-yellow" />
              </div>
              <h2 className="text-2xl font-bold text-brand-blue mb-3">How support works</h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>Tell us who you are, what issue you are facing, and enough detail for us to respond properly.</p>
                <p>Your message is sent to the Smart LMS admin inbox, and a confirmation copy is emailed back to you.</p>
                <p>Use your active email address so the team can follow up directly.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-brand-blue mb-4">What to include</h3>
              <div className="space-y-3 text-gray-600">
                <p>1. Your full name and student ID.</p>
                <p>2. A clear subject line.</p>
                <p>3. The exact issue, request, or follow-up detail.</p>
                <p>4. Your active email address for the confirmation and reply.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-8 md:p-10 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-yellow flex items-center justify-center">
                <MessageSquareText className="h-6 w-6 text-brand-blue" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-yellow">Support Form</p>
                <h2 className="text-2xl font-bold text-brand-blue">Send a message</h2>
              </div>
            </div>

            {successMessage && (
              <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Name</span>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-brand-blue"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Student ID</span>
                  <input
                    value={form.studentId}
                    onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-blue"
                    placeholder="IT12345678"
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-blue"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Subject</span>
                <input
                  value={form.subject}
                  onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-blue"
                  placeholder="Briefly describe the issue"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Message</span>
                <textarea
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  className="min-h-40 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-blue"
                  placeholder="Describe your issue or request in detail"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Support Request'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer
        supportEmail="support@smartlms.lk"
        supportPhone="+94 11 754 4801"
        supportWebsite="https://www.smartlms.lk"
        copyrightOwner="smartlms"
        socialLinks={{
          facebook: 'https://facebook.com/...',
          twitter: 'https://twitter.com/...',
          instagram: 'https://instagram.com/...',
          youtube: 'https://youtube.com/...',
          linkedin: 'https://linkedin.com/...',
        }}
        onFeedbackClick={() => console.log('Feedback clicked')}
      />
    </main>
  );
}
